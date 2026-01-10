from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import List
from datetime import datetime, timedelta
import json
import io

from database import get_current_tenant_db_name, get_tenant_db
from models.tenant_models import ExternalTransfer, ExternalTransferItem, ExternalTransferStatus, AuditLog
from schemas.tenant_schemas import (
    ExternalTransferCreate,
    ExternalTransferUpdate,
    ExternalTransferResponse,
    ExternalTransferReturn
)
from utils.permissions import (
    require_external_transfer_create, require_external_transfer_view, 
    require_external_transfer_print, require_external_transfer_download, 
    require_external_transfer_return, require_damaged_returns_view
)
from utils.universal_pdf_generator import UniversalPDFGenerator
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/external-transfers", tags=["External Transfers"])

def get_db(tenant_db_name: str = Depends(get_current_tenant_db_name())):
    yield from get_tenant_db(tenant_db_name)

def generate_transfer_no():
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"ET{timestamp}"

@router.post("/", response_model=ExternalTransferResponse)
def create_external_transfer(transfer_data: ExternalTransferCreate, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_external_transfer_create())):
    try:
        print(f"Creating transfer with data: {transfer_data}")
        
        transfer = ExternalTransfer(
            transfer_no=generate_transfer_no(),
            location=transfer_data.location,
            staff_name=transfer_data.staff_name,
            staff_id=transfer_data.staff_id,
            staff_location=transfer_data.staff_location,
            staff_phone=transfer_data.staff_phone,
            staff_email=transfer_data.staff_email,
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
        
        # Create audit log
        user_name = current_user.get('full_name') or current_user.get('email') or 'System'
        audit_log = AuditLog(
            user_id=current_user.get('id'),
            user_name=user_name,
            action="CREATE",
            table_name="external_transfers",
            record_id=transfer.id,
            new_values=json.dumps({
                "transfer_no": transfer.transfer_no,
                "location": transfer.location,
                "staff_name": transfer.staff_name,
                "staff_id": transfer.staff_id,
                "items_count": len(transfer_data.items)
            }),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get('user-agent'),
            module="EXTERNAL_TRANSFER",
            description=f"Created external transfer {transfer.transfer_no} for {transfer.staff_name}"
        )
        db.add(audit_log)
        
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
def debug_stock_for_location(location: str, db: Session = Depends(get_db)):
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
def debug_transfer_items(transfer_id: int, db: Session = Depends(get_db)):
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
def get_external_transfers(db: Session = Depends(get_db), current_user: dict = Depends(require_external_transfer_view())):
    try:
        transfers = db.query(ExternalTransfer).all()
        print(f"Found {len(transfers)} transfers")
        return transfers
    except Exception as e:
        print(f"Error fetching transfers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{transfer_id}/send")
def send_transfer(transfer_id: int, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_external_transfer_create())):
    try:
        transfer = db.query(ExternalTransfer).filter(ExternalTransfer.id == transfer_id).first()
        if not transfer:
            raise HTTPException(status_code=404, detail="Transfer not found")
        
        if transfer.status != ExternalTransferStatus.DRAFT:
            raise HTTPException(status_code=400, detail="Can only send draft transfers")
        
        # Store old status for audit
        old_status = transfer.status
        
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
            
            batch_record = None
            
            # If batch_no is empty or None, find any available batch
            if not item.batch_no or item.batch_no.strip() == "":
                print(f"Empty batch number, finding any available batch for {item.item_name}")
                batch_record = db.query(Batch).join(GRNItem).join(GRN).filter(
                    GRNItem.item_name == item.item_name,
                    GRN.status == GRNStatus.approved,
                    GRN.store == transfer.location,
                    Batch.qty >= item.quantity
                ).first()
                
                if batch_record:
                    # Update the item with the found batch number
                    item.batch_no = batch_record.batch_no
                    print(f"Found batch {batch_record.batch_no} for {item.item_name}")
            else:
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
        
        # Create audit log
        user_name = current_user.get('full_name') or current_user.get('email') or 'System'
        audit_log = AuditLog(
            user_id=current_user.get('id'),
            user_name=user_name,
            action="SEND",
            table_name="external_transfers",
            record_id=transfer.id,
            old_values=json.dumps({"status": old_status.value}),
            new_values=json.dumps({"status": transfer.status.value, "sent_at": transfer.sent_at.isoformat()}),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get('user-agent'),
            module="EXTERNAL_TRANSFER",
            description=f"Sent external transfer {transfer.transfer_no} to {transfer.staff_name}"
        )
        db.add(audit_log)
        
        db.commit()
        print(f"COMMITTED: Transfer {transfer.transfer_no} sent successfully")
        db.refresh(transfer)
        return {"message": "Transfer sent and stock updated successfully", "transfer": transfer}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{transfer_id}/return")
