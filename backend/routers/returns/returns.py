from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_tenant_db
from models.tenant_models import ReturnHeader, ReturnItem, ReturnTypeEnum, ItemConditionEnum
from datetime import datetime, date
from typing import List

router = APIRouter(prefix="/returns", tags=["Returns & Disposal"])

@router.get("/")
def list_returns(db: Session = Depends(get_tenant_db)):
    """Get all returns"""
    returns = db.query(ReturnHeader).order_by(ReturnHeader.created_at.desc()).all()
    return returns

@router.post("/")
def create_return(return_data: dict, db: Session = Depends(get_tenant_db)):
    """Create new return"""
    from models.tenant_models import Customer
    
    # Generate return number
    return_no = f"RTN{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    # Get customer details if customer_id is provided
    customer_id = return_data.get('customer_id')
    customer_name = None
    customer_phone = None
    customer_email = None
    
    if customer_id:
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if customer:
            if customer.customer_type == 'organization':
                customer_name = customer.org_name
                customer_phone = customer.org_mobile
            else:
                customer_name = customer.name
                customer_phone = customer.mobile
            customer_email = customer.email
    
    # Create return header
    return_header = ReturnHeader(
        return_no=return_no,
        return_type=return_data.get('return_type', 'TO_VENDOR'),
        vendor=return_data.get('supplier'),
        location=return_data.get('location'),
        customer_id=customer_id,
        customer_name=customer_name,
        customer_phone=customer_phone,
        customer_email=customer_email,
        reason=return_data.get('reason'),
        return_date=date.today(),
        status="DRAFT"
    )
    
    db.add(return_header)
    db.flush()
    
    # Create return items
    for item_data in return_data.get('items', []):
        return_item = ReturnItem(
            return_id=return_header.id,
            item_name=item_data.get('item_name'),
            batch_no=item_data.get('batch_no'),
            qty=float(item_data.get('quantity', 0)),
            uom='PCS',
            condition='GOOD',
            remarks=item_data.get('reason', '')
        )
        db.add(return_item)
    
    db.commit()
    
    return {
        "message": "Return created successfully",
        "return_number": return_no,
        "return_id": return_header.id
    }

@router.get("/{return_id}")
def get_return_details(return_id: int, db: Session = Depends(get_tenant_db)):
    """Get return details with items"""
    return_header = db.query(ReturnHeader).filter(ReturnHeader.id == return_id).first()
    if not return_header:
        raise HTTPException(404, "Return not found")
    
    return_items = db.query(ReturnItem).filter(ReturnItem.return_id == return_id).all()
    
    return {
        "header": return_header,
        "items": return_items
    }

@router.get("/{return_id}/items")
def get_return_items(return_id: int, db: Session = Depends(get_tenant_db)):
    """Get return items for a specific return with status and returned fields"""
    from sqlalchemy import text
    
    # Use raw SQL to get items with status and returned columns
    result = db.execute(
        text("""
        SELECT id, return_id, item_name, batch_no, qty, uom, condition, remarks, 
               COALESCE(status, 'pending') as status, 
               COALESCE(returned, 0) as returned
        FROM return_items 
        WHERE return_id = :return_id
        """),
        {"return_id": return_id}
    ).fetchall()
    
    # Convert to list of dictionaries
    items = []
    for row in result:
        items.append({
            "id": row[0],
            "return_id": row[1],
            "item_name": row[2],
            "batch_no": row[3],
            "qty": row[4],
            "uom": row[5],
            "condition": row[6],
            "remarks": row[7],
            "status": row[8],
            "returned": bool(row[9])
        })
    
    return items

