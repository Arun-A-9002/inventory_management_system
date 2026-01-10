from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from typing import List
import json

from database import get_current_tenant_db_name, get_tenant_db
from models.tenant_models import Item, Category, SubCategory, AuditLog
from schemas.tenant_schemas import ItemCreate, ItemUpdate, ItemResponse
from utils.permissions import require_items_view, require_items_create, require_items_edit, require_items_delete
from utils.logger import log_api, log_error, log_audit



router = APIRouter(
    prefix="/items",
    tags=["Item Master"]
)

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
    
    # Extract IP and User Agent from request
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
        module="ITEM_MASTER",
        description=description
    )
    db.add(audit_log)
    db.commit()

# ---------------- CREATE ----------------
@router.post("/", response_model=ItemResponse)
def create_item(payload: ItemCreate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_items_create())):
    log_api("CREATE ITEM")
    
    try:
        existing = db.query(Item).filter(Item.item_code == payload.item_code).first()
        if existing:
            raise HTTPException(400, "Item code already exists")

        item = Item(**payload.dict())
        db.add(item)
        db.commit()
        db.refresh(item)
        
        # Audit log
        log_audit_trail(
            db=db,
            current_user=current_user,
            action="CREATE",
            table_name="items",
            record_id=item.id,
            new_values={
                "name": item.name,
                "item_code": item.item_code,
                "category": item.category,
                "brand": item.brand,
                "item_type": item.item_type,
                "fixing_price": float(item.fixing_price) if item.fixing_price else 0,
                "mrp": float(item.mrp) if item.mrp else 0
            },
            description=f"Created item {item.name} ({item.item_code})",
            request=request
        )
        
        log_audit(f"Item created → {item.name}")
        return item
        
    except Exception as e:
        log_error(e, "create_item")
        raise HTTPException(500, "Failed to create item")

# ---------------- GET ALL ----------------
@router.get("/")
def list_items(db: Session = Depends(get_db), current_user: dict = Depends(require_items_view())):
    items = db.query(Item).order_by(Item.id.desc()).all()
    
    # Get category and subcategory names
    categories = {cat.id: cat.name for cat in db.query(Category).all()}
    subcategories = {sub.id: sub.name for sub in db.query(SubCategory).all()}
    
    result = []
    for item in items:
        # Handle category - could be stored as ID or name
        category_display = ""
        category_id = None
        if item.category:
            try:
                # Try to parse as integer (ID)
                category_id = int(item.category)
                category_display = categories.get(category_id, f"Unknown-{item.category}")
            except ValueError:
                # It's stored as name
                category_display = item.category
                # Find the ID for this name
                for cat_id, cat_name in categories.items():
                    if cat_name == item.category:
                        category_id = cat_id
                        break
        
        # Handle subcategory - could be stored as ID or name
        subcategory_display = ""
        subcategory_id = None
        if item.sub_category:
            try:
                # Try to parse as integer (ID)
                subcategory_id = int(item.sub_category)
                subcategory_display = subcategories.get(subcategory_id, f"Unknown-{item.sub_category}")
            except ValueError:
                # It's stored as name
                subcategory_display = item.sub_category
                # Find the ID for this name
                for sub_id, sub_name in subcategories.items():
                    if sub_name == item.sub_category:
                        subcategory_id = sub_id
                        break
        
        item_dict = {
            "id": item.id,
            "name": item.name,
            "item_code": item.item_code,
            "description": item.description,
            "category": category_display,
            "category_id": category_id,
            "sub_category": subcategory_display,
            "sub_category_id": subcategory_id,
            "brand": item.brand,
            "manufacturer": item.manufacturer,
            "min_stock": item.min_stock,
            "max_stock": item.max_stock,
            "safety_stock": getattr(item, 'safety_stock', 0),
            "fixing_price": item.fixing_price,
            "mrp": item.mrp,
            "tax": item.tax,
            "item_type": getattr(item, 'item_type', 'consumable'),
            "has_expiry": item.has_expiry,
            "expiry_date": item.expiry_date,
            "has_warranty": item.has_warranty,
            "warranty_period": getattr(item, 'warranty_period', 0),
            "warranty_period_type": getattr(item, 'warranty_period_type', 'years'),
            "barcode": item.barcode,
            "qr_code": item.qr_code,
            "is_active": item.is_active,
            "created_at": item.created_at
        }
        result.append(item_dict)
    
    return result

