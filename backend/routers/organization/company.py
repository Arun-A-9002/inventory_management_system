from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_tenant_db
from models.tenant_models import Company
from schemas.tenant_schemas import (
    CompanyCreate, CompanyUpdate, CompanyResponse
)

from utils.logger import log_api, log_error, log_audit

router = APIRouter(prefix="/company", tags=["Company"])


# --------------------------
# CREATE COMPANY
# --------------------------
@router.post("/", response_model=CompanyResponse)
def create_company(data: CompanyCreate, db: Session = Depends(get_tenant_db)):
    log_api("CREATE COMPANY")

    try:
        company = Company(**data.dict())
        db.add(company)
        db.commit()
        db.refresh(company)
        log_audit(f"Company created → {company.name}")
        return company

    except Exception as e:
        log_error(e, "create_company")
        raise HTTPException(500, "Failed to create company")


# --------------------------
# LIST ALL COMPANIES
# --------------------------
@router.get("/", response_model=list[CompanyResponse])
def list_companies(db: Session = Depends(get_tenant_db)):
    return db.query(Company).all()


# --------------------------
# GET SINGLE COMPANY
# --------------------------
@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(company_id: int, db: Session = Depends(get_tenant_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")
    return company


# --------------------------
# UPDATE COMPANY
# --------------------------
@router.put("/{company_id}", response_model=CompanyResponse)
def update_company(company_id: int, data: CompanyUpdate, db: Session = Depends(get_tenant_db)):
    log_api("UPDATE COMPANY")

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")

    for key, value in data.dict(exclude_unset=True).items():
        setattr(company, key, value)

    db.commit()
    db.refresh(company)
    log_audit(f"Company updated → {company.name}")
    return company


# --------------------------
# DELETE COMPANY
# --------------------------
@router.delete("/{company_id}")
def delete_company(company_id: int, db: Session = Depends(get_tenant_db)):
    log_api("DELETE COMPANY")

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")

    db.delete(company)
    db.commit()

    log_audit(f"Company deleted → {company_id}")
    return {"message": "Company deleted"}
