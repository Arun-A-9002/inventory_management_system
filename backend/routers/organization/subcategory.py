from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
import json

from database import get_current_tenant_db_name, get_tenant_db
from models.tenant_models import SubCategory, Category, AuditLog
from schemas.tenant_schemas import (
    SubCategoryCreate, SubCategoryUpdate, SubCategoryResponse
)
from utils.permissions import require_subcategory_view, require_subcategory_create, require_subcategory_edit, require_subcategory_delete
from utils.logger import log_api, log_error, log_audit

router = APIRouter(prefix="/subcategory", tags=["SubCategory"])

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
# CREATE SUBCATEGORY
# --------------------------
@router.post("/", response_model=SubCategoryResponse)
def create_subcategory(data: SubCategoryCreate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_subcategory_create())):
    log_api("CREATE SUBCATEGORY")

    try:
        category = db.query(Category).filter(Category.id == data.category_id).first()
        if not category:
            raise HTTPException(404, "Category not found")

        sub = SubCategory(**data.dict())
        db.add(sub)
        db.commit()
        db.refresh(sub)
        
        log_audit_trail(
            db=db,
            current_user=current_user,
            action="CREATE",
            table_name="subcategories",
            record_id=sub.id,
            new_values={"name": sub.name, "category_id": sub.category_id},
            description=f"Created subcategory {sub.name}",
            request=request
        )

        log_audit(f"Subcategory created → {sub.name}")
        return sub

    except Exception as e:
        log_error(e, "create_subcategory")
        raise HTTPException(500, "Failed to create subcategory")


# --------------------------
# LIST ALL SUBCATEGORIES
# --------------------------
@router.get("/", response_model=list[SubCategoryResponse])
def list_subcategories(db: Session = Depends(get_db), current_user: dict = Depends(require_subcategory_view())):
    return db.query(SubCategory).options(joinedload(SubCategory.category)).all()


# --------------------------
# GET SUBCATEGORIES BY CATEGORY
# --------------------------
@router.get("/by-category/{category_id}", response_model=list[SubCategoryResponse])
def get_subcategories_by_category(category_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_subcategory_view())):
    return db.query(SubCategory).filter(SubCategory.category_id == category_id).all()


# --------------------------
# GET SUBCATEGORY
# --------------------------
@router.get("/{sub_id}", response_model=SubCategoryResponse)
def get_subcategory(sub_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_subcategory_view())):
    sub = db.query(SubCategory).options(joinedload(SubCategory.category)).filter(SubCategory.id == sub_id).first()
    if not sub:
        raise HTTPException(404, "SubCategory not found")
    return sub


# --------------------------
# UPDATE SUBCATEGORY
# --------------------------
@router.put("/{sub_id}", response_model=SubCategoryResponse)
def update_subcategory(sub_id: int, data: SubCategoryUpdate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_subcategory_edit())):
    log_api("UPDATE SUBCATEGORY")

    sub = db.query(SubCategory).filter(SubCategory.id == sub_id).first()
    if not sub:
        raise HTTPException(404, "SubCategory not found")

    old_values = {"name": sub.name, "category_id": sub.category_id}
    
    updates = data.dict(exclude_unset=True)
    for key, value in updates.items():
        setattr(sub, key, value)

    db.commit()
    db.refresh(sub)
    
    new_values = {"name": sub.name, "category_id": sub.category_id}
    
    log_audit_trail(
        db=db,
        current_user=current_user,
        action="UPDATE",
        table_name="subcategories",
        record_id=sub.id,
        old_values=old_values,
        new_values=new_values,
        description=f"Updated subcategory {sub.name}",
        request=request
    )

    log_audit(f"Subcategory updated → {sub.name}")
    return sub


# --------------------------
# DELETE SUBCATEGORY
# --------------------------
@router.delete("/{sub_id}")
def delete_subcategory(sub_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_subcategory_delete())):
    log_api("DELETE SUBCATEGORY")

    sub = db.query(SubCategory).filter(SubCategory.id == sub_id).first()
    if not sub:
        raise HTTPException(404, "SubCategory not found")

    sub_details = {"name": sub.name, "category_id": sub.category_id}
    
    db.delete(sub)
    db.commit()
    
    log_audit_trail(
        db=db,
        current_user=current_user,
        action="DELETE",
        table_name="subcategories",
        record_id=sub_id,
        old_values=sub_details,
        description=f"Deleted subcategory {sub_details['name']}",
        request=request
    )

    log_audit(f"Subcategory deleted → {sub_id}")
    return {"message": "SubCategory deleted"}
