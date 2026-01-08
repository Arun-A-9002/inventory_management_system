from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, Form
from fastapi.responses import Response, FileResponse
from sqlalchemy.orm import Session
import os
import uuid
import json
from pathlib import Path
import base64
from typing import Optional

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
# CREATE COMPANY WITH LOGO
# --------------------------
@router.post("/", response_model=CompanyResponse)
async def create_company(
    name: str = Form(...),
    code: str = Form(...),
    gst_number: str = Form(...),
    address: str = Form(...),
    contact_person: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    logo: Optional[UploadFile] = File(None),
    request: Request = None,
    db: Session = Depends(get_tenant_db),
    current_user: dict = Depends(require_company_create())
):
    log_api("CREATE COMPANY")

    try:
        # Check if company already exists
        existing_company = db.query(Company).first()
        if existing_company:
            raise HTTPException(400, "Only one company is allowed per organization")
        
        # Handle logo upload
        logo_path = None
        if logo and logo.filename:
            # Validate file type
            if not logo.content_type.startswith('image/'):
                raise HTTPException(400, "Only image files are allowed")
            
            # Generate unique filename
            file_extension = logo.filename.split('.')[-1]
            unique_filename = f"company_logo_{uuid.uuid4().hex[:8]}.{file_extension}"
            
            # Save to uploads directory
            file_path = UPLOAD_DIR / unique_filename
            print(f"DEBUG: Saving logo to: {file_path}")
            with open(file_path, "wb") as buffer:
                content = await logo.read()
                buffer.write(content)
            print(f"DEBUG: Logo saved successfully, size: {len(content)} bytes")
            
            logo_path = f"uploads/{unique_filename}"
            
        company = Company(
            name=name,
            code=code,
            gst_number=gst_number,
            address=address,
            contact_person=contact_person,
            email=email,
            phone=phone,
            logo_path=logo_path
        )
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
                "logo_path": company.logo_path
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
        raise HTTPException(500, f"Failed to create company: {str(e)}")


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
# UPDATE COMPANY WITH LOGO
# --------------------------
@router.put("/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: int,
    name: Optional[str] = Form(None),
    code: Optional[str] = Form(None),
    gst_number: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    contact_person: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    logo: Optional[UploadFile] = File(None),
    request: Request = None,
    db: Session = Depends(get_tenant_db),
    current_user: dict = Depends(require_company_edit())
):
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
        "logo_path": company.logo_path
    }

    # Update fields if provided
    if name is not None:
        company.name = name
    if code is not None:
        company.code = code
    if gst_number is not None:
        company.gst_number = gst_number
    if address is not None:
        company.address = address
    if contact_person is not None:
        company.contact_person = contact_person
    if email is not None:
        company.email = email
    if phone is not None:
        company.phone = phone
    
    # Handle logo upload
    if logo and logo.filename:
        # Validate file type
        if not logo.content_type.startswith('image/'):
            raise HTTPException(400, "Only image files are allowed")
        
        # Delete old logo file if exists
        if company.logo_path:
            old_file_path = UPLOAD_DIR / company.logo_path.split('/')[-1]
            if old_file_path.exists():
                old_file_path.unlink()
        
        # Generate unique filename
        file_extension = logo.filename.split('.')[-1]
        unique_filename = f"company_logo_{uuid.uuid4().hex[:8]}.{file_extension}"
        
        # Save to uploads directory
        file_path = UPLOAD_DIR / unique_filename
        print(f"DEBUG: Updating logo to: {file_path}")
        with open(file_path, "wb") as buffer:
            content = await logo.read()
            buffer.write(content)
        print(f"DEBUG: Logo updated successfully, size: {len(content)} bytes")
        
        company.logo_path = f"uploads/{unique_filename}"

    db.commit()
    db.refresh(company)
    
    # Store new values for audit
    new_values = {
        "name": company.name,
        "address": company.address,
        "phone": company.phone,
        "email": company.email,
        "logo_path": company.logo_path
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
        "logo_path": company.logo_path
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
# SERVE LOGO FILES
# --------------------------
@router.get("/uploads/{filename}")
def serve_logo_file(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(file_path)


# --------------------------
# GET COMPANY LOGO PATH
# --------------------------
@router.get("/{company_id}/logo")
def get_company_logo_path(company_id: int, db: Session = Depends(get_tenant_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company or not company.logo_path:
        raise HTTPException(404, "Logo not found")
    
    return {"logo_path": company.logo_path}


# --------------------------
# GET FIRST COMPANY LOGO PATH (for reports)
# --------------------------
@router.get("/logo")
def get_first_company_logo_path(db: Session = Depends(get_tenant_db)):
    company = db.query(Company).first()
    if not company or not company.logo_path:
        raise HTTPException(404, "Logo not found")
    
    return {"logo_path": company.logo_path}


# --------------------------
# DEBUG: CHECK COMPANY LOGO STATUS
# --------------------------
@router.get("/logo-status")
def check_logo_status(db: Session = Depends(get_tenant_db)):
    company = db.query(Company).first()
    if not company:
        return {"status": "no_company", "message": "No company found"}
    
    return {
        "status": "found",
        "company_name": company.name,
        "has_logo": company.logo_path is not None,
        "logo_path": company.logo_path
    }
