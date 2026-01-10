# backend/routers/users.py

from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List
from sqlalchemy.orm import Session
import secrets
import logging
import json

from database import get_current_tenant_db_name, get_tenant_db
from models.tenant_models import User, Role, AuditLog
from schemas.tenant_schemas import UserCreate, UserUpdate, UserResponse
from utils.auth import hash_password, send_welcome_email, check_permission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])




def get_db(tenant_db_name: str = Depends(get_current_tenant_db_name())):
    yield from get_tenant_db(tenant_db_name)

# Helper function for audit logging
def log_audit(db: Session, current_user: dict, action: str, table_name: str, record_id: int = None, old_values: dict = None, new_values: dict = None, description: str = None, request: Request = None):
    user_id = None
    user_name = 'System'
    
    if current_user:
        user_id = current_user.get('id') or current_user.get('sub')
        user_name = current_user.get('full_name') or current_user.get('email') or current_user.get('name', 'System')
        
        if user_id and isinstance(user_id, str):
            try:
                user_id = int(user_id)
            except ValueError:
                user_id = None
    
    # Extract IP and User Agent from request
    ip_address = None
    user_agent = None
    if request:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get('user-agent')
    
    audit_log = AuditLog(
        user_id=user_id,
        user_name=user_name,
        action=action,
        table_name=table_name,
        record_id=record_id,
        old_values=json.dumps(old_values) if old_values else None,
        new_values=json.dumps(new_values) if new_values else None,
        ip_address=ip_address,
        user_agent=user_agent,
        module="USER_MANAGEMENT",
        description=description
    )
    db.add(audit_log)
    db.commit()


# ===========================================================
# CREATE USER
# ===========================================================
@router.post("/", response_model=UserResponse)
def create_user(
    payload: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(check_permission("users.create")),
):
    # Check duplicate email
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, "Email already registered")

    # Generate password
    temp_password = payload.password or secrets.token_urlsafe(8)
    hashed_pw = hash_password(temp_password)

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hashed_pw,
        is_active=payload.is_active if payload.is_active is not None else True,
        is_doctor=payload.is_doctor if payload.is_doctor is not None else False,
        department_id=payload.department_id,
    )

    # Assign roles
    role_names = []
    if payload.role_ids:
        roles = db.query(Role).filter(Role.id.in_(payload.role_ids)).all()
        user.roles = roles
        role_names = [role.name for role in roles]

    db.add(user)
    db.commit()
    db.refresh(user)

    # Try sending welcome mail
    try:
        send_welcome_email(payload.email, payload.full_name, temp_password)
    except Exception as e:
        logger.warning(f"Welcome email failed → {e}")

    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="CREATE",
        table_name="users",
        record_id=user.id,
        new_values={
            "full_name": user.full_name,
            "email": user.email,
            "is_active": user.is_active,
            "is_doctor": user.is_doctor,
            "department_id": user.department_id,
            "roles": role_names
        },
        description=f"Created user {user.full_name} ({user.email})",
        request=request
    )

    return user


# ===========================================================
# LIST USERS
# ===========================================================
@router.get("/", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: dict = Depends(check_permission("users.view")),
):
    return db.query(User).order_by(User.full_name).all()


# ===========================================================
# GET USER BY ID
# ===========================================================
@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(check_permission("users.view")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    return user


# ===========================================================
# UPDATE USER
# ===========================================================
@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(check_permission("users.update")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    # Store old values for audit
    old_values = {
        "full_name": user.full_name,
        "email": user.email,
        "is_active": user.is_active,
        "is_doctor": user.is_doctor,
        "department_id": user.department_id,
        "roles": [role.name for role in user.roles]
    }

    updates = payload.model_dump(exclude_unset=True)

    # Email check
    if "email" in updates:
        exists = db.query(User).filter(User.email == updates["email"], User.id != user_id).first()
        if exists:
            raise HTTPException(400, "Email already used")

    # Password update
    if "password" in updates:
        user.hashed_password = hash_password(updates["password"])

    # Normal fields
    for field in ["full_name", "is_active", "is_doctor", "department_id"]:
        if field in updates:
            setattr(user, field, updates[field])

    # Role update
    if "role_ids" in updates:
        roles = db.query(Role).filter(Role.id.in_(updates["role_ids"])).all()
        user.roles = roles

    db.commit()
    db.refresh(user)
    
    # Store new values for audit
    new_values = {
        "full_name": user.full_name,
        "email": user.email,
        "is_active": user.is_active,
        "is_doctor": user.is_doctor,
        "department_id": user.department_id,
        "roles": [role.name for role in user.roles]
    }
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="UPDATE",
        table_name="users",
        record_id=user.id,
        old_values=old_values,
        new_values=new_values,
        description=f"Updated user {user.full_name} ({user.email})",
        request=request
    )
    
    return user


# ===========================================================
# DELETE USER
# ===========================================================
@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(check_permission("users.delete")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    # Store user details for audit before deletion
    user_details = {
        "full_name": user.full_name,
        "email": user.email,
        "is_active": user.is_active,
        "is_doctor": user.is_doctor,
        "department_id": user.department_id,
        "roles": [role.name for role in user.roles]
    }

    db.delete(user)
    db.commit()
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="DELETE",
        table_name="users",
        record_id=user_id,
        old_values=user_details,
        description=f"Deleted user {user_details['full_name']} ({user_details['email']})",
        request=request
    )
    
    return {"message": "User deleted successfully"}
