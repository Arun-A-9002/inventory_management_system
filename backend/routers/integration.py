from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Dict, List, Any
from datetime import datetime, timedelta

from database import get_tenant_db
from models.tenant_models import (
    Item, GRN, GRNItem, Batch, StockOverview, VendorPayment,
    PurchaseOrder, ReturnHeader, Customer, Vendor, StockLedger,
    IssueHeader, ExternalTransfer
)

router = APIRouter(prefix="/api/integration", tags=["System Integration"])

class InventoryWorkflowService:
    """Service to handle complex inventory workflows"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def process_grn_approval(self, grn_id: int) -> Dict[str, Any]:
        """Process GRN approval and update stock"""
        try:
            grn = self.db.query(GRN).filter(GRN.id == grn_id).first()
            if not grn:
                raise ValueError("GRN not found")
            
            # Update GRN status
            grn.status = "approved"
            
            # Update stock overview for each item
            for grn_item in grn.items:
                # Check if item exists in stock overview
                stock_record = self.db.query(StockOverview).filter(
                    and_(
                        StockOverview.item_name == grn_item.item_name,
                        StockOverview.location == grn.store
                    )
                ).first()
                
                if stock_record:
                    # Update existing record
                    stock_record.available_qty += int(grn_item.received_qty)
                else:
                    # Create new stock record
                    # Get item details
                    item = self.db.query(Item).filter(Item.name == grn_item.item_name).first()
                    
                    stock_record = StockOverview(
                        item_name=grn_item.item_name,
                        item_code=item.item_code if item else f"CODE_{grn_item.item_name[:10]}",
                        location=grn.store,
                        available_qty=int(grn_item.received_qty),
                        min_stock=item.min_stock if item else 0,
                        status="In Stock"
                    )
                    self.db.add(stock_record)
                
                # Update batch information
                for batch in grn_item.batches:
                    stock_record.batch_no = batch.batch_no
                    if batch.expiry_date:
                        stock_record.expiry_date = batch.expiry_date.isoformat()
                    if batch.warranty_end_date:
                        stock_record.warranty = batch.warranty_end_date.isoformat()
            
            # Create vendor payment record
            if grn.total_amount and grn.total_amount > 0:
                existing_payment = self.db.query(VendorPayment).filter(
                    VendorPayment.grn_number == grn.grn_number
                ).first()
                
                if not existing_payment:
                    payment = VendorPayment(
                        grn_number=grn.grn_number,
                        vendor_name=grn.vendor_name,
                        invoice_number=grn.invoice_number,
                        total_amount=grn.total_amount,
                        outstanding_amount=grn.total_amount,
                        payment_status="unpaid"
                    )
                    self.db.add(payment)
            
            self.db.commit()
            
            return {
                "status": "success",
                "message": f"GRN {grn.grn_number} approved and stock updated",
                "grn_id": grn_id,
                "items_updated": len(grn.items)
            }
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    def process_stock_issue(self, issue_id: int) -> Dict[str, Any]:
        """Process stock issue and update inventory"""
        try:
            issue = self.db.query(IssueHeader).filter(IssueHeader.id == issue_id).first()
            if not issue:
                raise ValueError("Issue not found")
            
            # Update stock for each issued item
            for issue_item in issue.items:
                stock_record = self.db.query(StockOverview).filter(
                    StockOverview.item_name == issue_item.item_name
                ).first()
                
                if stock_record:
                    if stock_record.available_qty >= issue_item.qty:
                        stock_record.available_qty -= int(issue_item.qty)
                        
                        # Update status based on new quantity
                        if stock_record.available_qty == 0:
                            stock_record.status = "Out of Stock"
                        elif stock_record.available_qty <= stock_record.min_stock:
                            stock_record.status = "Low Stock"
                        else:
                            stock_record.status = "In Stock"
                    else:
                        raise ValueError(f"Insufficient stock for {issue_item.item_name}")
            
            # Update issue status
            issue.status = "COMPLETED"
            
            self.db.commit()
            
            return {
                "status": "success",
                "message": f"Issue {issue.issue_no} processed and stock updated",
                "issue_id": issue_id
            }
            
        except Exception as e:
            self.db.rollback()
            raise e
    
    def generate_reorder_alerts(self) -> List[Dict[str, Any]]:
        """Generate reorder alerts for low stock items"""
        try:
            low_stock_items = self.db.query(StockOverview).filter(
                and_(
                    StockOverview.available_qty <= StockOverview.min_stock,
                    StockOverview.min_stock > 0
                )
            ).all()
            
            alerts = []
            for item in low_stock_items:
                # Find preferred vendor (most recent GRN)
                recent_grn = self.db.query(GRN).join(
                    GRNItem, GRN.id == GRNItem.grn_id
                ).filter(
                    GRNItem.item_name == item.item_name
                ).order_by(GRN.grn_date.desc()).first()
                
                alert = {
                    "item_name": item.item_name,
                    "current_stock": item.available_qty,
                    "min_stock": item.min_stock,
                    "suggested_order_qty": item.min_stock * 2,
                    "preferred_vendor": recent_grn.vendor_name if recent_grn else "Not Available",
                    "location": item.location,
                    "priority": "Critical" if item.available_qty == 0 else "High"
                }
                alerts.append(alert)
            
            return alerts
            
        except Exception as e:
            raise e

@router.post("/process-grn-approval/{grn_id}")
def process_grn_approval(
    grn_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_tenant_db)
):
    """Process GRN approval workflow"""
    try:
        service = InventoryWorkflowService(db)
        result = service.process_grn_approval(grn_id)
        
        # Add background task to update related records
        background_tasks.add_task(update_vendor_performance, grn_id, db)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/process-stock-issue/{issue_id}")
def process_stock_issue(
    issue_id: int,
    db: Session = Depends(get_tenant_db)
):
    """Process stock issue workflow"""
    try:
        service = InventoryWorkflowService(db)
        result = service.process_stock_issue(issue_id)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/reorder-alerts")
def get_reorder_alerts(db: Session = Depends(get_tenant_db)):
    """Get reorder alerts for low stock items"""
    try:
        service = InventoryWorkflowService(db)
        alerts = service.generate_reorder_alerts()
        
        return {
            "total_alerts": len(alerts),
            "critical_count": len([a for a in alerts if a["priority"] == "Critical"]),
            "high_count": len([a for a in alerts if a["priority"] == "High"]),
            "alerts": alerts
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data-integrity-check")
def perform_data_integrity_check(db: Session = Depends(get_tenant_db)):
    """Perform comprehensive data integrity check"""
    try:
        issues = []
        
        # Check for items without stock records
        items_without_stock = db.query(Item).outerjoin(
            StockOverview, Item.name == StockOverview.item_name
        ).filter(StockOverview.id.is_(None)).count()
        
        if items_without_stock > 0:
            issues.append({
                "type": "Missing Stock Records",
                "count": items_without_stock,
                "severity": "Medium",
                "description": "Items exist but have no stock overview records"
            })
        
        # Check for negative stock
        negative_stock = db.query(StockOverview).filter(
            StockOverview.available_qty < 0
        ).count()
        
        if negative_stock > 0:
            issues.append({
                "type": "Negative Stock",
                "count": negative_stock,
                "severity": "High",
                "description": "Items with negative stock quantities"
            })
        
        # Check for GRNs without payments
        grns_without_payments = db.query(GRN).outerjoin(
            VendorPayment, GRN.grn_number == VendorPayment.grn_number
        ).filter(
            and_(
                VendorPayment.id.is_(None),
                GRN.total_amount > 0,
                GRN.status == "approved"
            )
        ).count()
        
        if grns_without_payments > 0:
            issues.append({
                "type": "Missing Payment Records",
                "count": grns_without_payments,
                "severity": "Medium",
                "description": "Approved GRNs without corresponding payment records"
            })
        
        # Check for expired items still in stock
        expired_items = db.query(StockOverview).filter(
            and_(
                StockOverview.expiry_date != "—",
                StockOverview.expiry_date < datetime.now().strftime("%Y-%m-%d"),
                StockOverview.available_qty > 0
            )
        ).count()
        
        if expired_items > 0:
            issues.append({
                "type": "Expired Items in Stock",
                "count": expired_items,
                "severity": "High",
                "description": "Expired items still showing available stock"
            })
        
        return {
            "check_timestamp": datetime.now().isoformat(),
            "total_issues": len(issues),
            "issues": issues,
            "overall_health": "Good" if len(issues) == 0 else "Needs Attention"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync-all-data")
def sync_all_inventory_data(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_tenant_db)
):
    """Sync all inventory data across modules"""
    try:
        # Add background tasks for data synchronization
        background_tasks.add_task(sync_stock_from_grn, db)
        background_tasks.add_task(sync_payment_records, db)
        background_tasks.add_task(update_stock_status, db)
        
        return {
            "message": "Data synchronization started",
            "timestamp": datetime.now().isoformat(),
            "tasks_queued": 3
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Background task functions
def update_vendor_performance(grn_id: int, db: Session):
    """Update vendor performance metrics"""
    # Implementation for vendor performance update
    pass

def sync_stock_from_grn(db: Session):
    """Sync stock overview from GRN data"""
    # Implementation for stock sync
    pass

def sync_payment_records(db: Session):
    """Sync payment records from GRN data"""
    # Implementation for payment sync
    pass

def update_stock_status(db: Session):
    """Update stock status based on current quantities"""
    # Implementation for status update
    pass

@router.get("/module-statistics")
def get_module_statistics(db: Session = Depends(get_tenant_db)):
    """Get statistics for all modules"""
    try:
        stats = {
            "items": {
                "total": db.query(Item).count(),
                "active": db.query(Item).filter(Item.is_active == True).count()
            },
            "vendors": {
                "total": db.query(Vendor).count()
            },
            "customers": {
                "total": db.query(Customer).count(),
                "active": db.query(Customer).filter(Customer.is_active == True).count()
            },
            "grns": {
                "total": db.query(GRN).count(),
                "pending": db.query(GRN).filter(GRN.status == "pending").count(),
                "approved": db.query(GRN).filter(GRN.status == "approved").count()
            },
            "stock": {
                "total_items": db.query(StockOverview).count(),
                "in_stock": db.query(StockOverview).filter(StockOverview.status == "In Stock").count(),
                "low_stock": db.query(StockOverview).filter(StockOverview.status == "Low Stock").count(),
                "out_of_stock": db.query(StockOverview).filter(StockOverview.status == "Out of Stock").count()
            },
            "returns": {
                "total": db.query(ReturnHeader).count()
            },
            "external_transfers": {
                "total": db.query(ExternalTransfer).count(),
                "draft": db.query(ExternalTransfer).filter(ExternalTransfer.status == "DRAFT").count()
            }
        }
        
        return {
            "generated_at": datetime.now().isoformat(),
            "statistics": stats
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))