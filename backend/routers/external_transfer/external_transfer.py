from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import List
from datetime import datetime

from database import get_tenant_db
from models.tenant_models import ExternalTransfer, ExternalTransferItem, ExternalTransferStatus
from schemas.tenant_schemas import (
    ExternalTransferCreate,
    ExternalTransferUpdate,
    ExternalTransferResponse,
    ExternalTransferReturn
)

router = APIRouter(prefix="/api/external-transfers", tags=["External Transfers"])

def generate_transfer_no():
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"ET{timestamp}"

@router.post("/", response_model=ExternalTransferResponse)
def create_external_transfer(transfer_data: ExternalTransferCreate, db: Session = Depends(get_tenant_db)):
    try:
        print(f"Creating transfer with data: {transfer_data}")
        
        transfer = ExternalTransfer(
            transfer_no=generate_transfer_no(),
            location=transfer_data.location,
            staff_name=transfer_data.staff_name,
            staff_id=transfer_data.staff_id,
            staff_location=transfer_data.staff_location,
            reason=transfer_data.reason
        )
        db.add(transfer)
        db.flush()
        print(f"Transfer created with ID: {transfer.id}")
        
        for item_data in transfer_data.items:
            item = ExternalTransferItem(
                transfer_id=transfer.id,
                item_name=item_data.item_name,
                batch_no=item_data.batch_no,
                quantity=item_data.quantity,
                reason=item_data.reason,
                return_date=item_data.return_date
            )
            db.add(item)
            print(f"Added item: {item_data.item_name}")
        
        db.commit()
        db.refresh(transfer)
        print(f"Transfer committed successfully: {transfer.transfer_no}")
        return transfer
    except Exception as e:
        print(f"Error creating transfer: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/test")
def test_endpoint():
    return {"message": "API working", "status": "ok"}

@router.get("/debug/stock/{location}")
def debug_stock_for_location(location: str, db: Session = Depends(get_tenant_db)):
    try:
        # Get all stock for this location
        stock_records = db.execute(text("""
            SELECT id, item_name, location, batch_no, available_qty 
            FROM stock_overview 
            WHERE location = :location
        """), {"location": location}).fetchall()
        
        return {
            "location": location,
            "stock_count": len(stock_records),
            "items": [{
                "id": record.id,
                "item_name": record.item_name,
                "location": record.location,
                "batch_no": record.batch_no,
                "available_qty": record.available_qty
            } for record in stock_records]
        }
    except Exception as e:
        return {"error": str(e)}

@router.get("/debug/transfer/{transfer_id}")
def debug_transfer_items(transfer_id: int, db: Session = Depends(get_tenant_db)):
    try:
        transfer = db.query(ExternalTransfer).filter(ExternalTransfer.id == transfer_id).first()
        if not transfer:
            return {"error": "Transfer not found"}
        
        return {
            "transfer_id": transfer.id,
            "location": transfer.location,
            "items": [{
                "id": item.id,
                "item_name": item.item_name,
                "batch_no": item.batch_no,
                "quantity": item.quantity
            } for item in transfer.items]
        }
    except Exception as e:
        return {"error": str(e)}

@router.get("/", response_model=List[ExternalTransferResponse])
def get_external_transfers(db: Session = Depends(get_tenant_db)):
    try:
        transfers = db.query(ExternalTransfer).all()
        print(f"Found {len(transfers)} transfers")
        return transfers
    except Exception as e:
        print(f"Error fetching transfers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{transfer_id}/send")
