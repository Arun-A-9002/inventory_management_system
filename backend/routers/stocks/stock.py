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
        # Get stock record if exists (includes adjustments)
        stock = db.query(Stock).filter(Stock.item_name == item.name).first()
        
        if stock:
            available_qty = stock.available_qty
            location = "Main Store"  # Default location for adjusted stock
        else:
            # Fallback to GRN calculation if no stock record
            from models.tenant_models import GRN, GRNStatus
            approved_grn_items = db.query(GRNItem).join(GRN).filter(
                GRNItem.item_name == item.name,
                GRN.status == GRNStatus.approved
            ).all()
            
            available_qty = sum(grn_item.received_qty for grn_item in approved_grn_items)
            
            # Get location from the latest approved GRN
            latest_grn = db.query(GRN).join(GRNItem).filter(
                GRNItem.item_name == item.name,
                GRN.status == GRNStatus.approved
            ).order_by(GRN.grn_date.desc()).first()
            
            location = latest_grn.store if latest_grn else "Not Assigned"
        
        stock_data = {
            "id": stock.id if stock else item.id,
            "item_name": item.name,
            "item_code": item.item_code,
            "available_qty": int(available_qty),
            "min_stock": item.min_stock or 0,
            "location": location
        }
        result.append(stock_data)
    
    return result


# ---------------- DEBUG ----------------
@router.get("/debug")
def debug_stock(db: Session = Depends(get_db)):
    stocks = db.query(Stock).all()
    grn_items = db.query(GRNItem).all()
    return {
        "stock_count": len(stocks),
        "grn_items_count": len(grn_items),
        "stocks": [{
            "id": s.id,
            "item_name": s.item_name,
            "total_qty": s.total_qty,
            "available_qty": s.available_qty
        } for s in stocks],
        "grn_items": [{
            "id": g.id,
            "item_name": g.item_name,
            "received_qty": g.received_qty
        } for g in grn_items]
    }

# ---------------- ADJUSTMENT ----------------
@router.get("/items")
def get_items_for_adjustment(db: Session = Depends(get_db)):
    """Get all items for stock adjustment dropdown"""
    items = db.query(Item).filter(Item.is_active == True).all()
    return [{"id": item.id, "name": item.name, "item_code": item.item_code} for item in items]

@router.post("/adjust")
def adjust_stock(data: StockAdjustmentCreate, db: Session = Depends(get_db)):
    # Find item by name or create stock if doesn't exist
    item = db.query(Item).filter(Item.name == data.item_name).first()
    if not item:
        raise HTTPException(404, "Item not found")
    
    stock = db.query(Stock).filter(Stock.item_name == data.item_name).first()
    if not stock:
        # Create new stock entry for opening stock
        stock = Stock(
            item_name=data.item_name,
            sku=f"SKU-{data.item_name[:3].upper()}",
            uom=item.uom or "PCS",
            total_qty=0,
            available_qty=0,
            reserved_qty=0,
            reorder_level=item.min_stock or 0
        )
        db.add(stock)
        db.flush()

    old_qty = stock.available_qty
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
    return {"message": "Stock adjusted successfully", "old_qty": old_qty, "new_qty": stock.available_qty}


# ---------------- TRANSFER ----------------
@router.get("/stores")
def get_stores(db: Session = Depends(get_db)):
    """Get all stores for transfer dropdown"""
    from models.tenant_models import Store
    stores = db.query(Store).filter(Store.is_active == True).all()
    return [{"id": store.id, "name": store.name, "code": store.code} for store in stores]

@router.post("/transfer")
def transfer_stock(data: StockTransferCreate, db: Session = Depends(get_db)):
    # For internal transfers, we don't decrease total stock - just move between locations
    stock = db.query(Stock).filter(Stock.item_name == data.item_name).first()
    if not stock:
        raise HTTPException(400, "Stock record not found for this item")
    
    # Check if sufficient stock is available (for validation only)
    if stock.available_qty < data.qty:
        raise HTTPException(400, "Insufficient stock for transfer")
    
    # Create transfer record
    transfer = StockTransfer(
        stock_id=stock.id,
        from_store=data.from_store,
        to_store=data.to_store,
        qty=data.qty,
        batch_no=data.batch_no,
        transport_mode=data.transport_mode,
        remarks=data.remarks,
        status="COMPLETED"
    )
    
    # For internal transfers, stock quantities remain the same
    # Only create ledger entries to track the movement
    
    # Create ledger entry for the transfer
    ledger = StockLedger(
        stock_id=stock.id,
        txn_type="TRANSFER",
        qty_in=0,  # No change in total stock
        qty_out=0,  # No change in total stock
        balance=stock.available_qty,  # Balance remains same
        ref_no=f"TRF-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        remarks=f"Internal transfer: {data.qty} units from {data.from_store} to {data.to_store}"
    )
    
    db.add(transfer)
    db.add(ledger)
    db.commit()
    return {"message": f"Stock transferred successfully: {data.qty} units moved from {data.from_store} to {data.to_store}"}

@router.get("/transfers")
def list_transfers(db: Session = Depends(get_db)):
    """List all stock transfers"""
    transfers = db.query(StockTransfer).order_by(StockTransfer.created_at.desc()).all()
    return transfers


# ---------------- ISSUE ----------------
@router.get("/departments")
def get_departments(db: Session = Depends(get_db)):
    """Get all departments for stock issue dropdown"""
    departments = db.query(Department).filter(Department.is_active == True).all()
    return [{"id": dept.id, "name": dept.name} for dept in departments]

