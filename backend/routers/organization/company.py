from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import os
import uuid
from pathlib import Path

from database import get_tenant_db
from models.tenant_models import Company
from schemas.tenant_schemas import (
    CompanyCreate, CompanyUpdate, CompanyResponse
)
from utils.permissions import require_company_view, require_company_create, require_company_edit, require_company_delete
from utils.logger import log_api, log_error, log_audit

router = APIRouter(prefix="/company", tags=["Company"])

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


# --------------------------
# CREATE COMPANY
# --------------------------
@router.post("/", response_model=CompanyResponse)
def create_company(data: CompanyCreate, db: Session = Depends(get_tenant_db), current_user: dict = Depends(require_company_create())):
    log_api("CREATE COMPANY")

    try:
        # Check if company already exists
        existing_company = db.query(Company).first()
        if existing_company:
            raise HTTPException(400, "Only one company is allowed per organization")
            
        company = Company(**data.dict())
        db.add(company)
        db.commit()
        db.refresh(company)
        log_audit(f"Company created → {company.name}")
        return company

    except HTTPException:
        raise
    except Exception as e:
        log_error(e, "create_company")
        raise HTTPException(500, "Failed to create company")


# --------------------------
# LIST ALL COMPANIES
# --------------------------
@router.get("/", response_model=list[CompanyResponse])
def list_companies(db: Session = Depends(get_tenant_db), current_user: dict = Depends(require_company_view())):
    return db.query(Company).all()


# --------------------------
# GET SINGLE COMPANY
# --------------------------
@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(company_id: int, db: Session = Depends(get_tenant_db), current_user: dict = Depends(require_company_view())):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")
    return company


# --------------------------
# UPDATE COMPANY
# --------------------------
@router.put("/{company_id}", response_model=CompanyResponse)
def update_company(company_id: int, data: CompanyUpdate, db: Session = Depends(get_tenant_db), current_user: dict = Depends(require_company_edit())):
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
def delete_company(company_id: int, db: Session = Depends(get_tenant_db), current_user: dict = Depends(require_company_delete())):
    log_api("DELETE COMPANY")

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")

    db.delete(company)
    db.commit()

    log_audit(f"Company deleted → {company_id}")
    return {"message": "Company deleted"}


# --------------------------
# UPLOAD LOGO
# --------------------------
@router.post("/upload-logo")
async def upload_logo(file: UploadFile = File(...)):
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(400, "Only image files are allowed")
    
    # Generate unique filename
    file_extension = file.filename.split('.')[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    try:
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        return {"filename": unique_filename, "url": f"/uploads/{unique_filename}"}
    
    except Exception as e:
        raise HTTPException(500, f"Failed to upload file: {str(e)}")
