from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import json
from database import get_tenant_db
from models.tenant_models import (
    Vendor, VendorQualification,
    VendorPerformance, VendorLeadTime, AuditLog
)
from schemas.tenant_schemas import *
from utils.permissions import require_vendors_view, require_vendors_create, require_vendors_edit, require_vendors_delete, require_vendors_status
from utils.logger import log_api, log_error, log_audit
import uuid

router = APIRouter(
    prefix="/vendors",
    tags=["Vendor Management"]
)

DEFAULT_TENANT_DB = "arun"

def get_tenant_session():
    yield from get_tenant_db(DEFAULT_TENANT_DB)

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
        module="VENDOR_MASTER",
        description=description
    )
    db.add(audit_log)
    db.commit()

# ---------------- GET ALL VENDORS ----------------
@router.get("/")
def get_vendors(db: Session = Depends(get_tenant_session), current_user: dict = Depends(require_vendors_view())):
    vendors = db.query(Vendor).all()
    return vendors

# ---------------- GET ACTIVE VENDORS ONLY ----------------
@router.get("/active")
def get_active_vendors(db: Session = Depends(get_tenant_session), current_user: dict = Depends(require_vendors_view())):
    vendors = db.query(Vendor).filter(Vendor.verification_status == "active").all()
    return vendors

# ---------------- GET VENDOR BY NAME ----------------
@router.get("/by-name/{vendor_name}")
def get_vendor_by_name(vendor_name: str, db: Session = Depends(get_tenant_session), current_user: dict = Depends(require_vendors_view())):
    vendor = db.query(Vendor).filter(Vendor.vendor_name == vendor_name).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor

# ---------------- STEP 1: REGISTER VENDOR ----------------
@router.post("/", response_model=VendorResponse)
def create_vendor(data: VendorCreate, request: Request, db: Session = Depends(get_tenant_session), current_user: dict = Depends(require_vendors_create())):
    log_api("CREATE VENDOR")
    
    try:
        vendor_code = f"VND-{uuid.uuid4().hex[:6].upper()}"

        vendor = Vendor(
            **data.dict(),
            vendor_code=vendor_code,
            verification_status="active",
            status="inactive"
        )

        db.add(vendor)
        db.commit()
        db.refresh(vendor)
        
        log_audit_trail(
            db=db,
            current_user=current_user,
            action="CREATE",
            table_name="vendors",
            record_id=vendor.id,
            new_values={
                "vendor_name": vendor.vendor_name,
                "vendor_code": vendor.vendor_code,
                "phone": vendor.phone,
                "email": vendor.email,
                "status": vendor.status
            },
            description=f"Created vendor {vendor.vendor_name} ({vendor.vendor_code})",
            request=request
        )
        
        log_audit(f"Vendor created → {vendor.vendor_name}")
        return vendor
        
    except Exception as e:
        log_error(e, "create_vendor")
        raise HTTPException(500, "Failed to create vendor")

# ---------------- STEP 2: QUALIFICATION ----------------
@router.get("/qualification")
def get_qualifications(db: Session = Depends(get_tenant_session)):
    qualifications = db.query(VendorQualification).all()
    return qualifications

@router.post("/qualification")
def qualify_vendor(data: VendorQualificationCreate, db: Session = Depends(get_tenant_session)):
    qualification = VendorQualification(**data.dict())
    db.add(qualification)
    db.commit()
    return {"message": "Vendor qualification saved"}

@router.put("/qualification/{qualification_id}")
def update_qualification(qualification_id: int, data: VendorQualificationCreate, db: Session = Depends(get_tenant_session)):
    qualification = db.query(VendorQualification).filter(VendorQualification.id == qualification_id).first()
    if not qualification:
        raise HTTPException(status_code=404, detail="Qualification not found")
    
    for key, value in data.dict().items():
        setattr(qualification, key, value)
    
    db.commit()
    return {"message": "Qualification updated"}

