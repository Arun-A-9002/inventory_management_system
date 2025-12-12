from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_tenant_db

from models.tenant_models import SubCategory, Category
from schemas.tenant_schemas import (
    SubCategoryCreate, SubCategoryUpdate, SubCategoryResponse
)

from utils.logger import log_api, log_error, log_audit

router = APIRouter(prefix="/subcategory", tags=["SubCategory"])


# --------------------------
# CREATE SUBCATEGORY
# --------------------------
@router.post("/", response_model=SubCategoryResponse)
def create_subcategory(data: SubCategoryCreate, db: Session = Depends(get_tenant_db)):
    log_api("CREATE SUBCATEGORY")

    try:
        # Ensure category exists
        category = db.query(Category).filter(Category.id == data.category_id).first()
        if not category:
            raise HTTPException(404, "Category not found")

        sub = SubCategory(**data.dict())
        db.add(sub)
        db.commit()
        db.refresh(sub)

        log_audit(f"Subcategory created → {sub.name}")
        return sub

    except Exception as e:
        log_error(e, "create_subcategory")
        raise HTTPException(500, "Failed to create subcategory")


# --------------------------
# LIST ALL SUBCATEGORIES
# --------------------------
@router.get("/", response_model=list[SubCategoryResponse])
def list_subcategories(db: Session = Depends(get_tenant_db)):
    return db.query(SubCategory).all()


# --------------------------
# GET SUBCATEGORY
# --------------------------
@router.get("/{sub_id}", response_model=SubCategoryResponse)
def get_subcategory(sub_id: int, db: Session = Depends(get_tenant_db)):
    sub = db.query(SubCategory).filter(SubCategory.id == sub_id).first()
    if not sub:
        raise HTTPException(404, "SubCategory not found")
    return sub


# --------------------------
# UPDATE SUBCATEGORY
# --------------------------
@router.put("/{sub_id}", response_model=SubCategoryResponse)
def update_subcategory(sub_id: int, data: SubCategoryUpdate, db: Session = Depends(get_tenant_db)):
    log_api("UPDATE SUBCATEGORY")

    sub = db.query(SubCategory).filter(SubCategory.id == sub_id).first()
    if not sub:
        raise HTTPException(404, "SubCategory not found")

    updates = data.dict(exclude_unset=True)
    for key, value in updates.items():
        setattr(sub, key, value)

    db.commit()
    db.refresh(sub)

    log_audit(f"Subcategory updated → {sub.name}")
    return sub


# --------------------------
# DELETE SUBCATEGORY
# --------------------------
@router.delete("/{sub_id}")
def delete_subcategory(sub_id: int, db: Session = Depends(get_tenant_db)):
    log_api("DELETE SUBCATEGORY")

    sub = db.query(SubCategory).filter(SubCategory.id == sub_id).first()
    if not sub:
        raise HTTPException(404, "SubCategory not found")

    db.delete(sub)
    db.commit()

    log_audit(f"Subcategory deleted → {sub_id}")
    return {"message": "SubCategory deleted"}
