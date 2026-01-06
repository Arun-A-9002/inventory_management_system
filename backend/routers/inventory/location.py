from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_tenant_db
from models.tenant_models import InventoryLocation
from schemas.tenant_schemas import InventoryLocationCreate, InventoryLocationResponse
from utils.permissions import (
    require_locations_view, require_locations_create_internal, require_locations_create_external,
    require_locations_edit, require_locations_delete
)

router = APIRouter(prefix="/inventory/locations", tags=["Inventory Locations"])
DEFAULT_DB = "arun"

def get_db():
    yield from get_tenant_db(DEFAULT_DB)

@router.get("/", response_model=list[InventoryLocationResponse])
def list_locations(location_type: str = None, db: Session = Depends(get_db), _: dict = Depends(require_locations_view())):
    query = db.query(InventoryLocation).filter(InventoryLocation.is_active == True)
    
    # Filter by location_type if provided
    if location_type:
        query = query.filter(InventoryLocation.location_type == location_type)
    
    locations = query.all()
    return locations

@router.get("/internal", response_model=list[InventoryLocationResponse])
def list_internal_locations(db: Session = Depends(get_db), _: dict = Depends(require_locations_view())):
    """Get only internal locations for GRN and inventory operations"""
    locations = db.query(InventoryLocation).filter(
        InventoryLocation.is_active == True,
        InventoryLocation.location_type == "internal"
    ).all()
    return locations

@router.post("/", response_model=InventoryLocationResponse)
def create_location(data: InventoryLocationCreate, db: Session = Depends(get_db), _: dict = Depends(require_locations_create_internal())):
    # Check if code already exists
    existing = db.query(InventoryLocation).filter(InventoryLocation.code == data.code).first()
    if existing:
        raise HTTPException(400, "Location code already exists")
    
    location = InventoryLocation(**data.dict())
    db.add(location)
    db.commit()
    db.refresh(location)
    return location

@router.get("/{location_id}", response_model=InventoryLocationResponse)
def get_location(location_id: int, db: Session = Depends(get_db), _: dict = Depends(require_locations_view())):
    location = db.query(InventoryLocation).filter(InventoryLocation.id == location_id).first()
    if not location:
        raise HTTPException(404, "Location not found")
    return location

@router.put("/{location_id}", response_model=InventoryLocationResponse)
def update_location(location_id: int, data: InventoryLocationCreate, db: Session = Depends(get_db), _: dict = Depends(require_locations_edit())):
    location = db.query(InventoryLocation).filter(InventoryLocation.id == location_id).first()
    if not location:
        raise HTTPException(404, "Location not found")
    
    # Check if code already exists (excluding current location)
    existing = db.query(InventoryLocation).filter(
        InventoryLocation.code == data.code,
        InventoryLocation.id != location_id
    ).first()
    if existing:
        raise HTTPException(400, "Location code already exists")
    
    for field, value in data.dict().items():
        setattr(location, field, value)
    
    db.commit()
    db.refresh(location)
    return location

@router.delete("/{location_id}")
def delete_location(location_id: int, db: Session = Depends(get_db), _: dict = Depends(require_locations_delete())):
    location = db.query(InventoryLocation).filter(InventoryLocation.id == location_id).first()
    if not location:
        raise HTTPException(404, "Location not found")
    
    location.is_active = False
    db.commit()
    return {"message": "Location deleted successfully"}