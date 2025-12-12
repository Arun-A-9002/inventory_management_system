from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_tenant_db

from models.tenant_models import Category
from schemas.tenant_schemas import (
    CategoryCreate, CategoryUpdate, CategoryResponse
)

from utils.logger import log_api, log_error, log_audit

router = APIRouter(prefix="/category", tags=["Category"])


# --------------------------
# CREATE CATEGORY
# --------------------------
@router.post("/", response_model=CategoryResponse)
def create_category(data: CategoryCreate, db: Session = Depends(get_tenant_db)):
    log_api("CREATE CATEGORY")

    try:
        exists = db.query(Category).filter(Category.name == data.name).first()
        if exists:
            raise HTTPException(400, "Category already exists")

        category = Category(**data.dict())
        db.add(category)
        db.commit()
        db.refresh(category)

        log_audit(f"Category created → {category.name}")
        return category

    except Exception as e:
        log_error(e, "create_category")
        raise HTTPException(500, "Failed to create category")


# --------------------------
# LIST ALL CATEGORIES
# --------------------------
@router.get("/", response_model=list[CategoryResponse])
def list_categories(db: Session = Depends(get_tenant_db)):
    return db.query(Category).all()


# --------------------------
# GET ONE CATEGORY
# --------------------------
@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(category_id: int, db: Session = Depends(get_tenant_db)):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(404, "Category not found")
    return category


# --------------------------
# UPDATE CATEGORY
# --------------------------
@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(category_id: int, data: CategoryUpdate, db: Session = Depends(get_tenant_db)):
    log_api("UPDATE CATEGORY")

    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(404, "Category not found")

    updates = data.dict(exclude_unset=True)
    for key, value in updates.items():
        setattr(category, key, value)

    db.commit()
    db.refresh(category)

    log_audit(f"Category updated → {category.name}")
    return category


# --------------------------
# DELETE CATEGORY
# --------------------------
@router.delete("/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_tenant_db)):
    log_api("DELETE CATEGORY")

    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(404, "Category not found")

    db.delete(category)
    db.commit()

    log_audit(f"Category deleted → {category_id}")
    return {"message": "Category deleted"}
