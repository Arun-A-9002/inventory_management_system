from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import json

from database import get_current_tenant_db_name, get_tenant_db
from models.tenant_models import Brand, AuditLog
from schemas.tenant_schemas import (
    BrandCreate, BrandUpdate, BrandResponse
)
from utils.permissions import require_brand_view, require_brand_create, require_brand_edit, require_brand_delete
from utils.logger import log_api, log_error, log_audit

router = APIRouter(prefix="/brand", tags=["Brand"])

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
# CREATE BRAND
# --------------------------
@router.post("/", response_model=BrandResponse)
def create_brand(data: BrandCreate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_brand_create())):
    log_api("CREATE BRAND")

    try:
        exists = db.query(Brand).filter(Brand.brand_name == data.brand_name).first()
        if exists:
            raise HTTPException(400, "Brand already exists")

        brand = Brand(**data.dict())
        db.add(brand)
        db.commit()
        db.refresh(brand)
        
        log_audit_trail(
            db=db,
            current_user=current_user,
            action="CREATE",
            table_name="brands",
            record_id=brand.id,
            new_values={"brand_name": brand.brand_name, "manufacturer_name": brand.manufacturer_name},
            description=f"Created brand {brand.brand_name}",
            request=request
        )

        log_audit(f"Brand created → {brand.brand_name}")
        return brand

    except Exception as e:
        log_error(e, "create_brand")
        raise HTTPException(500, "Failed to create brand")


# --------------------------
# LIST BRANDS
# --------------------------
@router.get("/", response_model=list[BrandResponse])
def list_brands(db: Session = Depends(get_db), current_user: dict = Depends(require_brand_view())):
    return db.query(Brand).all()


# --------------------------
# GET BRAND
# --------------------------
@router.get("/{brand_id}", response_model=BrandResponse)
def get_brand(brand_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_brand_view())):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(404, "Brand not found")
    return brand


# --------------------------
# UPDATE BRAND
# --------------------------
@router.put("/{brand_id}", response_model=BrandResponse)
def update_brand(brand_id: int, data: BrandUpdate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_brand_edit())):
    log_api("UPDATE BRAND")

    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(404, "Brand not found")

    old_values = {"brand_name": brand.brand_name, "manufacturer_name": brand.manufacturer_name}
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(brand, key, value)

    db.commit()
    db.refresh(brand)
    
    new_values = {"brand_name": brand.brand_name, "manufacturer_name": brand.manufacturer_name}
    
    log_audit_trail(
        db=db,
        current_user=current_user,
        action="UPDATE",
        table_name="brands",
        record_id=brand.id,
        old_values=old_values,
        new_values=new_values,
        description=f"Updated brand {brand.brand_name}",
        request=request
    )

    log_audit(f"Brand updated → {brand.brand_name}")
    return brand


# --------------------------
# DELETE BRAND
# --------------------------
@router.delete("/{brand_id}")
def delete_brand(brand_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_brand_delete())):
    log_api("DELETE BRAND")

    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(404, "Brand not found")

    brand_details = {"brand_name": brand.brand_name, "manufacturer_name": brand.manufacturer_name}
    
    db.delete(brand)
    db.commit()
    
    log_audit_trail(
        db=db,
        current_user=current_user,
        action="DELETE",
        table_name="brands",
        record_id=brand_id,
        old_values=brand_details,
        description=f"Deleted brand {brand_details['brand_name']}",
        request=request
    )

    log_audit(f"Brand deleted → {brand_id}")
    return {"message": "Brand deleted"}
