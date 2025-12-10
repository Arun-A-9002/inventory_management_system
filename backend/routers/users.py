from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import secrets

from database import get_tenant_db
from models.tenant_models import User, Role
from schemas.tenant_schemas import UserCreate, UserUpdate, UserResponse
from utils.auth import hash_password, send_welcome_email

DEFAULT_TENANT_DB = "arun"

router = APIRouter(prefix="/users", tags=["Users"])


def get_tenant_session():
    yield from get_tenant_db(DEFAULT_TENANT_DB)


# CREATE USER
@router.post("/", response_model=UserResponse)
def create_user(payload: UserCreate, db: Session = Depends(get_tenant_session)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, "Email already registered")

    temp_password = payload.password or secrets.token_urlsafe(8)
    hashed = hash_password(temp_password)

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hashed,
        is_active=payload.is_active if payload.is_active is not None else True,
        is_doctor=payload.is_doctor if payload.is_doctor is not None else False,
        department_id=payload.department_id
    )

    if payload.role_ids:
        roles = db.query(Role).filter(Role.id.in_(payload.role_ids)).all()
        user.roles = roles

    db.add(user)
    db.commit()
    db.refresh(user)

    try:
        send_welcome_email(payload.email, payload.full_name, temp_password)
    except:
        pass

    return user


# LIST USERS
@router.get("/", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_tenant_session)):
    return db.query(User).order_by(User.full_name).all()


# GET USER BY ID
@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_tenant_session)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    return user


# UPDATE USER
@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_tenant_session)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    data = payload.dict(exclude_unset=True)

    if "email" in data:
        if db.query(User).filter(User.email == data["email"], User.id != user_id).first():
            raise HTTPException(400, "Email already used")

    if "password" in data:
        user.hashed_password = hash_password(data["password"])

    for field in ["full_name", "is_active", "is_doctor", "department_id"]:
        if field in data:
            setattr(user, field, data[field])

    if "role_ids" in data:
        roles = db.query(Role).filter(Role.id.in_(data["role_ids"])).all()
        user.roles = roles

    db.commit()
    db.refresh(user)
    return user


# DELETE USER
@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_tenant_session)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    db.delete(user)
    db.commit()
    return {"message": "User deleted"}
