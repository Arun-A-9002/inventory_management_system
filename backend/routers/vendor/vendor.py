from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_tenant_db
from models.tenant_models import (
    Vendor, VendorQualification, VendorContract,
    VendorContractItem, VendorPerformance, VendorLeadTime
)
from schemas.tenant_schemas import *
import uuid

router = APIRouter(
    prefix="/vendors",
    tags=["Vendor Management"]
)

DEFAULT_TENANT_DB = "arun"

def get_tenant_session():
    yield from get_tenant_db(DEFAULT_TENANT_DB)

# ---------------- GET ALL VENDORS ----------------
@router.get("/")
def get_vendors(db: Session = Depends(get_tenant_session)):
    vendors = db.query(Vendor).all()
    return vendors

# ---------------- STEP 1: REGISTER VENDOR ----------------
@router.post("/", response_model=VendorResponse)
def create_vendor(data: VendorCreate, db: Session = Depends(get_tenant_session)):
    vendor_code = f"VND-{uuid.uuid4().hex[:6].upper()}"

    vendor = Vendor(
        **data.dict(),
        vendor_code=vendor_code
    )

    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor

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

# ---------------- STEP 3: CONTRACT ----------------
@router.get("/contract")
def get_contracts(db: Session = Depends(get_tenant_session)):
    contracts = db.query(VendorContract).all()
    return contracts

@router.post("/contract")
def create_contract(data: VendorContractCreate, db: Session = Depends(get_tenant_session)):
    contract = VendorContract(**data.dict())
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return {"message": "Vendor contract created", "id": contract.id}

@router.post("/contract/item")
def add_contract_item(data: VendorContractItemCreate, db: Session = Depends(get_tenant_session)):
    item = VendorContractItem(**data.dict())
    db.add(item)
    db.commit()
    return {"message": "Contract item added"}

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

# ---------------- UPDATE VENDOR ----------------
@router.put("/{vendor_id}")
def update_vendor(vendor_id: int, data: VendorCreate, db: Session = Depends(get_tenant_session)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    for key, value in data.dict().items():
        setattr(vendor, key, value)
    
    db.commit()
    db.refresh(vendor)
    return vendor

# ---------------- DELETE VENDOR ----------------
@router.delete("/{vendor_id}")
def delete_vendor(vendor_id: int, db: Session = Depends(get_tenant_session)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    db.delete(vendor)
    db.commit()
    return {"message": "Vendor deleted successfully"}
