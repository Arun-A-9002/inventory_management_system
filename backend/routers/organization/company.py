from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
import os
import uuid
import json
from pathlib import Path

from database import get_tenant_db
from models.tenant_models import Company, AuditLog
from schemas.tenant_schemas import (
    CompanyCreate, CompanyUpdate, CompanyResponse
)
from utils.permissions import require_company_view, require_company_create, require_company_edit, require_company_delete
from utils.logger import log_api, log_error, log_audit

router = APIRouter(prefix="/company", tags=["Company"])

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

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
# CREATE COMPANY
# --------------------------
@router.post("/", response_model=CompanyResponse)
def create_company(data: CompanyCreate, request: Request, db: Session = Depends(get_tenant_db), current_user: dict = Depends(require_company_create())):
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
        
        # Audit log
        log_audit_trail(
            db=db,
            current_user=current_user,
            action="CREATE",
            table_name="companies",
            record_id=company.id,
            new_values={
                "name": company.name,
                "address": company.address,
                "phone": company.phone,
                "email": company.email,
                "logo": company.logo
            },
            description=f"Created company {company.name}",
            request=request
        )
        
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
def update_company(company_id: int, data: CompanyUpdate, request: Request, db: Session = Depends(get_tenant_db), current_user: dict = Depends(require_company_edit())):
    log_api("UPDATE COMPANY")

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")

    # Store old values for audit
    old_values = {
        "name": company.name,
        "address": company.address,
        "phone": company.phone,
        "email": company.email,
        "logo": company.logo
    }

    for key, value in data.dict(exclude_unset=True).items():
        setattr(company, key, value)

    db.commit()
    db.refresh(company)
    
    # Store new values for audit
    new_values = {
        "name": company.name,
        "address": company.address,
        "phone": company.phone,
        "email": company.email,
        "logo": company.logo
    }
    
    # Audit log
    log_audit_trail(
        db=db,
        current_user=current_user,
        action="UPDATE",
        table_name="companies",
        record_id=company.id,
        old_values=old_values,
        new_values=new_values,
        description=f"Updated company {company.name}",
        request=request
    )
    
    log_audit(f"Company updated → {company.name}")
    return company


# --------------------------
# DELETE COMPANY
# --------------------------
@router.delete("/{company_id}")
def delete_company(company_id: int, request: Request, db: Session = Depends(get_tenant_db), current_user: dict = Depends(require_company_delete())):
    log_api("DELETE COMPANY")

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")

    # Store company details for audit before deletion
    company_details = {
        "name": company.name,
        "address": company.address,
        "phone": company.phone,
        "email": company.email,
        "logo": company.logo
    }

    db.delete(company)
    db.commit()
    
    # Audit log
    log_audit_trail(
        db=db,
        current_user=current_user,
        action="DELETE",
        table_name="companies",
        record_id=company_id,
        old_values=company_details,
        description=f"Deleted company {company_details['name']}",
        request=request
    )

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
