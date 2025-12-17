from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_tenant_db
from models.tenant_models import Item
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
@router.get("/", response_model=List[ItemResponse])
def list_items(db: Session = Depends(get_db)):
    return db.query(Item).order_by(Item.id.desc()).all()

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
