# backend/routers/departments.py

from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session

from database import get_tenant_db
from models.tenant_models import Department
from schemas.tenant_schemas import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse
)
from utils.auth import check_permission

router = APIRouter(prefix="/departments", tags=["Departments"])

DEFAULT_TENANT_DB = "arun"


def get_tenant_session():
    yield from get_tenant_db(DEFAULT_TENANT_DB)


# ===========================================================
# CREATE DEPARTMENT
# ===========================================================
@router.post("/", response_model=DepartmentResponse)
def create_department(
    payload: DepartmentCreate,
    db: Session = Depends(get_tenant_session),
    current_user: dict = Depends(check_permission("departments.create")),
):
    exists = db.query(Department).filter(Department.name == payload.name).first()
    if exists:
        raise HTTPException(400, "Department already exists")

    dept = Department(
        name=payload.name,
        description=payload.description,
        is_active=True,
    )

    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


# ===========================================================
# LIST DEPARTMENTS
# ===========================================================
@router.get("/", response_model=List[DepartmentResponse])
def list_departments(
    db: Session = Depends(get_tenant_session),
    current_user: dict = Depends(check_permission("departments.view")),
):
    return db.query(Department).all()


# ===========================================================
# GET ONE DEPARTMENT
# ===========================================================
@router.get("/{dept_id}", response_model=DepartmentResponse)
def get_department(
    dept_id: int,
    db: Session = Depends(get_tenant_session),
    current_user: dict = Depends(check_permission("departments.view")),
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")
    return dept


# ===========================================================
# UPDATE DEPARTMENT
# ===========================================================
@router.put("/{dept_id}", response_model=DepartmentResponse)
def update_department(
    dept_id: int,
    payload: DepartmentUpdate,
    db: Session = Depends(get_tenant_session),
    current_user: dict = Depends(check_permission("departments.update")),
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")

    updates = payload.model_dump(exclude_unset=True)

    for key, value in updates.items():
        setattr(dept, key, value)

    db.commit()
    db.refresh(dept)
    return dept


# ===========================================================
# DELETE DEPARTMENT
# ===========================================================
@router.delete("/{dept_id}")
def delete_department(
    dept_id: int,
    db: Session = Depends(get_tenant_session),
    current_user: dict = Depends(check_permission("departments.delete")),
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")

    db.delete(dept)
    db.commit()
    return {"message": "Department deleted successfully"}
