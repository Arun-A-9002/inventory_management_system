from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_tenant_db
from models.tenant_models import StockOverview

router = APIRouter(prefix="/stock-overview", tags=["Stock Overview"])

@router.get("/")
def get_all_stock_overview(db: Session = Depends(get_tenant_db)):
    """Get all stock overview records from GRN batches"""
    from models.tenant_models import Item, GRN, GRNItem, Batch, GRNStatus
    
    # Get all active items
    items = db.query(Item).filter(Item.is_active == True).all()
    
    result = []
    for item in items:
        # Get all batches for this item from approved GRNs
        approved_grn_items = db.query(GRNItem).join(GRN).filter(
            GRNItem.item_name == item.name,
            GRN.status == GRNStatus.approved
        ).all()
        
        # Get all batches for this item
        all_batches = []
        total_qty = 0
        
        for grn_item in approved_grn_items:
            grn = db.query(GRN).filter(GRN.id == grn_item.grn_id).first()
            batches = db.query(Batch).filter(Batch.grn_item_id == grn_item.id).all()
            for batch in batches:
                # Check if batch has warranty dates
                warranty_info = None
                if hasattr(batch, 'warranty_start_date') and hasattr(batch, 'warranty_end_date'):
                    if batch.warranty_start_date and batch.warranty_end_date:
                        warranty_info = {
                            "start_date": batch.warranty_start_date.strftime("%d/%m/%Y"),
                            "end_date": batch.warranty_end_date.strftime("%d/%m/%Y")
                        }
                
                batch_info = {
                    "batch_no": batch.batch_no,
                    "qty": batch.qty,
                    "expiry_date": batch.expiry_date.strftime("%d/%m/%Y") if batch.expiry_date else None,
                    "mfg_date": batch.mfg_date.strftime("%d/%m/%Y") if batch.mfg_date else None,
                    "location": grn.store if grn else "Main Store",
                    "warranty": warranty_info
                }
                all_batches.append(batch_info)
                total_qty += batch.qty
        
        # Get location from the latest approved GRN
        latest_grn = db.query(GRN).join(GRNItem).filter(
            GRNItem.item_name == item.name,
            GRN.status == GRNStatus.approved
        ).order_by(GRN.grn_date.desc()).first()
        
        location = latest_grn.store if latest_grn else "Main Store"
        
        # Determine status
        status = "Good" if total_qty > item.min_stock else "Low Stock"
        
        # If there are batches, show the first batch info by default
        default_batch = all_batches[0] if all_batches else None
        
        result.append({
            "id": item.id,
            "item_name": item.name,
            "item_code": item.item_code,
            "location": location,
            "available_qty": int(total_qty),
            "min_stock": item.min_stock or 0,
            "warranty": "—",
            "batch_no": default_batch["batch_no"] if default_batch else "—",
            "expiry_date": default_batch["expiry_date"] if default_batch and default_batch["expiry_date"] else "—",
            "status": status,
            "batches": all_batches
        })
    
    return result

@router.get("/by-location/{location_name}")
def get_stock_by_location(location_name: str, db: Session = Depends(get_tenant_db)):
    """Get stock overview records filtered by location"""
    from models.tenant_models import Item, GRN, GRNItem, Batch, GRNStatus
    
    # Get all active items that have stock in the specified location
    items = db.query(Item).filter(Item.is_active == True).all()
    
    result = []
    for item in items:
        # Get batches for this item from approved GRNs in the specified location
        approved_grn_items = db.query(GRNItem).join(GRN).filter(
            GRNItem.item_name == item.name,
            GRN.status == GRNStatus.approved,
            GRN.store == location_name
        ).all()
        
        if not approved_grn_items:
            continue  # Skip items not in this location
        
        # Get all batches for this item in this location
        location_batches = []
        total_qty = 0
        
        for grn_item in approved_grn_items:
            batches = db.query(Batch).filter(Batch.grn_item_id == grn_item.id, Batch.qty > 0).all()
            for batch in batches:
                batch_info = {
                    "batch_no": batch.batch_no,
                    "qty": batch.qty,
                    "expiry_date": batch.expiry_date.strftime("%d/%m/%Y") if batch.expiry_date else None,
                    "mfg_date": batch.mfg_date.strftime("%d/%m/%Y") if batch.mfg_date else None,
                    "location": location_name,
                    "rate": float(item.mrp or item.fixing_price or 30)
                }
                location_batches.append(batch_info)
                total_qty += batch.qty
        
        if total_qty > 0:  # Only include items with available stock
            result.append({
                "id": item.id,
                "item_name": item.name,
                "item_code": item.item_code,
                "location": location_name,
                "available_qty": int(total_qty),
                "min_stock": item.min_stock or 0,
                "status": "Good" if total_qty > (item.min_stock or 0) else "Low Stock",
                "batches": location_batches
            })
    
    return result