def return_transfer(transfer_id: int, return_data: dict, request: Request, db: Session = Depends(get_db), current_user: dict = Depends(require_external_transfer_return())):
    try:
        print(f"DEBUG: Raw return_data received: {return_data}")
        
        transfer = db.query(ExternalTransfer).filter(ExternalTransfer.id == transfer_id).first()
        if not transfer:
            raise HTTPException(status_code=404, detail="Transfer not found")
        
        if transfer.status != ExternalTransferStatus.SENT:
            raise HTTPException(status_code=400, detail="Can only return sent transfers")
        
        # Store old status for audit
        old_status = transfer.status
        
        # Update transfer with contact info, deadline, and return staff details
        if hasattr(return_data, 'staff_phone') and return_data.staff_phone:
            transfer.staff_phone = return_data.staff_phone
        if hasattr(return_data, 'staff_email') and return_data.staff_email:
            transfer.staff_email = return_data.staff_email
        if hasattr(return_data, 'return_deadline') and return_data.return_deadline:
            transfer.return_deadline = return_data.return_deadline
        
        # Store return staff details from nested object
        staff_details = return_data.get('return_staff_details', {})
        if staff_details.get('staff_name'):
            transfer.return_staff_name = staff_details['staff_name']
        if staff_details.get('staff_phone'):
            transfer.return_staff_phone = staff_details['staff_phone']
        if staff_details.get('staff_email'):
            transfer.return_staff_email = staff_details['staff_email']
        if staff_details.get('change_reason'):
            transfer.staff_change_reason = staff_details['change_reason']
        
        # Update return quantities for each item
        for return_item_data in return_data.get('items', []):
            item = db.query(ExternalTransferItem).filter(
                ExternalTransferItem.id == return_item_data['item_id'],
                ExternalTransferItem.transfer_id == transfer_id
            ).first()
            
            if not item:
                continue
                
            # Update item with return data - use additive logic
            current_returned = item.returned_quantity or 0
            current_damaged = item.damaged_quantity or 0
            
            new_returned = current_returned + return_item_data.get('returned_quantity', 0)
            new_damaged = current_damaged + return_item_data.get('damaged_quantity', 0)
            
            # Validate total return quantity
            total_returning = new_returned + new_damaged
            if total_returning > item.quantity:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Cannot return more than sent quantity for {item.item_name}. Trying to return {total_returning}, but only {item.quantity} was sent."
                )
            
            # Update item with new totals and return date
            item.returned_quantity = new_returned
            item.damaged_quantity = new_damaged
            item.damage_reason = return_item_data.get('damage_reason')
            
            # Update return_date if deadline is provided
            if return_item_data.get('return_deadline'):
                item.return_date = return_item_data['return_deadline']
            
            # Set return date for items being returned
            if return_item_data.get('returned_quantity', 0) > 0 or return_item_data.get('damaged_quantity', 0) > 0:
                item.returned_at = datetime.now()
                
                # Log individual transactions with return staff info
                if return_item_data.get('returned_quantity', 0) > 0:
                    staff_details = return_data.get('return_staff_details', {})
                    return_staff_info = staff_details.get('staff_name') or transfer.staff_name
                    return_staff_phone = staff_details.get('staff_phone')
                    return_staff_email = staff_details.get('staff_email')
                    db.execute(text("""
                        INSERT INTO external_transfer_transactions 
                        (transfer_id, item_id, transaction_type, quantity, transaction_date, remarks, return_staff_name, return_staff_phone, return_staff_email)
                        VALUES (:transfer_id, :item_id, 'RETURN', :quantity, NOW(), :remarks, :return_staff_name, :return_staff_phone, :return_staff_email)
                    """), {
                        "transfer_id": transfer_id,
                        "item_id": item.id,
                        "quantity": return_item_data.get('returned_quantity', 0),
                        "remarks": f"Good return - {return_item_data.get('returned_quantity', 0)} units",
                        "return_staff_name": return_staff_info,
                        "return_staff_phone": return_staff_phone,
                        "return_staff_email": return_staff_email
                    })
                
                if return_item_data.get('damaged_quantity', 0) > 0:
                    staff_details = return_data.get('return_staff_details', {})
                    return_staff_info = staff_details.get('staff_name') or transfer.staff_name
                    return_staff_phone = staff_details.get('staff_phone')
                    return_staff_email = staff_details.get('staff_email')
                    db.execute(text("""
                        INSERT INTO external_transfer_transactions 
                        (transfer_id, item_id, transaction_type, quantity, transaction_date, remarks, return_staff_name, return_staff_phone, return_staff_email)
                        VALUES (:transfer_id, :item_id, 'DAMAGE', :quantity, NOW(), :remarks, :return_staff_name, :return_staff_phone, :return_staff_email)
                    """), {
                        "transfer_id": transfer_id,
                        "item_id": item.id,
                        "quantity": return_item_data.get('damaged_quantity', 0),
                        "remarks": f"Damaged return - {return_item_data.get('damage_reason') or 'No reason provided'}",
                        "return_staff_name": return_staff_info,
                        "return_staff_phone": return_staff_phone,
                        "return_staff_email": return_staff_email
                    })
            
            # Add good items back to stock
            if return_item_data.get('returned_quantity', 0) > 0:
                print(f"Processing return for {item.item_name}, batch {item.batch_no}, quantity {return_item_data.get('returned_quantity', 0)}")
                
                # Find the batch record in the GRN system
                from models.tenant_models import Item, GRN, GRNItem, Batch, GRNStatus
                
                batch_record = db.query(Batch).join(GRNItem).join(GRN).filter(
                    GRNItem.item_name == item.item_name,
                    Batch.batch_no == item.batch_no,
                    GRN.status == GRNStatus.approved,
                    GRN.store == transfer.location
                ).first()
                
                if not batch_record:
                    batch_record = db.query(Batch).join(GRNItem).join(GRN).filter(
                        GRNItem.item_name == item.item_name,
                        Batch.batch_no == item.batch_no,
                        GRN.status == GRNStatus.approved
                    ).first()
                
                if batch_record:
                    old_qty = batch_record.qty
                    batch_record.qty = batch_record.qty + return_item_data.get('returned_quantity', 0)
                    print(f"RETURN SUCCESS: Added {return_item_data.get('returned_quantity', 0)} back to batch {batch_record.batch_no} for {item.item_name}: {old_qty} -> {batch_record.qty}")
                    
                    # Create stock ledger entry for return
                    try:
                        db.execute(text("""
                            INSERT INTO stock_ledger (stock_id, batch_no, txn_type, qty_in, balance, ref_no, remarks, created_at)
                            VALUES (:stock_id, :batch_no, 'ADJUST_IN', :qty_in, :balance, :ref_no, :remarks, NOW())
                        """), {
                            "stock_id": batch_record.id,
                            "batch_no": item.batch_no,
                            "qty_in": return_item_data.get('returned_quantity', 0),
                            "balance": batch_record.qty,
                            "ref_no": transfer.transfer_no,
                            "remarks": f"Return from {transfer.staff_name}"
                        })
                    except Exception as ledger_error:
                        print(f"Warning: Could not create return ledger entry: {ledger_error}")
        
        # Check if all items are fully returned
        all_returned = all(
            (item.returned_quantity + item.damaged_quantity) == item.quantity 
            for item in transfer.items
        )
        
        if all_returned:
            transfer.status = ExternalTransferStatus.RETURNED
            transfer.returned_at = datetime.now()
        
        # Create audit log
        user_name = current_user.get('full_name') or current_user.get('email') or 'System'
        audit_log = AuditLog(
            user_id=current_user.get('id'),
            user_name=user_name,
            action="RETURN",
            table_name="external_transfers",
            record_id=transfer.id,
            old_values=json.dumps({"status": old_status.value}),
            new_values=json.dumps({
                "status": transfer.status.value,
                "return_staff_name": transfer.return_staff_name,
                "returned_at": transfer.returned_at.isoformat() if transfer.returned_at else None
            }),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get('user-agent'),
            module="EXTERNAL_TRANSFER",
            description=f"Processed return for transfer {transfer.transfer_no} by {transfer.return_staff_name or transfer.staff_name}"
        )
        db.add(audit_log)
        
        db.commit()
        print(f"COMMITTED: Return processed for transfer {transfer.transfer_no}")
        
        db.refresh(transfer)
        return transfer
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{transfer_id}", response_model=ExternalTransferResponse)
def update_external_transfer(transfer_id: int, transfer_data: ExternalTransferUpdate, db: Session = Depends(get_db)):
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
def create_test_data(db: Session = Depends(get_db)):
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
def get_transfer_items(transfer_id: int, db: Session = Depends(get_db)):
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
        returned_qty = float(row[6]) if row[6] is not None else 0.0
        damaged_qty = float(row[7]) if row[7] is not None else 0.0
        original_qty = float(row[4])
        
        print(f"DB FETCH - Item: {row[2]}, Original: {original_qty}, Returned: {returned_qty}, Damaged: {damaged_qty}")
        
        items.append({
            "id": row[0],
            "return_id": row[1],
            "item_name": row[2],
            "batch_no": row[3],
            "qty": original_qty,
            "uom": "PCS",
            "condition": "GOOD",
            "remarks": row[5],
            "status": "pending",
            "returned": bool(returned_qty > 0),
            "returned_qty": returned_qty,
            "damaged_qty": damaged_qty,
            "remaining_qty": original_qty - returned_qty - damaged_qty
        })
    
    print(f"RETURNING {len(items)} items to frontend")
    return items