@router.delete("/qualification/{qualification_id}")
def delete_qualification(qualification_id: int, db: Session = Depends(get_tenant_session)):
    qualification = db.query(VendorQualification).filter(VendorQualification.id == qualification_id).first()
    if not qualification:
        raise HTTPException(status_code=404, detail="Qualification not found")
    
    db.delete(qualification)
    db.commit()
    return {"message": "Qualification deleted"}



# ---------------- STEP 4: PERFORMANCE ----------------
@router.get("/performance")
def get_performances(db: Session = Depends(get_tenant_session)):
    performances = db.query(VendorPerformance).all()
    return performances

@router.post("/performance")
def save_performance(data: VendorPerformanceCreate, db: Session = Depends(get_tenant_session)):
    performance = VendorPerformance(**data.dict())
    db.add(performance)
    db.commit()
    return {"message": "Vendor performance saved"}

@router.put("/performance/{performance_id}")
def update_performance(performance_id: int, data: VendorPerformanceCreate, db: Session = Depends(get_tenant_session)):
    performance = db.query(VendorPerformance).filter(VendorPerformance.id == performance_id).first()
    if not performance:
        raise HTTPException(status_code=404, detail="Performance not found")
    
    for key, value in data.dict().items():
        setattr(performance, key, value)
    
    db.commit()
    return {"message": "Performance updated"}

@router.delete("/performance/{performance_id}")
def delete_performance(performance_id: int, db: Session = Depends(get_tenant_session)):
    performance = db.query(VendorPerformance).filter(VendorPerformance.id == performance_id).first()
    if not performance:
        raise HTTPException(status_code=404, detail="Performance not found")
    
    db.delete(performance)
    db.commit()
    return {"message": "Performance deleted"}

@router.post("/lead-time")
def save_lead_time(data: VendorLeadTimeCreate, db: Session = Depends(get_tenant_session)):
    lead_time = VendorLeadTime(**data.dict())
    db.add(lead_time)
    db.commit()
    return {"message": "Vendor lead time saved"}

# ---------------- MIGRATE VENDOR STATUS ----------------
@router.post("/migrate-status")
def migrate_vendor_status(db: Session = Depends(get_tenant_session)):
    # Update old enum values to new ones
    vendors = db.query(Vendor).all()
    updated_count = 0
    
    for vendor in vendors:
        if vendor.verification_status == "verified":
            vendor.verification_status = "active"
            updated_count += 1
        elif vendor.verification_status == "rejected":
            vendor.verification_status = "inactive"
            updated_count += 1
        elif vendor.verification_status == "pending":
            vendor.verification_status = "active"
            updated_count += 1
    
    db.commit()
    return {"message": f"Migrated {updated_count} vendor status records"}

# ---------------- UPDATE VENDOR STATUS ----------------
@router.patch("/{vendor_id}/status")
def update_vendor_status(vendor_id: int, status: str, request: Request, db: Session = Depends(get_tenant_session), current_user: dict = Depends(require_vendors_status())):
    log_api("UPDATE VENDOR STATUS")
    
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    if status not in ["active", "inactive"]:
        raise HTTPException(status_code=400, detail="Invalid status. Only 'active' or 'inactive' allowed")
    
    old_status = vendor.status
    vendor.status = status
    db.commit()
    db.refresh(vendor)
    
    log_audit_trail(
        db=db,
        current_user=current_user,
        action="UPDATE",
        table_name="vendors",
        record_id=vendor.id,
        old_values={"status": old_status},
        new_values={"status": vendor.status},
        description=f"Updated vendor {vendor.vendor_name} status from {old_status} to {status}",
        request=request
    )
    
    log_audit(f"Vendor status updated → {vendor.vendor_name}: {status}")
    return {"message": "Vendor status updated successfully", "status": vendor.status}