def send_transfer(transfer_id: int, db: Session = Depends(get_tenant_db)):
    try:
        transfer = db.query(ExternalTransfer).filter(ExternalTransfer.id == transfer_id).first()
        if not transfer:
            raise HTTPException(status_code=404, detail="Transfer not found")
        
        if transfer.status != ExternalTransferStatus.DRAFT:
            raise HTTPException(status_code=400, detail="Can only send draft transfers")
        
        # Reduce stock for each item
        for item in transfer.items:
            print(f"Processing item: {item.item_name}, location: {transfer.location}, batch: {item.batch_no}")
            
            # Find the actual batch record in the GRN system
            from models.tenant_models import Item, GRN, GRNItem, Batch, GRNStatus
            
            # First, check what GRN stores exist for this item
            available_stores = db.query(GRN.store).join(GRNItem).filter(
                GRNItem.item_name == item.item_name,
                GRN.status == GRNStatus.approved
            ).distinct().all()
            print(f"Available stores for {item.item_name}: {[store[0] for store in available_stores]}")
            
            # Try exact match first
            batch_record = db.query(Batch).join(GRNItem).join(GRN).filter(
                GRNItem.item_name == item.item_name,
                Batch.batch_no == item.batch_no,
                GRN.status == GRNStatus.approved,
                GRN.store == transfer.location,
                Batch.qty >= item.quantity
            ).first()
            
            # If not found, try case-insensitive match
            if not batch_record:
                batch_record = db.query(Batch).join(GRNItem).join(GRN).filter(
                    GRNItem.item_name == item.item_name,
                    Batch.batch_no == item.batch_no,
                    GRN.status == GRNStatus.approved,
                    func.lower(GRN.store) == func.lower(transfer.location),
                    Batch.qty >= item.quantity
                ).first()
            
            # If still not found, try any location with this item and batch
            if not batch_record:
                batch_record = db.query(Batch).join(GRNItem).join(GRN).filter(
                    GRNItem.item_name == item.item_name,
                    Batch.batch_no == item.batch_no,
                    GRN.status == GRNStatus.approved,
                    Batch.qty >= item.quantity
                ).first()
                
                if batch_record:
                    # Update transfer location to match where item actually exists
                    actual_grn = db.query(GRN).join(GRNItem).join(Batch).filter(
                        Batch.id == batch_record.id
                    ).first()
                    if actual_grn:
                        print(f"Item found at {actual_grn.store}, updating transfer location from {transfer.location}")
                        transfer.location = actual_grn.store
            
            if not batch_record:
                raise HTTPException(
                    status_code=400,
                    detail=f"No suitable batch found for {item.item_name} with batch {item.batch_no} and sufficient quantity ({item.quantity}). Available stores: {[store[0] for store in available_stores]}"
                )
            
            # Check if we have enough quantity
            if batch_record.qty < item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock in batch {batch_record.batch_no} for {item.item_name}. Available: {batch_record.qty}, Required: {item.quantity}"
                )
            
            # Reduce quantity from the actual batch
            old_qty = batch_record.qty
            batch_record.qty = batch_record.qty - item.quantity
            print(f"SUCCESS: Reduced batch {batch_record.batch_no} for {item.item_name} from {old_qty} to {batch_record.qty}")
            
            # Create stock ledger entry using the batch record ID
            try:
                db.execute(text("""
                    INSERT INTO stock_ledger (stock_id, batch_no, txn_type, qty_out, balance, ref_no, remarks, created_at)
                    VALUES (:stock_id, :batch_no, 'ISSUE', :qty_out, :balance, :ref_no, :remarks, NOW())
                """), {
                    "stock_id": batch_record.id,
                    "batch_no": item.batch_no,
                    "qty_out": item.quantity,
                    "balance": batch_record.qty,
                    "ref_no": transfer.transfer_no,
                    "remarks": f"External transfer to {transfer.staff_name}"
                })
            except Exception as ledger_error:
                print(f"Warning: Could not create ledger entry: {ledger_error}")
        
        # Update transfer status
        transfer.status = ExternalTransferStatus.SENT
        transfer.sent_at = datetime.now()
        
        db.commit()
        print(f"COMMITTED: Transfer {transfer.transfer_no} sent successfully")
        db.refresh(transfer)
        return {"message": "Transfer sent and stock updated successfully", "transfer": transfer}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{transfer_id}/return", response_model=ExternalTransferResponse)
