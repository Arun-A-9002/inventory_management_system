from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import json

from database import get_tenant_db
from models.tenant_models import Category, AuditLog
from schemas.tenant_schemas import (
    CategoryCreate, CategoryUpdate, CategoryResponse
)
from utils.permissions import require_category_view, require_category_create, require_category_edit, require_category_delete
from utils.logger import log_api, log_error, log_audit

router = APIRouter(prefix="/category", tags=["Category"])

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
# CREATE CATEGORY
# --------------------------
@router.post("/", response_model=CategoryResponse)
def create_category(data: CategoryCreate, request: Request, db: Session = Depends(get_tenant_db), current_user: dict = Depends(require_category_create())):
    log_api("CREATE CATEGORY")

    try:
        exists = db.query(Category).filter(Category.name == data.name).first()
        if exists:
            raise HTTPException(400, "Category already exists")

        category = Category(**data.dict())
        db.add(category)
        db.commit()
        db.refresh(category)
        
        log_audit_trail(
            db=db,
            current_user=current_user,
            action="CREATE",
            table_name="categories",
            record_id=category.id,
            new_values={"name": category.name, "description": category.description},
            description=f"Created category {category.name}",
            request=request
        )

        log_audit(f"Category created → {category.name}")
        return category

    except Exception as e:
        log_error(e, "create_category")
        raise HTTPException(500, "Failed to create category")


# --------------------------
# LIST ALL CATEGORIES
# --------------------------
@router.get("/", response_model=list[CategoryResponse])
def list_categories(db: Session = Depends(get_tenant_db), current_user: dict = Depends(require_category_view())):
    return db.query(Category).all()


# --------------------------
# GET ONE CATEGORY
# --------------------------
@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(category_id: int, db: Session = Depends(get_tenant_db), current_user: dict = Depends(require_category_view())):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(404, "Category not found")
    return category


# --------------------------
# UPDATE CATEGORY
# --------------------------
@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(category_id: int, data: CategoryUpdate, request: Request, db: Session = Depends(get_tenant_db), current_user: dict = Depends(require_category_edit())):
    log_api("UPDATE CATEGORY")

    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(404, "Category not found")

    old_values = {"name": category.name, "description": category.description}
    
    updates = data.dict(exclude_unset=True)
    for key, value in updates.items():
        setattr(category, key, value)

    db.commit()
    db.refresh(category)
    
    new_values = {"name": category.name, "description": category.description}
    
    log_audit_trail(
        db=db,
        current_user=current_user,
        action="UPDATE",
        table_name="categories",
        record_id=category.id,
        old_values=old_values,
        new_values=new_values,
        description=f"Updated category {category.name}",
        request=request
    )

    log_audit(f"Category updated → {category.name}")
    return category


# --------------------------
# DELETE CATEGORY
# --------------------------
@router.delete("/{category_id}")
def delete_category(category_id: int, request: Request, db: Session = Depends(get_tenant_db), current_user: dict = Depends(require_category_delete())):
    log_api("DELETE CATEGORY")

    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(404, "Category not found")

    category_details = {"name": category.name, "description": category.description}
    
    db.delete(category)
    db.commit()
    
    log_audit_trail(
        db=db,
        current_user=current_user,
        action="DELETE",
        table_name="categories",
        record_id=category_id,
        old_values=category_details,
        description=f"Deleted category {category_details['name']}",
        request=request
    )

    log_audit(f"Category deleted → {category_id}")
    return {"message": "Category deleted"}
