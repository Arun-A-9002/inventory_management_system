from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_tenant_db
from models.tenant_models import Brand
from schemas.tenant_schemas import (
    BrandCreate, BrandUpdate, BrandResponse
)

from utils.logger import log_api, log_error, log_audit

router = APIRouter(prefix="/brand", tags=["Brand"])


# --------------------------
# CREATE BRAND
# --------------------------
@router.post("/", response_model=BrandResponse)
def create_brand(data: BrandCreate, db: Session = Depends(get_tenant_db)):
    log_api("CREATE BRAND")

    try:
        # Optional: Check duplicate brand name
        exists = db.query(Brand).filter(Brand.brand_name == data.brand_name).first()
        if exists:
            raise HTTPException(400, "Brand already exists")

        brand = Brand(**data.dict())
        db.add(brand)
        db.commit()
        db.refresh(brand)

        log_audit(f"Brand created → {brand.brand_name}")
        return brand

    except Exception as e:
        log_error(e, "create_brand")
        raise HTTPException(500, "Failed to create brand")


# --------------------------
# LIST BRANDS
# --------------------------
@router.get("/", response_model=list[BrandResponse])
def list_brands(db: Session = Depends(get_tenant_db)):
    return db.query(Brand).all()


# --------------------------
# GET BRAND
# --------------------------
@router.get("/{brand_id}", response_model=BrandResponse)
def get_brand(brand_id: int, db: Session = Depends(get_tenant_db)):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(404, "Brand not found")
    return brand


# --------------------------
# UPDATE BRAND
# --------------------------
@router.put("/{brand_id}", response_model=BrandResponse)
def update_brand(brand_id: int, data: BrandUpdate, db: Session = Depends(get_tenant_db)):
    log_api("UPDATE BRAND")

    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(404, "Brand not found")

    for key, value in data.dict(exclude_unset=True).items():
        setattr(brand, key, value)

    db.commit()
    db.refresh(brand)

    log_audit(f"Brand updated → {brand.brand_name}")
    return brand


# --------------------------
# DELETE BRAND
# --------------------------
@router.delete("/{brand_id}")
def delete_brand(brand_id: int, db: Session = Depends(get_tenant_db)):
    log_api("DELETE BRAND")

    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(404, "Brand not found")

    db.delete(brand)
    db.commit()

    log_audit(f"Brand deleted → {brand_id}")
    return {"message": "Brand deleted"}
