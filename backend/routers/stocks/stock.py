from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_tenant_db
from models.tenant_models import Stock, StockLedger, StockTransfer, StockIssue, Item, GRNItem
from schemas.tenant_schemas import *
from datetime import datetime

router = APIRouter(prefix="/stocks", tags=["Stock Management"])
DEFAULT_DB = "arun"

def get_db():
    yield from get_tenant_db(DEFAULT_DB)

# ---------------- OVERVIEW ----------------
@router.get("/")
def list_stock(db: Session = Depends(get_db)):
    # Get all items from item master
    items = db.query(Item).filter(Item.is_active == True).all()
    
    result = []
    for item in items:
        # Check if stock exists for this item
        stock = db.query(Stock).filter(Stock.item_name == item.name).first()
        
        # Get latest GRN item for cost per piece and MRP per piece
        latest_grn_item = db.query(GRNItem).filter(
            GRNItem.item_name == item.name
        ).order_by(GRNItem.id.desc()).first()
        
        stock_data = {
            "id": stock.id if stock else item.id,
            "item_name": item.name,
            "item_code": item.item_code,
            "sku": stock.sku if stock else f"SKU-{item.item_code}",
            "category": item.category,
            "brand": item.brand,
            "uom": item.uom,
            "total_qty": stock.total_qty if stock else 0,
            "available_qty": stock.available_qty if stock else 0,
            "reserved_qty": stock.reserved_qty if stock else 0,
            "min_stock": item.min_stock,
            "mrp": float(item.mrp) if item.mrp else 0.0,
            "cost_per_piece": float(latest_grn_item.cost_per_piece) if latest_grn_item and latest_grn_item.cost_per_piece else float(item.fixing_price) if item.fixing_price else 0.0,
            "mrp_per_piece": float(latest_grn_item.mrp_per_piece) if latest_grn_item and latest_grn_item.mrp_per_piece else float(item.mrp) if item.mrp else 0.0
        }
        result.append(stock_data)
    
    return result


# ---------------- ADJUSTMENT ----------------
@router.post("/adjust")
def adjust_stock(data: StockAdjustmentCreate, db: Session = Depends(get_db)):
    stock = db.query(Stock).get(data.stock_id)
    if not stock:
        raise HTTPException(404, "Stock not found")

    if data.adjustment_type in ["OPENING", "INCREASE"]:
        stock.total_qty += data.quantity
        stock.available_qty += data.quantity
        qty_in, qty_out = data.quantity, 0
    else:
        stock.total_qty -= data.quantity
        stock.available_qty -= data.quantity
        qty_in, qty_out = 0, data.quantity

    ledger = StockLedger(
        stock_id=stock.id,
        batch_no=data.batch_no,
        txn_type=data.adjustment_type,
        qty_in=qty_in,
        qty_out=qty_out,
        balance=stock.available_qty,
        remarks=data.reason
    )

    db.add(ledger)
    db.commit()
    return {"message": "Stock adjusted successfully"}


# ---------------- TRANSFER ----------------
@router.post("/transfer")
def transfer_stock(data: StockTransferCreate, db: Session = Depends(get_db)):
    transfer = StockTransfer(**data.dict())
    db.add(transfer)
    db.commit()
    return {"message": "Transfer initiated"}


# ---------------- ISSUE ----------------
@router.post("/issue")
def issue_stock(data: StockIssueCreate, db: Session = Depends(get_db)):
    issue = StockIssue(
        issue_no=f"ISS-{data.stock_id}-{int(datetime.utcnow().timestamp())}",
        **data.dict()
    )
    db.add(issue)
    db.commit()
    return {"message": "Stock issued"}