@router.post("/{transfer_id}/process-return")
def process_transfer_return(transfer_id: int, return_data: dict, db: Session = Depends(get_db)):
    """Process transfer item return - update returned quantity additively"""
    from sqlalchemy import text
    
    item_name = return_data.get('item_name')
    batch_no = return_data.get('batch_no')
    quantity = int(return_data.get('quantity', 0))
    
    if quantity <= 0:
        raise HTTPException(400, "Return quantity must be greater than 0")
    
    # Get current returned quantity with explicit conversion
    result = db.execute(
        text("SELECT COALESCE(returned_quantity, 0) as returned_qty, quantity FROM external_transfer_items WHERE transfer_id = :transfer_id AND item_name = :item_name AND batch_no = :batch_no"),
        {"transfer_id": transfer_id, "item_name": item_name, "batch_no": batch_no}
    ).fetchone()
    
    if not result:
        raise HTTPException(404, "Transfer item not found")
    
    current_returned = float(result[0]) if result[0] is not None else 0.0
    original_qty = float(result[1])
    
    print(f"BEFORE UPDATE: Current returned: {current_returned}, Adding: {quantity}")
    
    # Use SQL to add the quantity directly in the database
    db.execute(
        text("UPDATE external_transfer_items SET returned_quantity = COALESCE(returned_quantity, 0) + :add_qty WHERE transfer_id = :transfer_id AND item_name = :item_name AND batch_no = :batch_no"),
        {"add_qty": quantity, "transfer_id": transfer_id, "item_name": item_name, "batch_no": batch_no}
    )
    
    # Get the updated value to verify
    verify_result = db.execute(
        text("SELECT returned_quantity FROM external_transfer_items WHERE transfer_id = :transfer_id AND item_name = :item_name AND batch_no = :batch_no"),
        {"transfer_id": transfer_id, "item_name": item_name, "batch_no": batch_no}
    ).fetchone()
    
    new_returned_qty = float(verify_result[0]) if verify_result and verify_result[0] is not None else 0.0
    
    print(f"AFTER UPDATE: New returned quantity: {new_returned_qty}")
    
    if new_returned_qty > original_qty:
        db.rollback()
        raise HTTPException(400, f"Cannot return {quantity} units. Current returned: {current_returned}, Maximum returnable: {original_qty - current_returned}")
    
    db.commit()
    
    return {
        "message": f"Successfully returned {quantity} units of {item_name} (batch {batch_no}). Total returned: {new_returned_qty}",
        "added_quantity": quantity,
        "total_returned_qty": new_returned_qty,
        "remaining_returnable": original_qty - new_returned_qty,
        "fully_returned": new_returned_qty >= original_qty
    }

