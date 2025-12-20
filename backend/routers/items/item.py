from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from database import get_tenant_db
from models.tenant_models import Item, Category, SubCategory
from schemas.tenant_schemas import ItemCreate, ItemUpdate, ItemResponse

DEFAULT_TENANT_DB = "arun"

router = APIRouter(
    prefix="/items",
    tags=["Item Master"]
)

def get_db():
    yield from get_tenant_db(DEFAULT_TENANT_DB)

# ---------------- CREATE ----------------
@router.post("/", response_model=ItemResponse)
def create_item(payload: ItemCreate, db: Session = Depends(get_db)):
    existing = db.query(Item).filter(Item.item_code == payload.item_code).first()
    if existing:
        raise HTTPException(400, "Item code already exists")

    item = Item(**payload.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

# ---------------- GET ALL ----------------
@router.get("/")
def list_items(db: Session = Depends(get_db)):
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
            "uom": item.uom,
            "min_stock": item.min_stock,
            "max_stock": item.max_stock,
            "fixing_price": item.fixing_price,
            "mrp": item.mrp,
            "tax": item.tax,
            "is_batch_managed": item.is_batch_managed,
            "has_expiry": item.has_expiry,
            "expiry_date": item.expiry_date,
            "has_warranty": item.has_warranty,
            "warranty_start_date": item.warranty_start_date,
            "warranty_end_date": item.warranty_end_date,
            "barcode": item.barcode,
            "qr_code": item.qr_code,
            "is_active": item.is_active,
            "created_at": item.created_at
        }
        result.append(item_dict)
    
    return result

# ---------------- GET ONE ----------------
@router.get("/{item_id}", response_model=ItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    return item

# ---------------- UPDATE ----------------
@router.put("/{item_id}", response_model=ItemResponse)
def update_item(item_id: int, payload: ItemUpdate, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")

    for key, value in payload.dict(exclude_unset=True).items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item

# ---------------- SOFT DELETE ----------------
@router.delete("/{item_id}")
def deactivate_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")

    item.is_active = False
    db.commit()
    return {"message": "Item deactivated"}
