from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_tenant_db

from models.tenant_models import Branch, Company
from schemas.tenant_schemas import (
    BranchCreate, BranchUpdate, BranchResponse
)

from utils.logger import log_api, log_error, log_audit

router = APIRouter(prefix="/branch", tags=["Branch"])


# --------------------------
# CREATE BRANCH
# --------------------------
@router.post("/", response_model=BranchResponse)
def create_branch(data: BranchCreate, db: Session = Depends(get_tenant_db)):
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

        log_audit(f"Branch created → {branch.name}")
        return branch

    except Exception as e:
        log_error(e, "create_branch")
        raise HTTPException(500, "Failed to create branch")


# --------------------------
# LIST ALL BRANCHES
# --------------------------
@router.get("/", response_model=list[BranchResponse])
def list_branches(db: Session = Depends(get_tenant_db)):
    return db.query(Branch).all()


# --------------------------
# GET A BRANCH
# --------------------------
@router.get("/{branch_id}", response_model=BranchResponse)
def get_branch(branch_id: int, db: Session = Depends(get_tenant_db)):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(404, "Branch not found")
    return branch


# --------------------------
# UPDATE BRANCH
# --------------------------
@router.put("/{branch_id}", response_model=BranchResponse)
def update_branch(branch_id: int, data: BranchUpdate, db: Session = Depends(get_tenant_db)):
    log_api("UPDATE BRANCH")

    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(404, "Branch not found")

    for key, value in data.dict(exclude_unset=True).items():
        setattr(branch, key, value)

    db.commit()
    db.refresh(branch)

    log_audit(f"Branch updated → {branch.name}")
    return branch


# --------------------------
# DELETE BRANCH
# --------------------------
@router.delete("/{branch_id}")
def delete_branch(branch_id: int, db: Session = Depends(get_tenant_db)):
    log_api("DELETE BRANCH")

    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(404, "Branch not found")

    db.delete(branch)
    db.commit()

    log_audit(f"Branch deleted → {branch_id}")
    return {"message": "Branch deleted"}