@router.get("/damaged-returns")
def get_damaged_returns(
    start_date: str = None,
    end_date: str = None,
    staff_name: str = None,
    item_name: str = None,
    transfer_no: str = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_damaged_returns_view())
):
    """Get all damaged items from external transfers with optional filters"""
    from sqlalchemy import text
    
    # Build dynamic query with filters
    base_query = """
        SELECT 
            et.transfer_no,
            et.id as transfer_id,
            et.staff_name,
            et.staff_id,
            et.staff_location,
            et.location,
            et.returned_at,
            eti.item_name,
            eti.batch_no,
            eti.damaged_quantity,
            eti.damage_reason
        FROM external_transfers et
        JOIN external_transfer_items eti ON et.id = eti.transfer_id
        WHERE eti.damaged_quantity > 0
    """
    
    conditions = []
    params = {}
    
    if start_date:
        conditions.append("DATE(et.returned_at) >= :start_date")
        params["start_date"] = start_date
    
    if end_date:
        conditions.append("DATE(et.returned_at) <= :end_date")
        params["end_date"] = end_date
    
    if staff_name:
        conditions.append("LOWER(et.staff_name) LIKE LOWER(:staff_name)")
        params["staff_name"] = f"%{staff_name}%"
    
    if item_name:
        conditions.append("LOWER(eti.item_name) LIKE LOWER(:item_name)")
        params["item_name"] = f"%{item_name}%"
    
    if transfer_no:
        conditions.append("LOWER(et.transfer_no) LIKE LOWER(:transfer_no)")
        params["transfer_no"] = f"%{transfer_no}%"
    
    if conditions:
        base_query += " AND " + " AND ".join(conditions)
    
    base_query += " ORDER BY et.returned_at DESC, et.transfer_no DESC"
    
    result = db.execute(text(base_query), params).fetchall()
    
    damaged_items = []
    for row in result:
        damaged_items.append({
            "transfer_no": row[0],
            "transfer_id": row[1],
            "staff_name": row[2],
            "staff_id": row[3],
            "staff_location": row[4],
            "location": row[5],
            "returned_at": row[6],
            "item_name": row[7],
            "batch_no": row[8],
            "damaged_quantity": float(row[9]) if row[9] else 0.0,
            "damage_reason": row[10]
        })
    
    return damaged_items

