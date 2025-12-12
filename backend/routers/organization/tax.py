from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_tenant_db
from models.tenant_models import TaxCode
from schemas.tenant_schemas import (
    TaxCodeCreate, TaxCodeUpdate, TaxCodeResponse
)

from utils.logger import log_api, log_error, log_audit

router = APIRouter(prefix="/tax", tags=["Tax / GST / HSN"])


# --------------------------
# CREATE TAX CODE
# --------------------------
@router.post("/", response_model=TaxCodeResponse)
def create_tax_code(data: TaxCodeCreate, db: Session = Depends(get_tenant_db)):
    log_api("CREATE TAX CODE")

    try:
        # Optional: Prevent duplicate HSN
        exists = db.query(TaxCode).filter(TaxCode.hsn_code == data.hsn_code).first()
        if exists:
            raise HTTPException(400, "HSN code already exists")

        tax = TaxCode(**data.dict())
        db.add(tax)
        db.commit()
        db.refresh(tax)

        log_audit(f"Tax code created → HSN {tax.hsn_code}")
        return tax

    except Exception as e:
        log_error(e, "create_tax_code")
        raise HTTPException(500, "Failed to create tax code")


# --------------------------
# LIST TAX CODES
# --------------------------
@router.get("/", response_model=list[TaxCodeResponse])
def list_tax_codes(db: Session = Depends(get_tenant_db)):
    return db.query(TaxCode).all()


# --------------------------
# GET ONE TAX CODE
# --------------------------
@router.get("/{tax_id}", response_model=TaxCodeResponse)
def get_tax_code(tax_id: int, db: Session = Depends(get_tenant_db)):
    tax = db.query(TaxCode).filter(TaxCode.id == tax_id).first()
    if not tax:
        raise HTTPException(404, "Tax code not found")
    return tax


# --------------------------
# UPDATE TAX CODE
# --------------------------
@router.put("/{tax_id}", response_model=TaxCodeResponse)
def update_tax_code(tax_id: int, data: TaxCodeUpdate, db: Session = Depends(get_tenant_db)):
    log_api("UPDATE TAX CODE")

    tax = db.query(TaxCode).filter(TaxCode.id == tax_id).first()
    if not tax:
        raise HTTPException(404, "Tax code not found")

    for key, value in data.dict(exclude_unset=True).items():
        setattr(tax, key, value)

    db.commit()
    db.refresh(tax)

    log_audit(f"Tax code updated → ID {tax_id}")
    return tax


# --------------------------
# DELETE TAX CODE
# --------------------------
@router.delete("/{tax_id}")
def delete_tax_code(tax_id: int, db: Session = Depends(get_tenant_db)):
    log_api("DELETE TAX CODE")

    tax = db.query(TaxCode).filter(TaxCode.id == tax_id).first()
    if not tax:
        raise HTTPException(404, "Tax code not found")

    db.delete(tax)
    db.commit()

    log_audit(f"Tax code deleted → ID {tax_id}")
    return {"message": "Tax code deleted"}
