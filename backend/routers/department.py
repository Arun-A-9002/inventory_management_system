from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_tenant_db

from models.tenant_models import Department
from schemas.tenant_schemas import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse
)
from utils.permissions import (
    require_departments_view,
    require_departments_create,
    require_departments_update,
    require_departments_delete
)

DEFAULT_TENANT_DB = "arun"

router = APIRouter(prefix="/departments", tags=["Departments"])

def get_tenant_session():
    yield from get_tenant_db(DEFAULT_TENANT_DB)


# CREATE
@router.post("/", response_model=DepartmentResponse)
def create_department(data: DepartmentCreate, db: Session = Depends(get_tenant_session), user = Depends(require_departments_create())):
    existing = db.query(Department).filter(Department.name == data.name).first()
    if existing:
        raise HTTPException(400, "Department already exists")

    dept = Department(name=data.name, description=data.description, is_active=True)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


# GET ALL
@router.get("/", response_model=list[DepartmentResponse])
def get_all_departments(db: Session = Depends(get_tenant_session), user = Depends(require_departments_view())):
    return db.query(Department).all()


# GET ONE
@router.get("/{dept_id}", response_model=DepartmentResponse)
def get_department(dept_id: int, db: Session = Depends(get_tenant_session), user = Depends(require_departments_view())):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")
    return dept


# UPDATE
@router.put("/{dept_id}", response_model=DepartmentResponse)
def update_department(dept_id: int, data: DepartmentUpdate, db: Session = Depends(get_tenant_session), user = Depends(require_departments_update())):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")

    update_data = data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(dept, key, value)

    db.commit()
    db.refresh(dept)
    return dept


# DELETE
@router.delete("/{dept_id}")
def delete_department(dept_id: int, db: Session = Depends(get_tenant_session), user = Depends(require_departments_delete())):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")

    db.delete(dept)
    db.commit()
    return {"message": "Department deleted successfully"}
