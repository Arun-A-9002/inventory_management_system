from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_tenant_db
from models.tenant_models import ReturnHeader, ReturnItem, ReturnTypeEnum, ItemConditionEnum
from datetime import datetime, date
from typing import List

router = APIRouter(prefix="/returns", tags=["Returns & Disposal"])
DEFAULT_DB = "arun"

def get_db():
    yield from get_tenant_db(DEFAULT_DB)

@router.get("/")
def list_returns(db: Session = Depends(get_db)):
    """Get all returns"""
    returns = db.query(ReturnHeader).order_by(ReturnHeader.created_at.desc()).all()
    return returns

@router.post("/")
def create_return(return_data: dict, db: Session = Depends(get_db)):
    """Create new return"""
    # Generate return number
    return_no = f"RTN{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    # Create return header
    return_header = ReturnHeader(
        return_no=return_no,
        return_type=return_data.get('return_type', 'TO_VENDOR'),
        vendor=return_data.get('supplier'),
        location=return_data.get('location'),
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
def get_return_details(return_id: int, db: Session = Depends(get_db)):
    """Get return details with items"""
    return_header = db.query(ReturnHeader).filter(ReturnHeader.id == return_id).first()
    if not return_header:
        raise HTTPException(404, "Return not found")
    
    return_items = db.query(ReturnItem).filter(ReturnItem.return_id == return_id).all()
    
    return {
        "header": return_header,
        "items": return_items
    }

@router.patch("/{return_id}/status")
def update_return_status(return_id: int, status: str, db: Session = Depends(get_db)):
    """Update return status and adjust inventory if approved"""
    from models.tenant_models import Batch, GRNItem, GRN, GRNStatus
    
    return_header = db.query(ReturnHeader).filter(ReturnHeader.id == return_id).first()
    if not return_header:
        raise HTTPException(404, "Return not found")
    
    old_status = return_header.status
    return_header.status = status
    
    # If status changed to APPROVED, reduce stock quantities
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
                
                if batch and batch.qty >= item.qty:
                    batch.qty -= item.qty
                    
                    # Remove batch if quantity becomes 0
                    if batch.qty == 0:
                        db.delete(batch)
                    
                    print(f"Reduced {item.qty} from batch {item.batch_no} for return approval")
                else:
                    print(f"Warning: Batch {item.batch_no} not found or insufficient quantity")
    
    db.commit()
    
    return {"message": "Return status updated successfully"}