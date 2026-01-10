from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_current_tenant_db_name, get_tenant_db
from models.tenant_models import IssueHeader, IssueItem, User
from schemas.tenant_schemas import *
from datetime import date, datetime
import uuid

router = APIRouter(prefix="/consumption", tags=["Dispensed Items"])

def get_db(tenant_db_name: str = Depends(get_current_tenant_db_name())):
    yield from get_tenant_db(tenant_db_name)

@router.post("/dispense-batch")
def dispense_batch(data: dict, db: Session = Depends(get_db)):
    """Dispense a specific batch directly"""
    
    issue_no = f"DISP-{datetime.now().strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:8]}"
    
    try:
        # Create issue header
        header = IssueHeader(
            issue_no=issue_no,
            issue_type="DEPARTMENT",
            department="Direct Dispense",
            issue_date=date.today(),
            requested_by="System",
            remarks="Direct batch dispense from stock details"
        )
        db.add(header)
        db.commit()
        db.refresh(header)
        
        # Create issue item
        db.add(IssueItem(
            issue_id=header.id,
            item_name=data.get("item_name"),
            qty=data.get("quantity"),
            uom="PCS",
            batch_no=data.get("batch_no"),
            item_type="CONSUMABLE",
            remarks=f"Dispensed from {data.get('location')} - {data.get('status')}"
        ))
        
        # Update stock - completely remove the batch
        from models.tenant_models import Batch, GRNItem, GRN, GRNStatus
        
        batch = db.query(Batch).filter(Batch.batch_no == data.get("batch_no")).first()
        if batch:
            # Always delete the batch completely when dispensed
            db.delete(batch)
        
        db.commit()
        return {"message": "Batch dispensed successfully", "issue_no": issue_no}
    except Exception as e:
        db.rollback()
        raise e

@router.get("/dispensed-items")
def get_dispensed_items(db: Session = Depends(get_db)):
    """Get all dispensed/issued items with details"""
    
    # Join IssueHeader, IssueItem, and User to get complete dispensed items data
    dispensed_items = db.query(
        IssueHeader.issue_no,
        IssueHeader.issue_type,
        IssueHeader.department,
        IssueHeader.project_code,
        IssueHeader.external_ref,
        IssueHeader.issue_date,
        IssueHeader.requested_by,
        IssueItem.item_name,
        IssueItem.qty,
        IssueItem.uom,
        IssueItem.batch_no,
        IssueItem.item_type,
        IssueItem.remarks,
        User.full_name.label('user_name')
    ).join(
        IssueItem, IssueHeader.id == IssueItem.issue_id
    ).outerjoin(
        User, IssueHeader.requested_by == User.login_code
    ).order_by(desc(IssueHeader.issue_date)).all()
    
    result = []
    for item in dispensed_items:
        result.append({
            "issue_no": item.issue_no,
            "issue_type": item.issue_type,
            "department": item.department,
            "project_code": item.project_code,
            "external_ref": item.external_ref,
            "issue_date": item.issue_date.strftime("%Y-%m-%d") if item.issue_date else None,
            "requested_by": item.requested_by,
            "user_name": item.user_name or "System",
            "item_name": item.item_name,
            "qty": item.qty,
            "uom": item.uom,
            "batch_no": item.batch_no,
            "item_type": item.item_type,
            "remarks": item.remarks
        })
    
    return result

@router.get("/dispensed-summary")
def get_dispensed_summary(db: Session = Depends(get_db)):
    """Get summary of dispensed items by type and department"""
    
    # Get total dispensed items count
    total_items = db.query(IssueItem).count()
    
    # Get dispensed items by type
    by_type = db.query(
        IssueHeader.issue_type,
        db.func.count(IssueItem.id).label('count')
    ).join(
        IssueItem, IssueHeader.id == IssueItem.issue_id
    ).group_by(IssueHeader.issue_type).all()
    
    # Get recent dispensed items (last 10)
    recent_items = db.query(
        IssueHeader.issue_no,
        IssueHeader.issue_date,
        IssueItem.item_name,
        IssueItem.qty,
        IssueHeader.department
    ).join(
        IssueItem, IssueHeader.id == IssueItem.issue_id
    ).order_by(desc(IssueHeader.issue_date)).limit(10).all()
    
    return {
        "total_dispensed": total_items,
        "by_type": [{"type": item.issue_type, "count": item.count} for item in by_type],
        "recent_items": [
            {
                "issue_no": item.issue_no,
                "issue_date": item.issue_date.strftime("%Y-%m-%d") if item.issue_date else None,
                "item_name": item.item_name,
                "qty": item.qty,
                "department": item.department
            } for item in recent_items
        ]
    }