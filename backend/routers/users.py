# backend/routers/users.py

from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
import secrets
import logging

from database import get_tenant_db
from models.tenant_models import User, Role
from schemas.tenant_schemas import UserCreate, UserUpdate, UserResponse
from utils.auth import hash_password, send_welcome_email, check_permission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])

DEFAULT_TENANT_DB = "arun"


def get_tenant_session():
    yield from get_tenant_db(DEFAULT_TENANT_DB)


# ===========================================================
# CREATE USER
# ===========================================================
@router.post("/", response_model=UserResponse)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_tenant_session),
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
    if payload.role_ids:
        roles = db.query(Role).filter(Role.id.in_(payload.role_ids)).all()
        user.roles = roles

    db.add(user)
    db.commit()
    db.refresh(user)

    # Try sending welcome mail
    try:
        send_welcome_email(payload.email, payload.full_name, temp_password)
    except Exception as e:
        logger.warning(f"Welcome email failed → {e}")

    return user


# ===========================================================
# LIST USERS
# ===========================================================
@router.get("/", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_tenant_session),
    current_user: dict = Depends(check_permission("users.view")),
):
    return db.query(User).order_by(User.full_name).all()


# ===========================================================
# GET USER BY ID
# ===========================================================
@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_tenant_session),
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
    db: Session = Depends(get_tenant_session),
    current_user: dict = Depends(check_permission("users.update")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

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
    return user


# ===========================================================
# DELETE USER
# ===========================================================
@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_tenant_session),
    current_user: dict = Depends(check_permission("users.delete")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}
