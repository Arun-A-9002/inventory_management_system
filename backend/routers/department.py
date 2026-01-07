# backend/routers/departments.py

from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List
from sqlalchemy.orm import Session
import json

from database import get_tenant_db
from models.tenant_models import Department, AuditLog
from schemas.tenant_schemas import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse
)
from utils.auth import check_permission
from utils.permissions import require_department_view

router = APIRouter(prefix="/departments", tags=["Departments"])

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
        module="DEPARTMENT_MANAGEMENT",
        description=description
    )
    db.add(audit_log)
    db.commit()


# ===========================================================
# CREATE DEPARTMENT
# ===========================================================
@router.post("/", response_model=DepartmentResponse)
def create_department(
    payload: DepartmentCreate,
    request: Request,
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
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="CREATE",
        table_name="departments",
        record_id=dept.id,
        new_values={
            "name": dept.name,
            "description": dept.description,
            "is_active": dept.is_active
        },
        description=f"Created department {dept.name}",
        request=request
    )
    
    return dept


# ===========================================================
# LIST DEPARTMENTS
# ===========================================================
@router.get("/", response_model=List[DepartmentResponse])
def list_departments(
    db: Session = Depends(get_tenant_session),
    current_user: dict = Depends(require_department_view()),
):
    return db.query(Department).all()


# ===========================================================
# GET ONE DEPARTMENT
# ===========================================================
@router.get("/{dept_id}", response_model=DepartmentResponse)
def get_department(
    dept_id: int,
    db: Session = Depends(get_tenant_session),
    current_user: dict = Depends(require_department_view()),
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
    request: Request,
    db: Session = Depends(get_tenant_session),
    current_user: dict = Depends(check_permission("departments.update")),
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")

    # Store old values for audit
    old_values = {
        "name": dept.name,
        "description": dept.description,
        "is_active": dept.is_active
    }

    updates = payload.model_dump(exclude_unset=True)

    for key, value in updates.items():
        setattr(dept, key, value)

    db.commit()
    db.refresh(dept)
    
    # Store new values for audit
    new_values = {
        "name": dept.name,
        "description": dept.description,
        "is_active": dept.is_active
    }
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="UPDATE",
        table_name="departments",
        record_id=dept.id,
        old_values=old_values,
        new_values=new_values,
        description=f"Updated department {dept.name}",
        request=request
    )
    
    return dept


# ===========================================================
# DELETE DEPARTMENT
# ===========================================================
@router.delete("/{dept_id}")
def delete_department(
    dept_id: int,
    request: Request,
    db: Session = Depends(get_tenant_session),
    current_user: dict = Depends(check_permission("departments.delete")),
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")

    # Store department details for audit before deletion
    dept_details = {
        "name": dept.name,
        "description": dept.description,
        "is_active": dept.is_active
    }

    db.delete(dept)
    db.commit()
    
    # Audit log
    log_audit(
        db=db,
        current_user=current_user,
        action="DELETE",
        table_name="departments",
        record_id=dept_id,
        old_values=dept_details,
        description=f"Deleted department {dept_details['name']}",
        request=request
    )
    
    return {"message": "Department deleted successfully"}