# ---------------- TOGGLE VENDOR STATUS ----------------
@router.patch("/{vendor_id}/toggle-status")
def toggle_vendor_status(vendor_id: int, db: Session = Depends(get_tenant_session), current_user: dict = Depends(require_vendors_status())):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Toggle status
    new_status = "active" if vendor.status == "inactive" else "inactive"
    vendor.status = new_status
    db.commit()
    db.refresh(vendor)
    return {"message": f"Vendor status changed to {new_status}", "status": vendor.status}

# ---------------- UPDATE VENDOR ----------------
@router.put("/{vendor_id}")
def update_vendor(vendor_id: int, data: VendorCreate, request: Request, db: Session = Depends(get_tenant_session), current_user: dict = Depends(require_vendors_edit())):
    log_api("UPDATE VENDOR")
    
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    old_values = {
        "vendor_name": vendor.vendor_name,
        "phone": vendor.phone,
        "email": vendor.email,
        "status": vendor.status
    }
    
    for key, value in data.dict().items():
        setattr(vendor, key, value)
    
    db.commit()
    db.refresh(vendor)
    
    new_values = {
        "vendor_name": vendor.vendor_name,
        "phone": vendor.phone,
        "email": vendor.email,
        "status": vendor.status
    }
    
    log_audit_trail(
        db=db,
        current_user=current_user,
        action="UPDATE",
        table_name="vendors",
        record_id=vendor.id,
        old_values=old_values,
        new_values=new_values,
        description=f"Updated vendor {vendor.vendor_name}",
        request=request
    )
    
    log_audit(f"Vendor updated → {vendor.vendor_name}")
    return vendor

# ---------------- DELETE VENDOR ----------------
@router.delete("/{vendor_id}")
def delete_vendor(vendor_id: int, request: Request, db: Session = Depends(get_tenant_session), current_user: dict = Depends(require_vendors_delete())):
    log_api("DELETE VENDOR")
    
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    vendor_details = {
        "vendor_name": vendor.vendor_name,
        "vendor_code": vendor.vendor_code,
        "phone": vendor.phone,
        "email": vendor.email,
        "status": vendor.status
    }
    
    db.delete(vendor)
    db.commit()
    
    log_audit_trail(
        db=db,
        current_user=current_user,
        action="DELETE",
        table_name="vendors",
        record_id=vendor_id,
        old_values=vendor_details,
        description=f"Deleted vendor {vendor_details['vendor_name']}",
        request=request
    )
    
    log_audit(f"Vendor deleted → {vendor_id}")
    return {"message": "Vendor deleted successfully"}

# ---------------- GET VENDOR BANK DETAILS ----------------
@router.get("/{vendor_id}/bank-details")
def get_vendor_bank_details(vendor_id: int, db: Session = Depends(get_tenant_session)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    return {
        "vendor_id": vendor.id,
        "vendor_name": vendor.vendor_name,
        "ifsc_code": vendor.ifsc_code,
        "account_number": vendor.account_number,
        "account_holder_name": vendor.account_holder_name,
        "branch_name": vendor.branch_name
    }

# ---------------- UPDATE VENDOR BANK DETAILS ----------------
@router.put("/{vendor_id}/bank-details")
def update_vendor_bank_details(vendor_id: int, bank_details: dict, db: Session = Depends(get_tenant_session)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Update bank details
    vendor.ifsc_code = bank_details.get("ifsc_code")
    vendor.account_number = bank_details.get("account_number")
    vendor.account_holder_name = bank_details.get("account_holder_name")
    vendor.branch_name = bank_details.get("branch_name")
    
    db.commit()
    db.refresh(vendor)
    
    return {
        "message": "Bank details updated successfully",
        "vendor_id": vendor.id,
        "ifsc_code": vendor.ifsc_code,
        "account_number": vendor.account_number,
        "account_holder_name": vendor.account_holder_name,
        "branch_name": vendor.branch_name
    }