@router.patch("/{return_id}/status")
def update_return_status(return_id: int, status: str, db: Session = Depends(get_tenant_db)):
    """Update return status and adjust inventory if approved"""
    from models.tenant_models import Batch, GRNItem, GRN, GRNStatus
    
    return_header = db.query(ReturnHeader).filter(ReturnHeader.id == return_id).first()
    if not return_header:
        raise HTTPException(404, "Return not found")
    
    old_status = return_header.status
    return_header.status = status
    
    # If status changed to APPROVED, adjust stock based on return type
    if status == "APPROVED" and old_status != "APPROVED":
        return_items = db.query(ReturnItem).filter(ReturnItem.return_id == return_id).all()
        
        for item in return_items:
            # Find the correct batch in GRN system
            grn_item = db.query(GRNItem).join(GRN).filter(
                GRNItem.item_name == item.item_name,
                GRN.status == GRNStatus.approved
            ).first()
            
            if grn_item:
                batch = db.query(Batch).filter(
                    Batch.grn_item_id == grn_item.id,
                    Batch.batch_no == item.batch_no
                ).first()
                
                if batch:
                    # For customer returns (FROM_CUSTOMER), ADD quantity back to stock
                    if return_header.return_type == "FROM_CUSTOMER":
                        batch.qty += item.qty
                        print(f"Added {item.qty} to batch {item.batch_no} for customer return approval")
                    else:
                        # For other returns (TO_VENDOR, etc.), REDUCE quantity from stock
                        if batch.qty >= item.qty:
                            batch.qty -= item.qty
                            
                            # Remove batch if quantity becomes 0
                            if batch.qty == 0:
                                db.delete(batch)
                            
                            print(f"Reduced {item.qty} from batch {item.batch_no} for return approval")
                        else:
                            print(f"Warning: Batch {item.batch_no} insufficient quantity for reduction")
                else:
                    print(f"Warning: Batch {item.batch_no} not found")
    
    db.commit()
    
    return {"message": "Return status updated successfully"}

@router.put("/{return_id}/items/{item_id}")
def update_return_item(return_id: int, item_id: int, item_data: dict, db: Session = Depends(get_tenant_db)):
    """Update return item - ONLY updates invoice data, no stock changes"""
    from models.tenant_models import Batch, GRNItem, GRN, GRNStatus, StockLedger, Stock
    from sqlalchemy import text
    from datetime import datetime
    
    # Find return item - use flexible approach
    return_item = db.query(ReturnItem).filter(ReturnItem.return_id == return_id).first()
    
    if not return_item:
        raise HTTPException(404, "No return items found for this return")
    
    # Update return item with new data
    return_item.qty = int(item_data.get('qty', return_item.qty))
    
    # Update status if provided
    if 'status' in item_data:
        # Use text() wrapper for raw SQL
        db.execute(
            text("UPDATE return_items SET status = :status WHERE return_id = :return_id"),
            {"status": item_data['status'], "return_id": return_id}
        )
    
    db.commit()
    
    return {"message": "Return item updated - invoice only, no stock changes"}

@router.post("/{return_id}/process-return")
def process_item_return(return_id: int, return_data: dict, db: Session = Depends(get_tenant_db)):
    """Process item return - add stock back and mark as returned"""
    from models.tenant_models import Batch, GRNItem, GRN, GRNStatus
    from sqlalchemy import text
    
    item_name = return_data.get('item_name')
    batch_no = return_data.get('batch_no')
    quantity = int(return_data.get('quantity', 0))
    
    # Find the batch in approved GRNs
    batch = db.query(Batch).join(GRNItem).join(GRN).filter(
        GRNItem.item_name == item_name,
        Batch.batch_no == batch_no,
        GRN.status == GRNStatus.approved
    ).first()
    
    if not batch:
        raise HTTPException(404, "Batch not found in approved stock")
    
    # Add returned quantity back to batch
    batch.qty += quantity
    
    # Mark return item as returned using text() wrapper
    db.execute(
        text("UPDATE return_items SET returned = 1 WHERE return_id = :return_id AND item_name = :item_name"),
        {"return_id": return_id, "item_name": item_name}
    )
    
    db.commit()
    
    return {
        "message": f"Successfully returned {quantity} units of {item_name} (batch {batch_no}) to stock",
        "updated_batch_qty": batch.qty
    }