@router.put("/increase-stock/{batch_no}")
def increase_stock_by_batch(batch_no: str, quantity: int, db: Session = Depends(get_tenant_db)):
    """Increase stock quantity for items with specific batch number"""
    stocks = db.query(StockOverview).filter(StockOverview.batch_no == batch_no).all()
    if not stocks:
        raise HTTPException(status_code=404, detail=f"No items found with batch number {batch_no}")
    
    updated_items = []
    for stock in stocks:
        stock.available_qty += quantity
        # Update status based on new quantity
        if stock.available_qty >= stock.min_stock:
            stock.status = "Good"
        else:
            stock.status = "Low Stock"
        updated_items.append(stock.item_name)
    
    db.commit()
    return {"message": f"Increased stock by {quantity} for {len(stocks)} items", "items": updated_items}

@router.get("/batches/{item_name}")
def get_item_batches(item_name: str, db: Session = Depends(get_tenant_db)):
    """Get all batch numbers for a specific item"""
    batches = db.query(StockOverview.batch_no).filter(
        StockOverview.item_name == item_name,
        StockOverview.batch_no.isnot(None),
        StockOverview.batch_no != ""
    ).distinct().all()
    return [batch[0] for batch in batches if batch[0]]

@router.post("/dispense/{item_id}")
def dispense_stock(item_id: int, batch_index: int, quantity: int, db: Session = Depends(get_tenant_db)):
    """Dispense stock from a specific batch"""
    from models.tenant_models import Item, GRN, GRNItem, Batch, GRNStatus
    
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    approved_grn_items = db.query(GRNItem).join(GRN).filter(
        GRNItem.item_name == item.name,
        GRN.status == GRNStatus.approved
    ).all()
    
    all_batches = []
    for grn_item in approved_grn_items:
        batches = db.query(Batch).filter(Batch.grn_item_id == grn_item.id).all()
        all_batches.extend(batches)
    
    if batch_index >= len(all_batches):
        raise HTTPException(status_code=404, detail="Batch not found")
    
    target_batch = all_batches[batch_index]
    
    if target_batch.qty < quantity:
        raise HTTPException(status_code=400, detail="Insufficient quantity in batch")
    
    target_batch.qty -= quantity
    
    if target_batch.qty == 0:
        db.delete(target_batch)
    
    db.commit()
    
    return {"message": f"Dispensed {quantity} units from batch {target_batch.batch_no}"}

@router.post("/create-test-batches")
def create_test_batches(db: Session = Depends(get_tenant_db)):
    """Create test batch data for Paracetamol"""
    
    # Clear existing Paracetamol records
    db.query(StockOverview).filter(StockOverview.item_name == "Paracetamol 500mg").delete()
    
    # Create batch records
    batch1 = StockOverview(
        item_name="Paracetamol 500mg",
        item_code="PARA500", 
        location="Main Store",
        available_qty=300,
        min_stock=100,
        batch_no="BATCH-001",
        expiry_date="31/12/2026",
        status="Good"
    )
    
    batch2 = StockOverview(
        item_name="Paracetamol 500mg",
        item_code="PARA500",
        location="Main Store", 
        available_qty=200,
        min_stock=100,
        batch_no="BATCH-002",
        expiry_date="30/06/2027",
        status="Good"
    )
    
    db.add(batch1)
    db.add(batch2)
    db.commit()
    
    return {"message": "Test batches created"}