from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import json
from database import get_tenant_db
from models.tenant_models import InventoryLocation, AuditLog
from schemas.tenant_schemas import InventoryLocationCreate, InventoryLocationResponse
from utils.permissions import (
    require_locations_view, require_locations_create_internal, require_locations_create_external,
    require_locations_edit, require_locations_delete
)
from utils.logger import log_api, log_error, log_audit

router = APIRouter(prefix="/inventory/locations", tags=["Inventory Locations"])
DEFAULT_DB = "arun"

def get_db():
    yield from get_tenant_db(DEFAULT_DB)

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
        module="LOCATION_MANAGEMENT",
        description=description
    )
    db.add(audit_log)
    db.commit()

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
def create_location(data: InventoryLocationCreate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_locations_create_internal())):
    log_api("CREATE LOCATION")
    
    try:
        # Check if code already exists
        existing = db.query(InventoryLocation).filter(InventoryLocation.code == data.code).first()
        if existing:
            raise HTTPException(400, "Location code already exists")
        
        location = InventoryLocation(**data.dict())
        db.add(location)
        db.commit()
        db.refresh(location)
        
        log_audit_trail(
            db=db,
            current_user=current_user,
            action="CREATE",
            table_name="inventory_locations",
            record_id=location.id,
            new_values={
                "code": location.code,
                "name": location.name,
                "location_type": location.location_type,
                "description": location.description
            },
            description=f"Created location {location.name} ({location.code})",
            request=request
        )
        
        log_audit(f"Location created → {location.name}")
        return location
        
    except Exception as e:
        log_error(e, "create_location")
        raise HTTPException(500, "Failed to create location")

@router.get("/{location_id}", response_model=InventoryLocationResponse)
def get_location(location_id: int, db: Session = Depends(get_db), _: dict = Depends(require_locations_view())):
    location = db.query(InventoryLocation).filter(InventoryLocation.id == location_id).first()
    if not location:
        raise HTTPException(404, "Location not found")
    return location

@router.put("/{location_id}", response_model=InventoryLocationResponse)
def update_location(location_id: int, data: InventoryLocationCreate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_locations_edit())):
    log_api("UPDATE LOCATION")
    
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
    
    old_values = {
        "code": location.code,
        "name": location.name,
        "location_type": location.location_type,
        "description": location.description
    }
    
    for field, value in data.dict().items():
        setattr(location, field, value)
    
    db.commit()
    db.refresh(location)
    
    new_values = {
        "code": location.code,
        "name": location.name,
        "location_type": location.location_type,
        "description": location.description
    }
    
    log_audit_trail(
        db=db,
        current_user=current_user,
        action="UPDATE",
        table_name="inventory_locations",
        record_id=location.id,
        old_values=old_values,
        new_values=new_values,
        description=f"Updated location {location.name} ({location.code})",
        request=request
    )
    
    log_audit(f"Location updated → {location.name}")
    return location

@router.delete("/{location_id}")
def delete_location(location_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_locations_delete())):
    log_api("DELETE LOCATION")
    
    location = db.query(InventoryLocation).filter(InventoryLocation.id == location_id).first()
    if not location:
        raise HTTPException(404, "Location not found")
    
    location_details = {
        "code": location.code,
        "name": location.name,
        "location_type": location.location_type,
        "description": location.description,
        "is_active": location.is_active
    }
    
    location.is_active = False
    db.commit()
    
    log_audit_trail(
        db=db,
        current_user=current_user,
        action="DELETE",
        table_name="inventory_locations",
        record_id=location_id,
        old_values=location_details,
        description=f"Deleted location {location_details['name']} ({location_details['code']})",
        request=request
    )
    
    log_audit(f"Location deleted → {location_id}")
    return {"message": "Location deleted successfully"}