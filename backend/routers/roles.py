from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_tenant_db
from models.tenant_models import Role, Permission
from schemas.tenant_schemas import (
    RoleCreate, RoleUpdate, RoleResponse,
    PermissionResponse, PermissionCreate
)
from utils.permissions import (
    require_roles_view,
    require_roles_create,
    require_roles_update,
    require_roles_delete
)

DEFAULT_TENANT_DB = "arun"

router = APIRouter(prefix="/roles", tags=["Roles"])


def get_tenant_session():
    yield from get_tenant_db(DEFAULT_TENANT_DB)


# LIST PERMISSIONS
@router.get("/permissions", response_model=List[PermissionResponse])
def list_permissions(db: Session = Depends(get_tenant_session), user = Depends(require_roles_view())):
    return db.query(Permission).order_by(Permission.group, Permission.label).all()


# CREATE PERMISSION
@router.post("/permissions", response_model=PermissionResponse)
def create_permission(data: PermissionCreate, db: Session = Depends(get_tenant_session), user = Depends(require_roles_create())):
    existing = db.query(Permission).filter(Permission.name == data.name).first()
    if existing:
        raise HTTPException(400, "Permission already exists")

    perm = Permission(**data.dict())
    db.add(perm)
    db.commit()
    db.refresh(perm)
    return perm


# CREATE ROLE
@router.post("/", response_model=RoleResponse)
def create_role(payload: RoleCreate, db: Session = Depends(get_tenant_session), user = Depends(require_roles_create())):
    if db.query(Role).filter(Role.name == payload.name).first():
        raise HTTPException(400, "Role already exists")

    role = Role(
        name=payload.name,
        description=payload.description,
        is_active=payload.is_active
    )

    if payload.permission_ids:
        perms = db.query(Permission).filter(Permission.id.in_(payload.permission_ids)).all()
        role.permissions = perms

    db.add(role)
    db.commit()
    db.refresh(role)
    return role


# LIST ROLES
@router.get("/", response_model=List[RoleResponse])
def list_roles(db: Session = Depends(get_tenant_session), user = Depends(require_roles_view())):
    return db.query(Role).order_by(Role.name).all()


# GET ONE ROLE
@router.get("/{role_id}", response_model=RoleResponse)
def get_role(role_id: int, db: Session = Depends(get_tenant_session), user = Depends(require_roles_view())):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(404, "Role not found")
    return role


# UPDATE ROLE
@router.put("/{role_id}", response_model=RoleResponse)
def update_role(role_id: int, payload: RoleUpdate, db: Session = Depends(get_tenant_session), user = Depends(require_roles_update())):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(404, "Role not found")

    data = payload.dict(exclude_unset=True)

    if "name" in data:
        if db.query(Role).filter(Role.name == data["name"], Role.id != role_id).first():
            raise HTTPException(400, "Role name already taken")
        role.name = data["name"]

    if "description" in data:
        role.description = data["description"]

    if "is_active" in data:
        role.is_active = data["is_active"]

    if payload.permission_ids is not None:
        perms = db.query(Permission).filter(Permission.id.in_(payload.permission_ids)).all()
        role.permissions = perms

    db.commit()
    db.refresh(role)
    return role


# DELETE ROLE
@router.delete("/{role_id}")
def delete_role(role_id: int, db: Session = Depends(get_tenant_session), user = Depends(require_roles_delete())):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(404, "Role not found")

    db.delete(role)
    db.commit()
    return {"message": "Role deleted"}