@router.post("/issue")
def issue_stock(data: StockIssueCreate, db: Session = Depends(get_db)):
    # Validate stock availability
    stock = db.query(Stock).filter(Stock.item_name == data.item_name).first()
    if not stock or stock.available_qty < data.qty:
        raise HTTPException(400, "Insufficient stock for issue")
    
    # Create issue record
    issue = StockIssue(
        issue_no=f"ISS-{int(datetime.utcnow().timestamp())}",
        stock_id=stock.id,
        department=data.department,
        requested_by=data.requested_by,
        qty=data.qty,
        batch_no=data.batch_no,
        reason=data.reason,
        status="ISSUED"
    )
    
    # Update stock quantities
    stock.available_qty -= data.qty
    
    # Create ledger entry
    ledger = StockLedger(
        stock_id=stock.id,
        txn_type="ISSUE",
        qty_out=data.qty,
        balance=stock.available_qty,
        ref_no=issue.issue_no,
        remarks=f"Issued to {data.department} - {data.reason}"
    )
    
    db.add(issue)
    db.add(ledger)
    db.commit()
    return {"message": "Stock issued successfully", "issue_no": issue.issue_no}

@router.get("/issues")
def list_issues(db: Session = Depends(get_db)):
    """List all stock issues"""
    issues = db.query(StockIssue).order_by(StockIssue.created_at.desc()).all()
    return issues

# ---------------- DASHBOARD & ALERTS ----------------
@router.get("/dashboard")
def stock_dashboard(db: Session = Depends(get_db)):
    """Real-time stock dashboard with alerts"""
    from models.tenant_models import GRN, GRNStatus
    
    # Get all items with stock data
    items = db.query(Item).filter(Item.is_active == True).all()
    
    low_stock_alerts = []
    expiry_alerts = []
    stock_movements = []
    
    for item in items:
        # Calculate current stock from approved GRNs
        approved_grn_items = db.query(GRNItem).join(GRN).filter(
            GRNItem.item_name == item.name,
            GRN.status == GRNStatus.approved
        ).all()
        
        current_qty = sum(grn_item.received_qty for grn_item in approved_grn_items)
        
        # Subtract issued quantities
        issued_qty = db.query(func.sum(StockIssue.qty)).filter(
            StockIssue.stock_id.in_(
                db.query(Stock.id).filter(Stock.item_name == item.name)
            )
        ).scalar() or 0
        
        available_qty = current_qty - issued_qty
        
        # Check for low stock alerts
        if item.min_stock and available_qty <= item.min_stock:
            low_stock_alerts.append({
                "item_name": item.name,
                "current_qty": available_qty,
                "min_stock": item.min_stock,
                "shortage": item.min_stock - available_qty
            })
        
        # Check for expiry alerts (items expiring in next 30 days)
        expiring_batches = db.query(Batch).join(GRNItem).join(GRN).filter(
            GRNItem.item_name == item.name,
            GRN.status == GRNStatus.approved,
            Batch.expiry_date <= date.today() + timedelta(days=30),
            Batch.expiry_date >= date.today()
        ).all()
        
        for batch in expiring_batches:
            days_to_expiry = (batch.expiry_date - date.today()).days
            expiry_alerts.append({
                "item_name": item.name,
                "batch_no": batch.batch_no,
                "expiry_date": batch.expiry_date,
                "days_to_expiry": days_to_expiry,
                "qty": batch.qty
            })
    
    # Get recent stock movements
    recent_movements = db.query(StockLedger).order_by(
        StockLedger.created_at.desc()
    ).limit(10).all()
    
    for movement in recent_movements:
        stock = db.query(Stock).filter(Stock.id == movement.stock_id).first()
        stock_movements.append({
            "item_name": stock.item_name if stock else "Unknown",
            "txn_type": movement.txn_type,
            "qty_in": movement.qty_in,
            "qty_out": movement.qty_out,
            "balance": movement.balance,
            "created_at": movement.created_at,
            "remarks": movement.remarks
        })
    
    return {
        "low_stock_alerts": low_stock_alerts,
        "expiry_alerts": expiry_alerts,
        "stock_movements": stock_movements,
        "summary": {
            "total_items": len(items),
            "low_stock_count": len(low_stock_alerts),
            "expiry_alerts_count": len(expiry_alerts)
        }
    }

@router.get("/alerts")
def get_alerts(db: Session = Depends(get_db)):
    """Get all stock alerts"""
    dashboard_data = stock_dashboard(db)
    return {
        "reorder_alerts": dashboard_data["low_stock_alerts"],
        "expiry_alerts": dashboard_data["expiry_alerts"]
    }

@router.get("/movements")
def get_stock_movements(limit: int = 50, db: Session = Depends(get_db)):
    """Get stock movement history"""
    movements = db.query(StockLedger).order_by(
        StockLedger.created_at.desc()
    ).limit(limit).all()
    
    result = []
    for movement in movements:
        stock = db.query(Stock).filter(Stock.id == movement.stock_id).first()
        result.append({
            "item_name": stock.item_name if stock else "Unknown",
            "txn_type": movement.txn_type,
            "qty_in": movement.qty_in,
            "qty_out": movement.qty_out,
            "balance": movement.balance,
            "created_at": movement.created_at,
            "remarks": movement.remarks,
            "ref_no": movement.ref_no
        })
    
    return result