@router.get("/damaged-returns/pdf")
def generate_damaged_returns_pdf(db: Session = Depends(get_db), current_user: dict = Depends(require_damaged_returns_view())):
    """Generate PDF for damaged returns with company header"""
    from utils.universal_pdf_generator import UniversalPDFGenerator
    from fastapi.responses import StreamingResponse
    import io
    
    try:
        # Get damaged returns data
        from sqlalchemy import text
        
        query = text("""
            SELECT 
                et.transfer_no,
                et.id as transfer_id,
                et.staff_name,
                et.staff_id,
                et.staff_location,
                et.location,
                et.returned_at,
                eti.item_name,
                eti.batch_no,
                eti.damaged_quantity,
                eti.damage_reason
            FROM external_transfers et
            JOIN external_transfer_items eti ON et.id = eti.transfer_id
            WHERE eti.damaged_quantity > 0
            ORDER BY et.returned_at DESC, et.transfer_no DESC
        """)
        
        result = db.execute(query).fetchall()
        
        # Prepare data for PDF
        headers = ['Transfer No', 'Item Name', 'Batch', 'Staff Name', 'Location', 'Qty', 'Reason', 'Date']
        data = []
        
        for row in result:
            data.append([
                row[0][:12],  # transfer_no (truncated)
                row[7][:15],  # item_name (truncated)
                row[8][:10] if row[8] else '-',  # batch_no (truncated)
                row[2][:12],  # staff_name (truncated)
                row[4][:10],  # staff_location (truncated)
                str(row[9]),  # damaged_quantity
                (row[10] or 'No reason')[:15],  # damage_reason (truncated)
                row[6].strftime('%d/%m/%Y') if row[6] else 'N/A'  # returned_at
            ])
        
        # Generate PDF using universal generator
        pdf_generator = UniversalPDFGenerator(db)
        title = "DAMAGED RETURNS REPORT"
        
        pdf_buffer = pdf_generator.create_pdf(
            title=title,
            data=data,
            headers=headers,
            filename="damaged_returns_report.pdf",
            column_widths=[0.9, 1.1, 0.7, 0.9, 0.8, 0.5, 1.1, 0.7]
        )
        
        return StreamingResponse(
            io.BytesIO(pdf_buffer.read()),
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=damaged_returns_report.pdf"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    """Get all damaged items from external transfers with optional filters"""
    from sqlalchemy import text
    
    # Build dynamic query with filters
    base_query = """
        SELECT 
            et.transfer_no,
            et.id as transfer_id,
            et.staff_name,
            et.staff_id,
            et.staff_location,
            et.location,
            et.returned_at,
            eti.item_name,
            eti.batch_no,
            eti.damaged_quantity,
            eti.damage_reason
        FROM external_transfers et
        JOIN external_transfer_items eti ON et.id = eti.transfer_id
        WHERE eti.damaged_quantity > 0
    """
    
    conditions = []
    params = {}
    
    if start_date:
        conditions.append("DATE(et.returned_at) >= :start_date")
        params["start_date"] = start_date
    
    if end_date:
        conditions.append("DATE(et.returned_at) <= :end_date")
        params["end_date"] = end_date
    
    if staff_name:
        conditions.append("LOWER(et.staff_name) LIKE LOWER(:staff_name)")
        params["staff_name"] = f"%{staff_name}%"
    
    if item_name:
        conditions.append("LOWER(eti.item_name) LIKE LOWER(:item_name)")
        params["item_name"] = f"%{item_name}%"
    
    if transfer_no:
        conditions.append("LOWER(et.transfer_no) LIKE LOWER(:transfer_no)")
        params["transfer_no"] = f"%{transfer_no}%"
    
    if conditions:
        base_query += " AND " + " AND ".join(conditions)
    
    base_query += " ORDER BY et.returned_at DESC, et.transfer_no DESC"
    
    result = db.execute(text(base_query), params).fetchall()
    
    damaged_items = []
    for row in result:
        damaged_items.append({
            "transfer_no": row[0],
            "transfer_id": row[1],
            "staff_name": row[2],
            "staff_id": row[3],
            "staff_location": row[4],
            "location": row[5],
            "returned_at": row[6],
            "item_name": row[7],
            "batch_no": row[8],
            "damaged_quantity": float(row[9]) if row[9] else 0.0,
            "damage_reason": row[10]
        })
    
    return damaged_items

@router.get("/{transfer_id}", response_model=ExternalTransferResponse)
def get_external_transfer(transfer_id: int, db: Session = Depends(get_db)):
    from sqlalchemy import text
    
    transfer = db.query(ExternalTransfer).filter(ExternalTransfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    # Get fresh item data with returned quantities
    items_result = db.execute(
        text("""
        SELECT id, item_name, batch_no, quantity, reason, return_date,
               COALESCE(returned_quantity, 0) as returned_quantity,
               COALESCE(damaged_quantity, 0) as damaged_quantity,
               damage_reason, created_at
        FROM external_transfer_items 
        WHERE transfer_id = :transfer_id
        """),
        {"transfer_id": transfer_id}
    ).fetchall()
    
    # Update transfer items with fresh data
    fresh_items = []
    for row in items_result:
        item_dict = {
            "id": row[0],
            "item_name": row[1],
            "batch_no": row[2],
            "quantity": row[3],
            "reason": row[4],
            "return_date": row[5],
            "returned_quantity": float(row[6]) if row[6] else 0.0,
            "damaged_quantity": float(row[7]) if row[7] else 0.0,
            "damage_reason": row[8],
            "created_at": row[9]
        }
        fresh_items.append(item_dict)
    
    # Create response with fresh items and return staff details
    transfer_dict = {
        "id": transfer.id,
        "transfer_no": transfer.transfer_no,
        "location": transfer.location,
        "staff_name": transfer.staff_name,
        "staff_id": transfer.staff_id,
        "staff_location": transfer.staff_location,
        "reason": transfer.reason,
        "status": transfer.status,
        "created_at": transfer.created_at,
        "sent_at": transfer.sent_at,
        "returned_at": transfer.returned_at,
        "return_staff_name": transfer.return_staff_name,
        "return_staff_phone": transfer.return_staff_phone,
        "return_staff_email": transfer.return_staff_email,
        "staff_change_reason": transfer.staff_change_reason,
        "items": fresh_items
    }
    
    return transfer_dict

def get_external_transfer(transfer_id: int, db: Session = Depends(get_tenant_db)):
    from sqlalchemy import text
    
    transfer = db.query(ExternalTransfer).filter(ExternalTransfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    # Get fresh item data with returned quantities
    items_result = db.execute(
        text("""
        SELECT id, item_name, batch_no, quantity, reason, return_date,
               COALESCE(returned_quantity, 0) as returned_quantity,
               COALESCE(damaged_quantity, 0) as damaged_quantity,
               damage_reason, created_at
        FROM external_transfer_items 
        WHERE transfer_id = :transfer_id
        """),
        {"transfer_id": transfer_id}
    ).fetchall()
    
    # Update transfer items with fresh data
    fresh_items = []
    for row in items_result:
        item_dict = {
            "id": row[0],
            "item_name": row[1],
            "batch_no": row[2],
            "quantity": row[3],
            "reason": row[4],
            "return_date": row[5],
            "returned_quantity": float(row[6]) if row[6] else 0.0,
            "damaged_quantity": float(row[7]) if row[7] else 0.0,
            "damage_reason": row[8],
            "created_at": row[9]
        }
        fresh_items.append(item_dict)
    
    # Create response with fresh items
    transfer_dict = {
        "id": transfer.id,
        "transfer_no": transfer.transfer_no,
        "location": transfer.location,
        "staff_name": transfer.staff_name,
        "staff_id": transfer.staff_id,
        "staff_location": transfer.staff_location,
        "reason": transfer.reason,
        "status": transfer.status,
        "created_at": transfer.created_at,
        "sent_at": transfer.sent_at,
        "returned_at": transfer.returned_at,
        "items": fresh_items
    }
    
    return transfer_dict

@router.post("/check-deadlines")
def check_return_deadlines(db: Session = Depends(get_db)):
    """Check for upcoming return deadlines and send email alerts"""
    try:
        # Get transfers with upcoming deadlines (next 3 days)
        tomorrow = datetime.now() + timedelta(days=1)
        three_days = datetime.now() + timedelta(days=3)
        
        query = text("""
            SELECT 
                et.id,
                et.transfer_no,
                et.staff_name,
                et.staff_email,
                et.return_deadline,
                et.location,
                SUM(eti.quantity - COALESCE(eti.returned_quantity, 0) - COALESCE(eti.damaged_quantity, 0)) as pending_qty
            FROM external_transfers et
            JOIN external_transfer_items eti ON et.id = eti.transfer_id
            WHERE et.return_deadline BETWEEN :tomorrow AND :three_days
            AND et.status = 'SENT'
            AND (eti.quantity - COALESCE(eti.returned_quantity, 0) - COALESCE(eti.damaged_quantity, 0)) > 0
            GROUP BY et.id
            HAVING pending_qty > 0
        """)
        
        result = db.execute(query, {
            'tomorrow': tomorrow.strftime('%Y-%m-%d'),
            'three_days': three_days.strftime('%Y-%m-%d')
        })
        
        alerts = []
        for row in result:
            transfer_no = row[1]
            staff_name = row[2]
            staff_email = row[3]
            return_deadline = row[4]
            location = row[5]
            pending_qty = row[6]
            
            if staff_email:
                days_left = (return_deadline - datetime.now().date()).days
                
                alert_info = {
                    "transfer_no": transfer_no,
                    "staff_name": staff_name,
                    "staff_email": staff_email,
                    "return_deadline": return_deadline.strftime('%d-%m-%Y'),
                    "days_left": days_left,
                    "pending_qty": int(pending_qty),
                    "location": location
                }
                alerts.append(alert_info)
        
        return {
            "message": f"Found {len(alerts)} transfers with upcoming deadlines",
            "alerts": alerts
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send-deadline-alerts")
def send_deadline_alerts(db: Session = Depends(get_db)):
    """Send email alerts for upcoming return deadlines"""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    def send_email(to_email, subject, body):
        try:
            msg = MIMEMultipart()
            msg['From'] = "inventory@company.com"
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'html'))
            
            server = smtplib.SMTP("smtp.gmail.com", 587)
            server.starttls()
            server.login("your-email@gmail.com", "your-password")
            server.sendmail("inventory@company.com", to_email, msg.as_string())
            server.quit()
            return True
        except:
            return False
    
    try:
        tomorrow = datetime.now() + timedelta(days=1)
        three_days = datetime.now() + timedelta(days=3)
        
        query = text("""
            SELECT et.transfer_no, et.staff_name, et.staff_email, et.return_deadline, et.location,
                   SUM(eti.quantity - COALESCE(eti.returned_quantity, 0) - COALESCE(eti.damaged_quantity, 0)) as pending_qty
            FROM external_transfers et
            JOIN external_transfer_items eti ON et.id = eti.transfer_id
            WHERE et.return_deadline BETWEEN :tomorrow AND :three_days
            AND et.status = 'SENT' AND et.staff_email IS NOT NULL
            AND (eti.quantity - COALESCE(eti.returned_quantity, 0) - COALESCE(eti.damaged_quantity, 0)) > 0
            GROUP BY et.id HAVING pending_qty > 0
        """)
        
        result = db.execute(query, {
            'tomorrow': tomorrow.strftime('%Y-%m-%d'),
            'three_days': three_days.strftime('%Y-%m-%d')
        })
        
        sent_count = 0
        for row in result:
            transfer_no, staff_name, staff_email, return_deadline, location, pending_qty = row
            days_left = (return_deadline - datetime.now().date()).days
            
            subject = f"Return Reminder: {transfer_no} - Due in {days_left} days"
            body = f"""
            <h2>Return Deadline Reminder</h2>
            <p>Dear {staff_name},</p>
            <p>You have <strong>{int(pending_qty)} items</strong> pending return for transfer <strong>{transfer_no}</strong>.</p>
            <ul>
                <li>Transfer: {transfer_no}</li>
                <li>Location: {location}</li>
                <li>Deadline: {return_deadline.strftime('%d-%m-%Y')}</li>
                <li>Days Left: {days_left}</li>
                <li>Pending Items: {int(pending_qty)}</li>
            </ul>
            <p>Please return all items by the deadline.</p>
            """
            
            if send_email(staff_email, subject, body):
                sent_count += 1
        
        return {"message": f"Sent {sent_count} email alerts"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@router.put("/{transfer_id}/return-simple")
def return_transfer_simple(transfer_id: int, data: dict, db: Session = Depends(get_db)):
    """Simple return endpoint that accepts raw JSON"""
    try:
        print(f"RAW DATA: {data}")
        
        transfer = db.query(ExternalTransfer).filter(ExternalTransfer.id == transfer_id).first()
        if not transfer:
            raise HTTPException(404, "Transfer not found")
        
        # Store return staff details directly from dict
        if data.get('return_staff_name'):
            transfer.return_staff_name = data['return_staff_name']
            print(f"Set return_staff_name: {data['return_staff_name']}")
        if data.get('return_staff_phone'):
            transfer.return_staff_phone = data['return_staff_phone']
            print(f"Set return_staff_phone: {data['return_staff_phone']}")
        if data.get('return_staff_email'):
            transfer.return_staff_email = data['return_staff_email']
            print(f"Set return_staff_email: {data['return_staff_email']}")
        if data.get('staff_change_reason'):
            transfer.staff_change_reason = data['staff_change_reason']
            print(f"Set staff_change_reason: {data['staff_change_reason']}")
        
        db.commit()
        
        return {"message": "Return staff details updated", "transfer_id": transfer_id}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(400, str(e))
@router.post("/test-return-data")
def test_return_data(data: dict, db: Session = Depends(get_db)):
    """Test endpoint to see what data is being sent from frontend"""
    print(f"RAW DATA RECEIVED: {data}")
    return {"received_data": data}
@router.get("/{transfer_id}/debug-staff")
def debug_return_staff(transfer_id: int, db: Session = Depends(get_db)):
    """Debug endpoint to check return staff details"""
    transfer = db.query(ExternalTransfer).filter(ExternalTransfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    return {
        "transfer_id": transfer.id,
        "original_staff": transfer.staff_name,
        "return_staff_name": transfer.return_staff_name,
        "return_staff_phone": transfer.return_staff_phone,
        "return_staff_email": transfer.return_staff_email,
        "staff_change_reason": transfer.staff_change_reason
    }
@router.get("/{transfer_id}/transactions")
def get_transfer_transactions(transfer_id: int, db: Session = Depends(get_db)):
    """Get all transaction history for a transfer"""
    try:
        query = text("""
            SELECT 
                ett.id,
                ett.transaction_type,
                ett.quantity,
                ett.transaction_date,
                ett.remarks,
                eti.item_name,
                eti.batch_no,
                CASE 
                    WHEN ett.return_staff_name IS NOT NULL AND ett.return_staff_name != '' 
                    THEN ett.return_staff_name
                    ELSE et.staff_name
                END as returned_by,
                ett.return_staff_phone,
                ett.return_staff_email
            FROM external_transfer_transactions ett
            JOIN external_transfer_items eti ON ett.item_id = eti.id
            JOIN external_transfers et ON ett.transfer_id = et.id
            WHERE ett.transfer_id = :transfer_id
            ORDER BY ett.transaction_date ASC
        """)
        
        result = db.execute(query, {"transfer_id": transfer_id})
        
        transactions = []
        for row in result:
            transactions.append({
                "id": row[0],
                "transaction_type": row[1],
                "quantity": row[2],
                "transaction_date": row[3],
                "remarks": row[4],
                "item_name": row[5],
                "batch_no": row[6],
                "returned_by": row[7],
                "return_staff_phone": row[8],
                "return_staff_email": row[9]
            })
        
        return transactions
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{transfer_id}/print-pdf")
def print_external_transfer_pdf(transfer_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_external_transfer_print())):
    """Generate PDF for external transfer with company header"""
    try:
        # Get transfer details
        transfer = db.query(ExternalTransfer).filter(ExternalTransfer.id == transfer_id).first()
        if not transfer:
            raise HTTPException(status_code=404, detail="Transfer not found")
        
        # Get transaction history
        from sqlalchemy import text
        transactions_result = db.execute(
            text("""
            SELECT 
                ett.transaction_type,
                ett.quantity,
                ett.transaction_date,
                ett.remarks,
                eti.item_name,
                eti.batch_no,
                CASE 
                    WHEN ett.return_staff_name IS NOT NULL AND ett.return_staff_name != '' 
                    THEN ett.return_staff_name
                    ELSE et.staff_name
                END as returned_by
            FROM external_transfer_transactions ett
            JOIN external_transfer_items eti ON ett.item_id = eti.id
            JOIN external_transfers et ON ett.transfer_id = et.id
            WHERE ett.transfer_id = :transfer_id
            ORDER BY ett.transaction_date ASC
            """),
            {"transfer_id": transfer_id}
        ).fetchall()
        
        # Prepare data for items table only (no transaction history)
        headers = ['Item Name', 'Batch No', 'Original Qty', 'Returned Qty', 'Damaged Qty', 'Balance', 'Status']
        data = []
        
        for item in transfer.items:
            total_returned = (item.returned_quantity or 0) + (item.damaged_quantity or 0)
            balance = item.quantity - total_returned
            status = 'Completed' if balance <= 0 else 'Pending'
            
            data.append([
                item.item_name,
                item.batch_no or '-',
                str(item.quantity),
                str(item.returned_quantity or 0),
                str(item.damaged_quantity or 0),
                str(balance),
                status
            ])
        
        # Generate PDF using universal generator
        pdf_generator = UniversalPDFGenerator(db)
        title = f"EXTERNAL TRANSFER REPORT - {transfer.transfer_no}"
        
        # Add transfer details after title
        transfer_details = [
            f"Staff: {transfer.staff_name} (ID: {transfer.staff_id})",
            f"Staff Location: {transfer.staff_location}",
            f"Transfer Location: {transfer.location}", 
            f"Status: {transfer.status}",
            f"Created: {transfer.created_at.strftime('%d/%m/%Y %H:%M')}"
        ]
        
        if transfer.sent_at:
            transfer_details.append(f"Sent: {transfer.sent_at.strftime('%d/%m/%Y %H:%M')}")
        if transfer.returned_at:
            transfer_details.append(f"Returned: {transfer.returned_at.strftime('%d/%m/%Y %H:%M')}")
        if transfer.staff_phone:
            transfer_details.append(f"Phone: {transfer.staff_phone}")
        if transfer.staff_email:
            transfer_details.append(f"Email: {transfer.staff_email}")
        
        # Create custom PDF with transfer details
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib import colors
        from datetime import datetime
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=A4, 
            topMargin=120,  # Increased top margin
            bottomMargin=40, 
            leftMargin=40, 
            rightMargin=40
        )
        
        story = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = styles['Title']
        title_style.alignment = 1
        title_style.fontSize = 14
        title_style.spaceAfter = 10
        title_para = Paragraph(f"<b>{title}</b>", title_style)
        story.append(title_para)
        story.append(Spacer(1, 15))
        
        # Create side-by-side layout for staff and transfer details
        page_width = A4[0] - 80  # Account for margins
        left_width = page_width * 0.48
        right_width = page_width * 0.48
        gap_width = page_width * 0.04
        
        # Staff Details (Left Side)
        staff_data = [
            ['STAFF DETAILS'],
            ['Staff Name:', transfer.staff_name],
            ['Staff ID:', transfer.staff_id],
            ['Staff Location:', transfer.staff_location],
            ['Phone:', transfer.staff_phone or 'N/A'],
            ['Email:', transfer.staff_email or 'N/A']
        ]
        
        # Transfer Details (Right Side)
        transfer_data = [
            ['TRANSFER DETAILS'],
            ['Transfer No:', transfer.transfer_no],
            ['Status:', transfer.status],
            ['Transfer Location:', transfer.location],
            ['Created:', transfer.created_at.strftime('%d/%m/%Y %H:%M')]
        ]
        
        if transfer.sent_at:
            transfer_data.append(['Sent:', transfer.sent_at.strftime('%d/%m/%Y %H:%M')])
        if transfer.returned_at:
            transfer_data.append(['Returned:', transfer.returned_at.strftime('%d/%m/%Y %H:%M')])
        
        # Create side-by-side table
        combined_data = []
        max_rows = max(len(staff_data), len(transfer_data))
        
        for i in range(max_rows):
            left_cell = staff_data[i] if i < len(staff_data) else ['', '']
            right_cell = transfer_data[i] if i < len(transfer_data) else ['', '']
            
            # Ensure each cell has 2 elements
            if len(left_cell) == 1:
                left_cell.append('')
            if len(right_cell) == 1:
                right_cell.append('')
                
            combined_data.append([left_cell[0], left_cell[1], '', right_cell[0], right_cell[1]])
        
        details_table = Table(combined_data, colWidths=[80, left_width-80, gap_width, 80, right_width-80])
        details_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (1, 0), 'Helvetica-Bold'),  # Left header
            ('FONTNAME', (3, 0), (4, 0), 'Helvetica-Bold'),  # Right header
            ('FONTSIZE', (0, 0), (1, 0), 11),
            ('FONTSIZE', (3, 0), (4, 0), 11),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),  # Left labels
            ('FONTNAME', (3, 1), (3, -1), 'Helvetica-Bold'),  # Right labels
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('SPAN', (0, 0), (1, 0)),  # Span left header
            ('SPAN', (3, 0), (4, 0)),  # Span right header
        ]))
        
        story.append(details_table)
        story.append(Spacer(1, 20))
        
        # Create table with proper column widths
        table_data = [headers] + data
        
        # Calculate proper column widths based on content
        page_width = A4[0] - 80  # Account for margins
        col_widths = [
            page_width * 0.25,  # Item Name - 25%
            page_width * 0.15,  # Batch No - 15%
            page_width * 0.12,  # Original Qty - 12%
            page_width * 0.12,  # Returned Qty - 12%
            page_width * 0.12,  # Damaged Qty - 12%
            page_width * 0.12,  # Balance - 12%
            page_width * 0.12   # Status - 12%
        ]
        
        table = Table(table_data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4472C4')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('TOPPADDING', (0, 0), (-1, 0), 6),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('TOPPADDING', (0, 1), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        story.append(table)
        
        # Add transaction history as separate table if exists
        if transactions_result:
            story.append(Spacer(1, 20))
            
            # Transaction history title
            txn_title_style = styles['Heading2']
            txn_title_style.fontSize = 12
            txn_title_style.alignment = 0
            txn_title = Paragraph("<b>TRANSACTION HISTORY</b>", txn_title_style)
            story.append(txn_title)
            story.append(Spacer(1, 10))
            
            # Transaction history table
            txn_headers = ['Date & Time', 'Item', 'Batch', 'Type', 'Qty', 'Returned By', 'Remarks']
            txn_data = [txn_headers]
            
            for txn in transactions_result:
                txn_data.append([
                    txn[2].strftime('%d/%m/%Y %H:%M'),
                    txn[4][:20],
                    txn[5],
                    txn[0],
                    str(txn[1]),
                    txn[6][:15],
                    (txn[3] or '')[:25]
                ])
            
            # Transaction table with different column widths
            txn_col_widths = [
                page_width * 0.18,  # Date & Time
                page_width * 0.20,  # Item
                page_width * 0.12,  # Batch
                page_width * 0.10,  # Type
                page_width * 0.08,  # Qty
                page_width * 0.15,  # Returned By
                page_width * 0.17   # Remarks
            ]
            
            txn_table = Table(txn_data, colWidths=txn_col_widths)
            txn_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4472C4')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 8),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
                ('TOPPADDING', (0, 0), (-1, 0), 6),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 7),
                ('TOPPADDING', (0, 1), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 3),
                ('RIGHTPADDING', (0, 0), (-1, -1), 3),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            
            story.append(txn_table)
        
        # Build PDF with header
        def add_header(canvas, doc):
            pdf_generator.header_format.create_header(canvas, doc)
        
        doc.build(story, onFirstPage=add_header, onLaterPages=add_header)
        buffer.seek(0)
        
        return StreamingResponse(
            io.BytesIO(buffer.read()),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={transfer.transfer_no}_transfer_report.pdf"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Add audit log endpoint for external transfers
@router.get("/{transfer_id}/audit-logs")
def get_external_transfer_audit_logs(transfer_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_external_transfer_view())):
    """Get audit logs for a specific external transfer"""
    # Get audit logs for this external transfer
    audit_logs = db.query(AuditLog).filter(
        AuditLog.table_name == "external_transfers",
        AuditLog.record_id == transfer_id
    ).order_by(AuditLog.timestamp.desc()).all()
    
    result = []
    for log in audit_logs:
        result.append({
            "id": log.id,
            "user_name": log.user_name,
            "action": log.action,
            "timestamp": log.timestamp.strftime("%d/%m/%Y %H:%M:%S"),
            "description": log.description,
            "new_values": json.loads(log.new_values) if log.new_values else None,
            "old_values": json.loads(log.old_values) if log.old_values else None,
            "ip_address": log.ip_address
        })
    
    return result