# ---------------- SEARCH ----------------
@router.get("/search")
def search_items(name: str = None, db: Session = Depends(get_db)):
    """Search items by name"""
    query = db.query(Item).filter(Item.is_active == True)
    
    if name:
        query = query.filter(Item.name.ilike(f"%{name.strip()}%"))
    
    items = query.all()
    
    result = []
    for item in items:
        result.append({
            "id": item.id,
            "name": item.name,
            "item_code": item.item_code,
            "tax_rate": item.tax or 18,
            "mrp": float(item.mrp) if item.mrp else 0,
            "fixing_price": float(item.fixing_price) if item.fixing_price else 0
        })
    
    return result

# ---------------- GET ONE ----------------
@router.get("/{item_id}", response_model=ItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_items_view())):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    return item

# ---------------- UPDATE ----------------
@router.put("/{item_id}", response_model=ItemResponse)
def update_item(item_id: int, payload: ItemUpdate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_items_edit())):
    log_api("UPDATE ITEM")
    
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")

    # Store old values for audit
    old_values = {
        "name": item.name,
        "item_code": item.item_code,
        "category": item.category,
        "brand": item.brand,
        "item_type": item.item_type,
        "fixing_price": float(item.fixing_price) if item.fixing_price else 0,
        "mrp": float(item.mrp) if item.mrp else 0
    }

    for key, value in payload.dict(exclude_unset=True).items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    
    # Store new values for audit
    new_values = {
        "name": item.name,
        "item_code": item.item_code,
        "category": item.category,
        "brand": item.brand,
        "item_type": item.item_type,
        "fixing_price": float(item.fixing_price) if item.fixing_price else 0,
        "mrp": float(item.mrp) if item.mrp else 0
    }
    
    # Audit log
    log_audit_trail(
        db=db,
        current_user=current_user,
        action="UPDATE",
        table_name="items",
        record_id=item.id,
        old_values=old_values,
        new_values=new_values,
        description=f"Updated item {item.name} ({item.item_code})",
        request=request
    )
    
    log_audit(f"Item updated → {item.name}")
    return item

# ---------------- SOFT DELETE ----------------
@router.delete("/{item_id}")
def deactivate_item(item_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_items_delete())):
    log_api("DELETE ITEM")
    
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")

    # Store item details for audit before deactivation
    item_details = {
        "name": item.name,
        "item_code": item.item_code,
        "category": item.category,
        "brand": item.brand,
        "item_type": item.item_type,
        "is_active": item.is_active
    }

    item.is_active = False
    db.commit()
    
    # Audit log
    log_audit_trail(
        db=db,
        current_user=current_user,
        action="DELETE",
        table_name="items",
        record_id=item_id,
        old_values=item_details,
        description=f"Deactivated item {item_details['name']} ({item_details['item_code']})",
        request=request
    )
    
    log_audit(f"Item deactivated → {item_id}")
    return {"message": "Item deactivated"}

# ---------------- SEARCH ----------------
@router.get("/search")
def search_items(name: str = None, db: Session = Depends(get_db)):
    """Search items by name"""
    query = db.query(Item).filter(Item.is_active == True)
    
    if name:
        query = query.filter(Item.name.ilike(f"%{name.strip()}%"))
    
    items = query.all()
    
    result = []
    for item in items:
        result.append({
            "id": item.id,
            "name": item.name,
            "item_code": item.item_code,
            "tax_rate": item.tax or 18,
            "mrp": float(item.mrp) if item.mrp else 0,
            "fixing_price": float(item.fixing_price) if item.fixing_price else 0
        })
    
    return result