def return_transfer(transfer_id: int, return_data: ExternalTransferReturn, db: Session = Depends(get_tenant_db)):
    try:
        transfer = db.query(ExternalTransfer).filter(ExternalTransfer.id == transfer_id).first()
        if not transfer:
            raise HTTPException(status_code=404, detail="Transfer not found")
        
        if transfer.status != ExternalTransferStatus.SENT:
            raise HTTPException(status_code=400, detail="Can only return sent transfers")
        
        # Update return quantities for each item
        for return_item in return_data.items:
            item = db.query(ExternalTransferItem).filter(
                ExternalTransferItem.id == return_item.item_id,
                ExternalTransferItem.transfer_id == transfer_id
            ).first()
            
            if not item:
                continue
                
            # Validate return quantity
            total_returning = return_item.returned_quantity + return_item.damaged_quantity
            if total_returning > item.quantity:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Cannot return more than sent quantity for {item.item_name}"
                )
            
            # Update item with return data
            item.returned_quantity = return_item.returned_quantity
            item.damaged_quantity = return_item.damaged_quantity
            item.damage_reason = return_item.damage_reason
            
            # Add good items back to stock
            if return_item.returned_quantity > 0:
                print(f"Processing return for {item.item_name}, batch {item.batch_no}, quantity {return_item.returned_quantity}")
                print(f"Transfer location: {transfer.location}")
                
                # Find the batch record in the GRN system - must match exact location and batch
                from models.tenant_models import Item, GRN, GRNItem, Batch, GRNStatus
                
                # First try exact match with transfer location
                batch_record = db.query(Batch).join(GRNItem).join(GRN).filter(
                    GRNItem.item_name == item.item_name,
                    Batch.batch_no == item.batch_no,
                    GRN.status == GRNStatus.approved,
                    GRN.store == transfer.location
                ).first()
                
                print(f"Exact location match: {batch_record.id if batch_record else 'None'}")
                
                # If not found, try case-insensitive match
                if not batch_record:
                    batch_record = db.query(Batch).join(GRNItem).join(GRN).filter(
                        GRNItem.item_name == item.item_name,
                        Batch.batch_no == item.batch_no,
                        GRN.status == GRNStatus.approved,
                        func.lower(GRN.store) == func.lower(transfer.location)
                    ).first()
                    print(f"Case-insensitive match: {batch_record.id if batch_record else 'None'}")
                
                # If still not found, try fuzzy match but prefer same location
                if not batch_record:
                    batch_record = db.query(Batch).join(GRNItem).join(GRN).filter(
                        GRNItem.item_name == item.item_name,
                        Batch.batch_no == item.batch_no,
                        GRN.status == GRNStatus.approved
                    ).first()
                    print(f"Any location match: {batch_record.id if batch_record else 'None'}")
                    
                    if batch_record:
                        actual_grn = db.query(GRN).join(GRNItem).join(Batch).filter(
                            Batch.id == batch_record.id
                        ).first()
                        print(f"WARNING: Returning to different location. Transfer: {transfer.location}, Actual: {actual_grn.store if actual_grn else 'Unknown'}")
                
                if batch_record:
                    old_qty = batch_record.qty
                    batch_record.qty = batch_record.qty + return_item.returned_quantity
                    print(f"RETURN SUCCESS: Added {return_item.returned_quantity} back to batch {batch_record.batch_no} for {item.item_name}: {old_qty} -> {batch_record.qty}")
                    
                    # Verify the change
                    db.flush()
                    updated_batch = db.query(Batch).filter(Batch.id == batch_record.id).first()
                    print(f"VERIFICATION: Batch {updated_batch.batch_no} now has quantity {updated_batch.qty}")
                    
                    # Create stock ledger entry for return
                    try:
                        db.execute(text("""
                            INSERT INTO stock_ledger (stock_id, batch_no, txn_type, qty_in, balance, ref_no, remarks, created_at)
                            VALUES (:stock_id, :batch_no, 'ADJUST_IN', :qty_in, :balance, :ref_no, :remarks, NOW())
                        """), {
                            "stock_id": batch_record.id,
                            "batch_no": item.batch_no,
                            "qty_in": return_item.returned_quantity,
                            "balance": batch_record.qty,
                            "ref_no": transfer.transfer_no,
                            "remarks": f"Return from {transfer.staff_name}"
                        })
                        print(f"Created ledger entry for return")
                    except Exception as ledger_error:
                        print(f"Warning: Could not create return ledger entry: {ledger_error}")
                else:
                    print(f"ERROR: Could not find batch record to return {item.item_name} to")
            
            # Log damaged items separately
            if return_item.damaged_quantity > 0:
                print(f"Damaged items: {item.item_name} - Batch: {item.batch_no} - Qty: {return_item.damaged_quantity} - Reason: {return_item.damage_reason}")
        
        # Check if all items are fully returned
        all_returned = all(
            (item.returned_quantity + item.damaged_quantity) == item.quantity 
            for item in transfer.items
        )
        
        if all_returned:
            transfer.status = ExternalTransferStatus.RETURNED
            transfer.returned_at = datetime.now()
        
        db.commit()
        print(f"COMMITTED: Return processed for transfer {transfer.transfer_no}")
        
        # Final verification - check if batch quantities were actually updated
        for item in transfer.items:
            if item.returned_quantity > 0:
                from models.tenant_models import Batch, GRNItem, GRN, GRNStatus
                final_batch = db.query(Batch).join(GRNItem).join(GRN).filter(
                    GRNItem.item_name == item.item_name,
                    Batch.batch_no == item.batch_no,
                    GRN.status == GRNStatus.approved
                ).first()
                if final_batch:
                    print(f"FINAL CHECK: {item.item_name} batch {item.batch_no} final quantity: {final_batch.qty}")
        
        db.refresh(transfer)
        return transfer
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{transfer_id}", response_model=ExternalTransferResponse)
def update_external_transfer(transfer_id: int, transfer_data: ExternalTransferUpdate, db: Session = Depends(get_tenant_db)):
    try:
        transfer = db.query(ExternalTransfer).filter(ExternalTransfer.id == transfer_id).first()
        if not transfer:
            raise HTTPException(status_code=404, detail="Transfer not found")
        
        # Update basic fields
        if transfer_data.location is not None:
            transfer.location = transfer_data.location
        if transfer_data.staff_name is not None:
            transfer.staff_name = transfer_data.staff_name
        if transfer_data.staff_id is not None:
            transfer.staff_id = transfer_data.staff_id
        if transfer_data.staff_location is not None:
            transfer.staff_location = transfer_data.staff_location
        if transfer_data.reason is not None:
            transfer.reason = transfer_data.reason
        
        # Update items if provided
        if transfer_data.items is not None:
            # Delete existing items
            db.query(ExternalTransferItem).filter(ExternalTransferItem.transfer_id == transfer_id).delete()
            
            # Add new items
            for item_data in transfer_data.items:
                item = ExternalTransferItem(
                    transfer_id=transfer.id,
                    item_name=item_data.item_name,
                    batch_no=item_data.batch_no,
                    quantity=item_data.quantity,
                    reason=item_data.reason,
                    return_date=item_data.return_date
                )
                db.add(item)
        
        db.commit()
        db.refresh(transfer)
        return transfer
    except Exception as e:
        print(f"Error updating transfer: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/test-data")
