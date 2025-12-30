from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from database import get_tenant_db
from models.tenant_models import Stock, StockLedger, StockTransfer, StockIssue, Item, GRNItem, Batch, Department
from schemas.tenant_schemas import *
from datetime import datetime, date, timedelta
from typing import List

router = APIRouter(prefix="/stocks", tags=["Stock Management"])
DEFAULT_DB = "arun"

def get_db():
    yield from get_tenant_db(DEFAULT_DB)

# ---------------- OVERVIEW ----------------
@router.get("/")
def list_stock(db: Session = Depends(get_db)):
    # Get all active items from item master
    items = db.query(Item).filter(Item.is_active == True).all()
    
    result = []
    for item in items:
        # Get all batches for this item from approved GRNs
        from models.tenant_models import GRN, GRNStatus
        approved_grn_items = db.query(GRNItem).join(GRN).filter(
            GRNItem.item_name == item.name,
            GRN.status == GRNStatus.approved
        ).all()
        
        # Get all batches for this item
        all_batches = []
        total_qty = 0
        
        for grn_item in approved_grn_items:
            batches = db.query(Batch).filter(Batch.grn_item_id == grn_item.id).all()
            for batch in batches:
                batch_info = {
                    "batch_no": batch.batch_no,
                    "qty": batch.qty,
                    "expiry_date": batch.expiry_date.strftime("%d/%m/%Y") if batch.expiry_date else None,
                    "mfg_date": batch.mfg_date.strftime("%d/%m/%Y") if batch.mfg_date else None
                }
                all_batches.append(batch_info)
                total_qty += batch.qty
        
        # Get location from the latest approved GRN
        latest_grn = db.query(GRN).join(GRNItem).filter(
            GRNItem.item_name == item.name,
            GRN.status == GRNStatus.approved
        ).order_by(GRN.grn_date.desc()).first()
        
        location = latest_grn.store if latest_grn else "Main Store"
        
        stock_data = {
            "id": item.id,
            "item_name": item.name,
            "item_code": item.item_code,
            "available_qty": int(total_qty),
            "min_stock": item.min_stock or 0,
            "location": location,
            "batches": all_batches
        }
        result.append(stock_data)
    
    return result

@router.post("/add-batch-stock")
def add_batch_stock(data: dict, db: Session = Depends(get_db)):
    """Add stock back to batch and create proper ledger entry"""
    from models.tenant_models import GRN, GRNItem, Batch, GRNStatus, StockLedger, Stock
    from datetime import datetime
    
    item_name = data.get('item_name')
    batch_no = data.get('batch_no') 
    quantity = int(data.get('quantity', 0))
    return_id = data.get('return_id')  # Add return_id to track processed returns
    
    # Simple duplicate prevention using return_id
    if return_id:
        # Check if this return was already processed by looking for a specific remark
        existing_return = db.query(StockLedger).filter(
            StockLedger.remarks.like(f"%return_id:{return_id}%")
        ).first()
        
        if existing_return:
            return {"message": "Return already processed", "updated_qty": 0}
    
    # Find batch in approved GRNs
    batch = db.query(Batch).join(GRNItem).join(GRN).filter(
        GRNItem.item_name == item_name,
        Batch.batch_no == batch_no,
        GRN.status == GRNStatus.approved
    ).first()
    
    if not batch:
        raise HTTPException(404, "Batch not found")
    
    # Add quantity back to batch
    batch.qty += quantity
    
    # Update GRN item
    grn_item = db.query(GRNItem).filter(GRNItem.id == batch.grn_item_id).first()
    if grn_item:
        grn_item.received_qty += quantity
    
    # Find or create stock record
    stock = db.query(Stock).filter(Stock.item_name == item_name).first()
    if not stock:
        # Create stock record if it doesn't exist
        item = db.query(Item).filter(Item.name == item_name).first()
        stock = Stock(
            item_name=item_name,
            sku=f"SKU-{item_name[:3].upper()}",
            uom=grn_item.uom or "PCS",
            total_qty=quantity,
            available_qty=quantity,
            reserved_qty=0,
            reorder_level=item.min_stock if item else 0
        )
        db.add(stock)
        db.flush()
    else:
        # Update existing stock
        stock.total_qty += quantity
        stock.available_qty += quantity
    
    # Create ledger entry
    ref_no = f"ADJ-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    if return_id:
        ref_no = f"RTN-{return_id}"
    
    ledger = StockLedger(
        stock_id=stock.id,
        batch_no=batch_no,
        txn_type="ADJUST_IN",
        qty_in=quantity,
        qty_out=0,
        balance=stock.available_qty,
        ref_no=ref_no,
        remarks=f"Stock adjustment - {return_id if return_id else 'quantity update'}"
    )
    db.add(ledger)
    
    db.commit()
    
    return {"message": f"Added {quantity} units back to stock", "updated_qty": batch.qty}

@router.get("/ledger")
def get_stock_ledger(db: Session = Depends(get_db)):
    """Get comprehensive stock ledger with all transactions"""
    from models.tenant_models import GRN, GRNStatus
    
    ledger_entries = []
    
    # Get all stock ledger entries first (these are the actual transactions)
    stock_ledger_entries = db.query(StockLedger).order_by(StockLedger.created_at.desc()).all()
    
    for entry in stock_ledger_entries:
        stock = db.query(Stock).filter(Stock.id == entry.stock_id).first()
        ledger_entries.append({
            "date": entry.created_at.strftime("%d/%m/%Y"),
            "item_name": stock.item_name if stock else "Unknown",
            "batch_no": entry.batch_no or "—",
            "txn_type": entry.txn_type,
            "qty_in": entry.qty_in or 0,
            "qty_out": entry.qty_out or 0,
            "balance": entry.balance,
            "ref_no": entry.ref_no or "—"
        })
    
    # If no stock ledger entries exist, fall back to GRN data
    if not ledger_entries:
        approved_grns = db.query(GRN).filter(GRN.status == GRNStatus.approved).order_by(GRN.grn_date.desc()).all()
        
        for grn in approved_grns:
            grn_items = db.query(GRNItem).filter(GRNItem.grn_id == grn.id).all()
            
            for grn_item in grn_items:
                batches = db.query(Batch).filter(Batch.grn_item_id == grn_item.id).all()
                
                for batch in batches:
                    ledger_entries.append({
                        "date": grn.grn_date.strftime("%d/%m/%Y"),
                        "item_name": grn_item.item_name,
                        "batch_no": batch.batch_no,
                        "txn_type": "GRN_RECEIPT",
                        "qty_in": batch.qty,
                        "qty_out": 0,
                        "balance": batch.qty,
                        "ref_no": grn.grn_number
                    })
    
    return ledger_entries