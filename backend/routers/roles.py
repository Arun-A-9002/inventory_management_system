# backend/routers/roles.py

from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List
from sqlalchemy.orm import Session
import json

from database import get_tenant_db
from models.tenant_models import Role, Permission, AuditLog
from schemas.tenant_schemas import (
    RoleCreate, RoleUpdate, RoleResponse,
    PermissionCreate, PermissionResponse
)
from utils.auth import check_permission

router = APIRouter(prefix="/roles", tags=["Roles"])

DEFAULT_TENANT_DB = "arun"


def get_tenant_session():
    yield from get_tenant_db(DEFAULT_TENANT_DB)

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
        module="ROLE_MANAGEMENT",
        description=description
    )
    db.add(audit_log)
    db.commit()


# ===========================================================
# LIST PERMISSIONS
# ===========================================================
@router.get("/permissions", response_model=List[PermissionResponse])
def list_permissions(
    db: Session = Depends(get_tenant_session),
    current_user: dict = Depends(check_permission("roles.view")),
):
    return db.query(Permission).order_by(Permission.group, Permission.label).all()


# ===========================================================
# CREATE PERMISSION
# ===========================================================
@router.post("/permissions", response_model=PermissionResponse)
def create_permission(
    payload: PermissionCreate,
    db: Session = Depends(get_tenant_session),
    current_user: dict = Depends(check_permission("roles.create")),
):
    existing = db.query(Permission).filter(Permission.name == payload.name).first()
    if existing:
        raise HTTPException(400, "Permission already exists")

    perm = Permission(**payload.model_dump())
    db.add(perm)
    db.commit()
    db.refresh(perm)
    return perm


# ===========================================================
# CREATE ROLE
# ===========================================================
@router.post("/", response_model=RoleResponse)
def create_role(
    payload: RoleCreate,
    request: Request,
    db: Session = Depends(get_tenant_session),
    current_user: dict = Depends(check_permission("roles.create")),
):
    if db.query(Role).filter(Role.name == payload.name).first():
        raise HTTPException(400, "Role already exists")

    role = Role(
        name=payload.name,
        description=payload.description,
        is_active=payload.is_active,
    )

    permission_names = []
    if payload.permission_ids:
        perms = db.query(Permission).filter(Permission.id.in_(payload.permission_ids)).all()
        role.permissions = perms
        permission_names = [perm.name for perm in perms]

    db.add(role)
    db.commit()
    db.refresh(role)
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="CREATE",
        table_name="roles",
        record_id=role.id,
        new_values={
            "name": role.name,
            "description": role.description,
            "is_active": role.is_active,
            "permissions": permission_names
        },
        description=f"Created role {role.name}",
        request=request
    )
    
    return role


# ===========================================================
# LIST ROLES
# ===========================================================
@router.get("/", response_model=List[RoleResponse])
def list_roles(
    db: Session = Depends(get_tenant_session),
    current_user: dict = Depends(check_permission("roles.view")),
):
    return db.query(Role).order_by(Role.name).all()


# ===========================================================
# GET ROLE
# ===========================================================
@router.get("/{role_id}", response_model=RoleResponse)
def get_role(
    role_id: int,
    db: Session = Depends(get_tenant_session),
    current_user: dict = Depends(check_permission("roles.view")),
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(404, "Role not found")
    return role


# ===========================================================
# UPDATE ROLE
# ===========================================================
@router.put("/{role_id}", response_model=RoleResponse)
def update_role(
    role_id: int,
    payload: RoleUpdate,
    request: Request,
    db: Session = Depends(get_tenant_session),
    current_user: dict = Depends(check_permission("roles.update")),
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(404, "Role not found")

    # Store old values for audit
    old_values = {
        "name": role.name,
        "description": role.description,
        "is_active": role.is_active,
        "permissions": [perm.name for perm in role.permissions]
    }

    data = payload.model_dump(exclude_unset=True)

    if "name" in data:
        exists = db.query(Role).filter(Role.name == data["name"], Role.id != role_id).first()
        if exists:
            raise HTTPException(400, "Role name already exists")
        role.name = data["name"]

    if "description" in data:
        role.description = data["description"]

    if "is_active" in data:
        role.is_active = data["is_active"]

    if "permission_ids" in data:
        perms = db.query(Permission).filter(Permission.id.in_(data["permission_ids"])).all()
        role.permissions = perms

    db.commit()
    db.refresh(role)
    
    # Store new values for audit
    new_values = {
        "name": role.name,
        "description": role.description,
        "is_active": role.is_active,
        "permissions": [perm.name for perm in role.permissions]
    }
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="UPDATE",
        table_name="roles",
        record_id=role.id,
        old_values=old_values,
        new_values=new_values,
        description=f"Updated role {role.name}",
        request=request
    )
    
    return role


# ===========================================================
# DELETE ROLE
# ===========================================================
@router.delete("/{role_id}")
def delete_role(
    role_id: int,
    request: Request,
    db: Session = Depends(get_tenant_session),
    current_user: dict = Depends(check_permission("roles.delete")),
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(404, "Role not found")

    # Store role details for audit before deletion
    role_details = {
        "name": role.name,
        "description": role.description,
        "is_active": role.is_active,
        "permissions": [perm.name for perm in role.permissions]
    }

    db.delete(role)
    db.commit()
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="DELETE",
        table_name="roles",
        record_id=role_id,
        old_values=role_details,
        description=f"Deleted role {role_details['name']}",
        request=request
    )
    
    return {"message": "Role deleted successfully"}
