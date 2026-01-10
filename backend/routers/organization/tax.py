from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import json

from database import get_current_tenant_db_name, get_tenant_db
from models.tenant_models import TaxCode, AuditLog
from schemas.tenant_schemas import (
    TaxCodeCreate, TaxCodeUpdate, TaxCodeResponse
)
from utils.logger import log_api, log_error, log_audit

router = APIRouter(prefix="/tax", tags=["Tax / GST / HSN"])

def get_db(tenant_db_name: str = Depends(get_current_tenant_db_name())):
    yield from get_tenant_db(tenant_db_name)

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
        module="MASTER_DATA",
        description=description
    )
    db.add(audit_log)
    db.commit()


# --------------------------
# CREATE TAX CODE
# --------------------------
@router.post("/", response_model=TaxCodeResponse)
def create_tax_code(data: TaxCodeCreate, request: Request, db: Session = Depends(get_db), current_user: dict = None):
    log_api("CREATE TAX CODE")

    try:
        exists = db.query(TaxCode).filter(TaxCode.hsn_code == data.hsn_code).first()
        if exists:
            raise HTTPException(400, "HSN code already exists")

        tax = TaxCode(**data.dict())
        db.add(tax)
        db.commit()
        db.refresh(tax)
        
        log_audit_trail(
            db=db,
            current_user=current_user,
            action="CREATE",
            table_name="tax_codes",
            record_id=tax.id,
            new_values={"hsn_code": tax.hsn_code, "gst_percentage": tax.gst_percentage},
            description=f"Created tax code HSN {tax.hsn_code}",
            request=request
        )

        log_audit(f"Tax code created → HSN {tax.hsn_code}")
        return tax

    except Exception as e:
        log_error(e, "create_tax_code")
        raise HTTPException(500, "Failed to create tax code")


# --------------------------
# LIST TAX CODES
# --------------------------
@router.get("/", response_model=list[TaxCodeResponse])
def list_tax_codes(db: Session = Depends(get_db)):
    return db.query(TaxCode).all()


# --------------------------
# GET ONE TAX CODE
# --------------------------
@router.get("/{tax_id}", response_model=TaxCodeResponse)
def get_tax_code(tax_id: int, db: Session = Depends(get_db)):
    tax = db.query(TaxCode).filter(TaxCode.id == tax_id).first()
    if not tax:
        raise HTTPException(404, "Tax code not found")
    return tax


# --------------------------
# UPDATE TAX CODE
# --------------------------
@router.put("/{tax_id}", response_model=TaxCodeResponse)
def update_tax_code(tax_id: int, data: TaxCodeUpdate, request: Request, db: Session = Depends(get_db), current_user: dict = None):
    log_api("UPDATE TAX CODE")

    tax = db.query(TaxCode).filter(TaxCode.id == tax_id).first()
    if not tax:
        raise HTTPException(404, "Tax code not found")

    old_values = {"hsn_code": tax.hsn_code, "gst_percentage": tax.gst_percentage}
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(tax, key, value)

    db.commit()
    db.refresh(tax)
    
    new_values = {"hsn_code": tax.hsn_code, "gst_percentage": tax.gst_percentage}
    
    log_audit_trail(
        db=db,
        current_user=current_user,
        action="UPDATE",
        table_name="tax_codes",
        record_id=tax.id,
        old_values=old_values,
        new_values=new_values,
        description=f"Updated tax code HSN {tax.hsn_code}",
        request=request
    )

    log_audit(f"Tax code updated → ID {tax_id}")
    return tax


# --------------------------
# DELETE TAX CODE
# --------------------------
@router.delete("/{tax_id}")
def delete_tax_code(tax_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = None):
    log_api("DELETE TAX CODE")

    tax = db.query(TaxCode).filter(TaxCode.id == tax_id).first()
    if not tax:
        raise HTTPException(404, "Tax code not found")

    tax_details = {"hsn_code": tax.hsn_code, "gst_percentage": tax.gst_percentage}
    
    db.delete(tax)
    db.commit()
    
    log_audit_trail(
        db=db,
        current_user=current_user,
        action="DELETE",
        table_name="tax_codes",
        record_id=tax_id,
        old_values=tax_details,
        description=f"Deleted tax code HSN {tax_details['hsn_code']}",
        request=request
    )

    log_audit(f"Tax code deleted → ID {tax_id}")
    return {"message": "Tax code deleted"}
