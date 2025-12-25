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

# ---------------- MIGRATION ----------------
@router.post("/migrate")
def migrate_stock_data(db: Session = Depends(get_db)):
    """Migrate all approved GRN data to stocks table with batch-based records"""
    try:
        # Clear existing stock data
        db.query(Stock).delete()
        db.query(StockLedger).delete()
        db.commit()
        
        # Get all approved GRNs
        from models.tenant_models import GRN, GRNStatus
        approved_grns = db.query(GRN).filter(GRN.status == GRNStatus.approved).all()
        
        stock_count = 0
        
        for grn in approved_grns:
            grn_items = db.query(GRNItem).filter(GRNItem.grn_id == grn.id).all()
            
            for item in grn_items:
                batches = db.query(Batch).filter(Batch.grn_item_id == item.id).all()
                
                for batch in batches:
                    stock = Stock(
                        item_name=item.item_name,
                        sku=batch.batch_no,
                        uom=item.uom or "PCS",
                        total_qty=batch.qty,
                        available_qty=batch.qty,
                        reserved_qty=0,
                        reorder_level=0
                    )
                    db.add(stock)
                    db.flush()
                    
                    ledger = StockLedger(
                        stock_id=stock.id,
                        txn_type="OPENING",
                        qty_in=batch.qty,
                        qty_out=0,
                        balance=stock.available_qty,
                        ref_no=grn.grn_number,
                        remarks=f"Migration: {grn.vendor_name} - Batch {batch.batch_no}"
                    )
                    db.add(ledger)
                    stock_count += 1
        
        db.commit()
        return {"message": f"Migration completed! Created {stock_count} stock records"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Migration failed: {str(e)}")


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

@router.get("/ledger")
def get_stock_ledger(db: Session = Depends(get_db)):
    """Get stock ledger with batch information from GRN data"""
    from models.tenant_models import GRN, GRNStatus
    
    ledger_entries = []
    
    # Get all approved GRNs with their items and batches
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

@router.post("/internal-transfer")
def internal_transfer(data: dict, db: Session = Depends(get_db)):
    """Handle internal stock transfer between locations with batch tracking"""
    from models.tenant_models import Item, GRN, GRNItem, Batch, GRNStatus
    
    item_name = data.get('item_name')
    batch_no = data.get('batch_no')
    quantity = int(data.get('quantity', 0))
    from_location = data.get('from_location')
    to_location = data.get('to_location')
    reason = data.get('reason', 'Internal transfer')
    
    if not all([item_name, batch_no, quantity, from_location, to_location]):
        raise HTTPException(400, "Missing required fields")
    
    print(f"DEBUG: Looking for item '{item_name}', batch '{batch_no}' in location '{from_location}'")
    
    # Find the source batch - try both store name and location name
    source_grn_item = db.query(GRNItem).join(GRN).filter(
        GRNItem.item_name == item_name,
        GRN.status == GRNStatus.approved,
        GRN.store.ilike(f"%{from_location}%")
    ).first()
    
    print(f"DEBUG: Found GRN item with flexible search: {source_grn_item is not None}")
    
    # If not found, try exact match or default "Main Store"
    if not source_grn_item:
        all_grn_items = db.query(GRNItem).join(GRN).filter(
            GRNItem.item_name == item_name,
            GRN.status == GRNStatus.approved
        ).all()
        
        print(f"DEBUG: Found {len(all_grn_items)} total approved GRN items for '{item_name}'")
        for grn_item in all_grn_items:
            grn = db.query(GRN).filter(GRN.id == grn_item.grn_id).first()
            print(f"DEBUG: GRN {grn.grn_number} has store: '{grn.store}'")
        
        # Use the first one as fallback
        source_grn_item = all_grn_items[0] if all_grn_items else None
    
    if not source_grn_item:
        raise HTTPException(404, f"No stock found for {item_name} in {from_location}")
    
    # Look for the batch across ALL GRN items for this item (not just location-specific)
    all_grn_items = db.query(GRNItem).join(GRN).filter(
        GRNItem.item_name == item_name,
        GRN.status == GRNStatus.approved
    ).all()
    
    source_batch = None
    source_grn_item_with_batch = None
    
    for grn_item in all_grn_items:
        batch = db.query(Batch).filter(
            Batch.grn_item_id == grn_item.id,
            Batch.batch_no == batch_no
        ).first()
        if batch:
            source_batch = batch
            source_grn_item_with_batch = grn_item
            break
    
    print(f"DEBUG: Found batch across all GRN items: {source_batch is not None}")
    if source_batch:
        print(f"DEBUG: Batch {batch_no} has quantity: {source_batch.qty}")
    else:
        # List all available batches for debugging
        all_batches = []
        for grn_item in all_grn_items:
            batches = db.query(Batch).filter(Batch.grn_item_id == grn_item.id).all()
            all_batches.extend([b.batch_no for b in batches])
        print(f"DEBUG: All available batches for {item_name}: {all_batches}")
    
    if not source_batch:
        raise HTTPException(404, f"Batch {batch_no} not found in {from_location}")
    
    if source_batch.qty < quantity:
        raise HTTPException(400, f"Insufficient quantity. Available: {source_batch.qty}, Requested: {quantity}")
    
    # Use the GRN item that actually has the batch
    source_grn_item = source_grn_item_with_batch
    
    # Reduce quantity from source batch
    source_batch.qty -= quantity
    
    # Find or create destination GRN for the target location
    dest_grn = db.query(GRN).filter(
        GRN.store.ilike(f"%{to_location}%"),
        GRN.status == GRNStatus.approved
    ).first()
    
    if not dest_grn:
        # Create a new GRN for the destination location
        dest_grn = GRN(
            grn_number=f"TRF-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            grn_date=date.today(),
            store=to_location,
            vendor_name="Internal Transfer",
            status=GRNStatus.approved
        )
        db.add(dest_grn)
        db.flush()
    
    # Find or create destination GRN item
    dest_grn_item = db.query(GRNItem).filter(
        GRNItem.grn_id == dest_grn.id,
        GRNItem.item_name == item_name
    ).first()
    
    if not dest_grn_item:
        dest_grn_item = GRNItem(
            grn_id=dest_grn.id,
            item_name=item_name,
            received_qty=0,
            uom=source_grn_item.uom
        )
        db.add(dest_grn_item)
        db.flush()
    
    # Check if batch already exists in destination
    dest_batch = db.query(Batch).filter(
        Batch.grn_item_id == dest_grn_item.id,
        Batch.batch_no == batch_no
    ).first()
    
    if dest_batch:
        # Add to existing batch
        dest_batch.qty += quantity
    else:
        # Create new batch in destination
        dest_batch = Batch(
            grn_item_id=dest_grn_item.id,
            batch_no=batch_no,
            qty=quantity,
            expiry_date=source_batch.expiry_date,
            mfg_date=source_batch.mfg_date
        )
        db.add(dest_batch)
    
    # Update GRN item quantities
    dest_grn_item.received_qty += quantity
    
    # Remove source batch if quantity becomes 0
    if source_batch.qty == 0:
        db.delete(source_batch)
        source_grn_item.received_qty -= quantity
    
    db.commit()
    
    return {
        "message": f"Successfully transferred {quantity} units of {item_name} (batch {batch_no}) from {from_location} to {to_location}"
    }
@router.get("/debug-batches")
def debug_batches(db: Session = Depends(get_db)):
    """Debug batch data"""
    from models.tenant_models import GRN, GRNStatus
    
    # Get all approved GRNs
    approved_grns = db.query(GRN).filter(GRN.status == GRNStatus.approved).all()
    
    debug_info = []
    for grn in approved_grns:
        grn_items = db.query(GRNItem).filter(GRNItem.grn_id == grn.id).all()
        
        for grn_item in grn_items:
            batches = db.query(Batch).filter(Batch.grn_item_id == grn_item.id).all()
            
            debug_info.append({
                "grn_number": grn.grn_number,
                "item_name": grn_item.item_name,
                "grn_item_id": grn_item.id,
                "batch_count": len(batches),
                "batches": [{
                    "batch_no": b.batch_no,
                    "qty": b.qty,
                    "expiry_date": str(b.expiry_date) if b.expiry_date else None,
                    "mfg_date": str(b.mfg_date) if b.mfg_date else None
                } for b in batches]
            })
    
    return debug_info
@router.post("/dispense")
def dispense_expired_stock(data: dict, db: Session = Depends(get_db)):
    """Dispense expired stock"""
    item_name = data.get('item_name')
    batch_no = data.get('batch_no')
    reason = data.get('reason', 'Expired item disposal')
    
    # Find stock record
    stock = db.query(Stock).filter(Stock.item_name == item_name).first()
    if not stock:
        raise HTTPException(404, "Stock record not found")
    
    # Create disposal record
    from models.tenant_models import DisposalTransaction, ItemConditionEnum, DisposalMethodEnum
    disposal = DisposalTransaction(
        transaction_no=f"DISP-{int(datetime.utcnow().timestamp())}",
        item_name=item_name,
        batch_no=batch_no,
        qty=0,  # Will be updated based on batch
        condition=ItemConditionEnum.EXPIRED,
        disposal_method=DisposalMethodEnum.INCINERATION,
        reason=reason,
        transaction_date=date.today()
    )
    
    # Update stock quantities (remove expired stock)
    # This is a simplified version - in real scenario you'd track batch-wise quantities
    
    # Create ledger entry
    ledger = StockLedger(
        stock_id=stock.id,
        batch_no=batch_no,
        txn_type="DISPOSAL",
        qty_out=0,  # Quantity to be determined
        balance=stock.available_qty,
        ref_no=disposal.transaction_no,
        remarks=f"Expired batch disposal: {reason}"
    )
    
    db.add(disposal)
    db.add(ledger)
    db.commit()
    
    return {"message": f"Expired batch {batch_no} marked for disposal"}