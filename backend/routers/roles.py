# backend/routers/roles.py

from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session

from database import get_tenant_db
from models.tenant_models import Role, Permission
from schemas.tenant_schemas import (
    RoleCreate, RoleUpdate, RoleResponse,
    PermissionCreate, PermissionResponse
)
from utils.auth import check_permission

router = APIRouter(prefix="/roles", tags=["Roles"])

DEFAULT_TENANT_DB = "arun"


def get_tenant_session():
    yield from get_tenant_db(DEFAULT_TENANT_DB)


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

    if payload.permission_ids:
        perms = db.query(Permission).filter(Permission.id.in_(payload.permission_ids)).all()
        role.permissions = perms

    db.add(role)
    db.commit()
    db.refresh(role)
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
    db: Session = Depends(get_tenant_session),
    current_user: dict = Depends(check_permission("roles.update")),
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(404, "Role not found")

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
    return role


# ===========================================================
# DELETE ROLE
# ===========================================================
@router.delete("/{role_id}")
def delete_role(
    role_id: int,
    db: Session = Depends(get_tenant_session),
    current_user: dict = Depends(check_permission("roles.delete")),
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(404, "Role not found")

    db.delete(role)
    db.commit()
    return {"message": "Role deleted successfully"}