def create_test_data(db: Session = Depends(get_tenant_db)):
    try:
        transfer = ExternalTransfer(
            transfer_no=generate_transfer_no(),
            location="Main Warehouse",
            staff_name="John Doe",
            staff_id="EMP001",
            staff_location="External Location",
            reason="Staff allocation to John Doe (ID: EMP001)"
        )
        db.add(transfer)
        db.flush()
        
        item = ExternalTransferItem(
            transfer_id=transfer.id,
            item_name="Test Item",
            batch_no="BATCH001",
            quantity=10,
            reason="Testing"
        )
        db.add(item)
        
        db.commit()
        return {"message": "Test data created", "transfer_no": transfer.transfer_no}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{transfer_id}/items")
def get_transfer_items(transfer_id: int, db: Session = Depends(get_tenant_db)):
    """Get transfer items for return processing"""
    from sqlalchemy import text
    
    result = db.execute(
        text("""
        SELECT id, transfer_id, item_name, batch_no, quantity, reason, 
               COALESCE(returned_quantity, 0) as returned_qty,
               COALESCE(damaged_quantity, 0) as damaged_qty,
               damage_reason
        FROM external_transfer_items 
        WHERE transfer_id = :transfer_id
        """),
        {"transfer_id": transfer_id}
    ).fetchall()
    
    items = []
    for row in result:
        items.append({
            "id": row[0],
            "return_id": row[1],
            "item_name": row[2],
            "batch_no": row[3],
            "qty": row[4],
            "uom": "PCS",
            "condition": "GOOD",
            "remarks": row[5],
            "status": "pending",
            "returned": bool(row[6] > 0),
            "returned_qty": float(row[6]) if row[6] else 0.0
        })
    
    return items

@router.post("/{transfer_id}/process-return")
def process_transfer_return(transfer_id: int, return_data: dict, db: Session = Depends(get_tenant_db)):
    """Process transfer item return - update returned quantity"""
    from sqlalchemy import text
    
    item_name = return_data.get('item_name')
    batch_no = return_data.get('batch_no')
    quantity = int(return_data.get('quantity', 0))
    
    # Get current returned quantity
    result = db.execute(
        text("SELECT returned_quantity, quantity FROM external_transfer_items WHERE transfer_id = :transfer_id AND item_name = :item_name AND batch_no = :batch_no"),
        {"transfer_id": transfer_id, "item_name": item_name, "batch_no": batch_no}
    ).fetchone()
    
    if not result:
        raise HTTPException(404, "Transfer item not found")
    
    current_returned = result[0] or 0
    original_qty = result[1]
    new_returned_qty = current_returned + quantity
    
    if new_returned_qty > original_qty:
        raise HTTPException(400, f"Cannot return {quantity} units. Maximum returnable: {original_qty - current_returned}")
    
    # Update returned quantity
    db.execute(
        text("UPDATE external_transfer_items SET returned_quantity = :new_qty WHERE transfer_id = :transfer_id AND item_name = :item_name AND batch_no = :batch_no"),
        {"new_qty": new_returned_qty, "transfer_id": transfer_id, "item_name": item_name, "batch_no": batch_no}
    )
    
    db.commit()
    
    return {
        "message": f"Successfully returned {quantity} units of {item_name} (batch {batch_no})",
        "total_returned_qty": new_returned_qty,
        "remaining_returnable": original_qty - new_returned_qty,
        "fully_returned": new_returned_qty >= original_qty
    }

@router.get("/{transfer_id}", response_model=ExternalTransferResponse)
def get_external_transfer(transfer_id: int, db: Session = Depends(get_tenant_db)):
    transfer = db.query(ExternalTransfer).filter(ExternalTransfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    return transfer