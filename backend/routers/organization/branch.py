from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import json

from database import get_current_tenant_db_name, get_tenant_db

def get_db(tenant_db_name: str = Depends(get_current_tenant_db_name())):
    yield from get_tenant_db(tenant_db_name)

from models.tenant_models import Branch, Company, AuditLog
from schemas.tenant_schemas import (
    BranchCreate, BranchUpdate, BranchResponse
)
from utils.permissions import require_branch_view, require_branch_create, require_branch_edit, require_branch_delete
from utils.logger import log_api, log_error, log_audit

router = APIRouter(prefix="/branch", tags=["Branch"])

# Helper function for audit logging
def log_audit_trail(db: Session, current_user: dict, action: str, table_name: str, record_id: int = None, old_values: dict = None, new_values: dict = None, description: str = None, request: Request = None):
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
        module="ORGANIZATION",
        description=description
    )
    db.add(audit_log)
    db.commit()


# --------------------------
# CREATE BRANCH
# --------------------------
@router.post("/", response_model=BranchResponse)
def create_branch(data: BranchCreate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_branch_create())):
    log_api("CREATE BRANCH")

    try:
        # Ensure company exists
        company = db.query(Company).filter(Company.id == data.company_id).first()
        if not company:
            raise HTTPException(404, "Company not found")

        branch = Branch(**data.dict())
        db.add(branch)
        db.commit()
        db.refresh(branch)
        
        # Audit log
        log_audit_trail(
            db=db,
            current_user=current_user,
            action="CREATE",
            table_name="branches",
            record_id=branch.id,
            new_values={
                "name": branch.name,
                "address": branch.address,
                "city": branch.city,
                "state": branch.state,
                "country": branch.country,
                "company_id": branch.company_id
            },
            description=f"Created branch {branch.name}",
            request=request
        )

        log_audit(f"Branch created → {branch.name}")
        return branch

    except Exception as e:
        log_error(e, "create_branch")
        raise HTTPException(500, "Failed to create branch")


# --------------------------
# LIST ALL BRANCHES
# --------------------------
@router.get("/", response_model=list[BranchResponse])
def list_branches(db: Session = Depends(get_db), current_user: dict = Depends(require_branch_view())):
    return db.query(Branch).all()


# --------------------------
# GET A BRANCH
# --------------------------
@router.get("/{branch_id}", response_model=BranchResponse)
def get_branch(branch_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_branch_view())):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(404, "Branch not found")
    return branch


# --------------------------
# UPDATE BRANCH
# --------------------------
@router.put("/{branch_id}", response_model=BranchResponse)
def update_branch(branch_id: int, data: BranchUpdate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_branch_edit())):
    log_api("UPDATE BRANCH")

    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(404, "Branch not found")

    # Store old values for audit
    old_values = {
        "name": branch.name,
        "address": branch.address,
        "city": branch.city,
        "state": branch.state,
        "country": branch.country,
        "company_id": branch.company_id
    }

    for key, value in data.dict(exclude_unset=True).items():
        setattr(branch, key, value)

    db.commit()
    db.refresh(branch)
    
    # Store new values for audit
    new_values = {
        "name": branch.name,
        "address": branch.address,
        "city": branch.city,
        "state": branch.state,
        "country": branch.country,
        "company_id": branch.company_id
    }
    
    # Audit log
    log_audit_trail(
        db=db,
        current_user=current_user,
        action="UPDATE",
        table_name="branches",
        record_id=branch.id,
        old_values=old_values,
        new_values=new_values,
        description=f"Updated branch {branch.name}",
        request=request
    )

    log_audit(f"Branch updated → {branch.name}")
    return branch


# --------------------------
# DELETE BRANCH
# --------------------------
@router.delete("/{branch_id}")
def delete_branch(branch_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_branch_delete())):
    log_api("DELETE BRANCH")

    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(404, "Branch not found")

    # Store branch details for audit before deletion
    branch_details = {
        "name": branch.name,
        "address": branch.address,
        "city": branch.city,
        "state": branch.state,
        "country": branch.country,
        "company_id": branch.company_id
    }

    db.delete(branch)
    db.commit()
    
    # Audit log
    log_audit_trail(
        db=db,
        current_user=current_user,
        action="DELETE",
        table_name="branches",
        record_id=branch_id,
        old_values=branch_details,
        description=f"Deleted branch {branch_details['name']}",
        request=request
    )

    log_audit(f"Branch deleted → {branch_id}")
    return {"message": "Branch deleted"}
