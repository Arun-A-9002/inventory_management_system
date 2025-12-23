from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_tenant_db
from models.tenant_models import InventoryLocation
from schemas.tenant_schemas import InventoryLocationCreate, InventoryLocationResponse

router = APIRouter(prefix="/inventory/locations", tags=["Inventory Locations"])
DEFAULT_DB = "arun"

def get_db():
    yield from get_tenant_db(DEFAULT_DB)

@router.get("/", response_model=list[InventoryLocationResponse])
def list_locations(db: Session = Depends(get_db)):
    locations = db.query(InventoryLocation).filter(InventoryLocation.is_active == True).all()
    return locations

@router.post("/", response_model=InventoryLocationResponse)
def create_location(data: InventoryLocationCreate, db: Session = Depends(get_db)):
    # Check if code already exists
    existing = db.query(InventoryLocation).filter(InventoryLocation.code == data.code).first()
    if existing:
        raise HTTPException(400, "Location code already exists")
    
    location = InventoryLocation(**data.dict())
    db.add(location)
    db.commit()
    db.refresh(location)
    return location