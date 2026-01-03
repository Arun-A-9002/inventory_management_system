from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import Dict, List, Any
from datetime import datetime, timedelta

from database import get_tenant_db
from models.tenant_models import (
    Item, Stock, StockOverview, GRN, PurchaseOrder, 
    ReturnHeader, Customer, Vendor, VendorPayment,
    StockLedger, IssueHeader, User, Department
)

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/overview")
def get_dashboard_overview(db: Session = Depends(get_tenant_db)):
    """Get main dashboard overview statistics"""
    try:
        # Total Items
        total_items = db.query(Item).filter(Item.is_active == True).count()
        
        # Total Stock Value (from stock overview)
        stock_data = db.query(StockOverview).all()
        total_stock_value = sum([stock.available_qty * 100 for stock in stock_data])  # Assuming avg price 100
        
        # Low Stock Items
        low_stock_items = db.query(StockOverview).filter(
            StockOverview.available_qty <= StockOverview.min_stock
        ).count()
        
        # Total Vendors
        total_vendors = db.query(Vendor).count()
        
        # Total Customers
        total_customers = db.query(Customer).filter(Customer.is_active == True).count()
        
        # Pending GRNs
        pending_grns = db.query(GRN).filter(GRN.status == "pending").count()
        
        # Outstanding Payments
        outstanding_payments = db.query(func.sum(VendorPayment.outstanding_amount)).scalar() or 0
        
        # Recent Activities (last 7 days)
        week_ago = datetime.now() - timedelta(days=7)
        recent_grns = db.query(GRN).filter(GRN.grn_date >= week_ago.date()).count()
        recent_issues = db.query(IssueHeader).filter(IssueHeader.created_at >= week_ago).count()
        recent_returns = db.query(ReturnHeader).filter(ReturnHeader.created_at >= week_ago).count()
        
        return {
            "total_items": total_items,
            "total_stock_value": round(total_stock_value, 2),
            "low_stock_items": low_stock_items,
            "total_vendors": total_vendors,
            "total_customers": total_customers,
            "pending_grns": pending_grns,
            "outstanding_payments": round(float(outstanding_payments), 2),
            "recent_activities": {
                "grns": recent_grns,
                "issues": recent_issues,
                "returns": recent_returns
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stock-alerts")
def get_stock_alerts(db: Session = Depends(get_tenant_db)):
    """Get stock alerts for low stock items"""
    try:
        # Low stock items
        low_stock = db.query(StockOverview).filter(
            StockOverview.available_qty <= StockOverview.min_stock,
            StockOverview.min_stock > 0
        ).all()
        
        # Expired items (assuming expiry_date format)
        expired_items = db.query(StockOverview).filter(
            StockOverview.expiry_date != "—",
            StockOverview.expiry_date < datetime.now().strftime("%Y-%m-%d")
        ).all()
        
        # Items expiring soon (next 30 days)
        next_month = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        expiring_soon = db.query(StockOverview).filter(
            StockOverview.expiry_date != "—",
            StockOverview.expiry_date <= next_month,
            StockOverview.expiry_date >= datetime.now().strftime("%Y-%m-%d")
        ).all()
        
        return {
            "low_stock": [
                {
                    "item_name": item.item_name,
                    "available_qty": item.available_qty,
                    "min_stock": item.min_stock,
                    "location": item.location,
                    "status": item.status
                } for item in low_stock
            ],
            "expired_items": [
                {
                    "item_name": item.item_name,
                    "expiry_date": item.expiry_date,
                    "available_qty": item.available_qty,
                    "location": item.location
                } for item in expired_items
            ],
            "expiring_soon": [
                {
                    "item_name": item.item_name,
                    "expiry_date": item.expiry_date,
                    "available_qty": item.available_qty,
                    "location": item.location,
                    "days_to_expire": (datetime.strptime(item.expiry_date, "%Y-%m-%d") - datetime.now()).days
                } for item in expiring_soon
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recent-transactions")
def get_recent_transactions(limit: int = 10, db: Session = Depends(get_tenant_db)):
    """Get recent transactions across all modules"""
    try:
        # Recent GRNs
        recent_grns = db.query(GRN).order_by(GRN.grn_date.desc()).limit(limit).all()
        
        # Recent Issues
        recent_issues = db.query(IssueHeader).order_by(IssueHeader.created_at.desc()).limit(limit).all()
        
        # Recent Returns
        recent_returns = db.query(ReturnHeader).order_by(ReturnHeader.created_at.desc()).limit(limit).all()
        
        # Combine and format
        transactions = []
        
        for grn in recent_grns:
            transactions.append({
                "type": "GRN",
                "reference": grn.grn_number,
                "vendor": grn.vendor_name,
                "amount": float(grn.total_amount) if grn.total_amount else 0,
                "date": grn.grn_date.isoformat() if grn.grn_date else None,
                "status": grn.status
            })
        
        for issue in recent_issues:
            transactions.append({
                "type": "Issue",
                "reference": issue.issue_no,
                "department": issue.department,
                "date": issue.created_at.isoformat() if issue.created_at else None,
                "status": issue.status
            })
        
        for return_item in recent_returns:
            transactions.append({
                "type": "Return",
                "reference": return_item.return_no,
                "vendor": return_item.vendor,
                "date": return_item.created_at.isoformat() if return_item.created_at else None,
                "status": return_item.status
            })
        
        # Sort by date and limit
        transactions.sort(key=lambda x: x.get("date", ""), reverse=True)
        
        return {"transactions": transactions[:limit]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/inventory-summary")
def get_inventory_summary(db: Session = Depends(get_tenant_db)):
    """Get inventory summary by category and location"""
    try:
        # Summary by location
        location_summary = db.query(
            StockOverview.location,
            func.count(StockOverview.id).label("item_count"),
            func.sum(StockOverview.available_qty).label("total_qty")
        ).group_by(StockOverview.location).all()
        
        # Summary by status
        status_summary = db.query(
            StockOverview.status,
            func.count(StockOverview.id).label("count")
        ).group_by(StockOverview.status).all()
        
        # Top items by quantity
        top_items = db.query(StockOverview).order_by(
            StockOverview.available_qty.desc()
        ).limit(10).all()
        
        return {
            "by_location": [
                {
                    "location": loc.location,
                    "item_count": loc.item_count,
                    "total_quantity": int(loc.total_qty) if loc.total_qty else 0
                } for loc in location_summary
            ],
            "by_status": [
                {
                    "status": status.status,
                    "count": status.count
                } for status in status_summary
            ],
            "top_items": [
                {
                    "item_name": item.item_name,
                    "available_qty": item.available_qty,
                    "location": item.location,
                    "status": item.status
                } for item in top_items
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vendor-performance")
def get_vendor_performance(db: Session = Depends(get_tenant_db)):
    """Get vendor performance metrics"""
    try:
        # Vendor payment summary
        vendor_payments = db.query(
            VendorPayment.vendor_name,
            func.count(VendorPayment.id).label("transaction_count"),
            func.sum(VendorPayment.total_amount).label("total_amount"),
            func.sum(VendorPayment.outstanding_amount).label("outstanding")
        ).group_by(VendorPayment.vendor_name).all()
        
        # Recent GRN by vendor
        vendor_grns = db.query(
            GRN.vendor_name,
            func.count(GRN.id).label("grn_count"),
            func.sum(GRN.total_amount).label("total_value")
        ).group_by(GRN.vendor_name).all()
        
        return {
            "payment_summary": [
                {
                    "vendor_name": vp.vendor_name,
                    "transaction_count": vp.transaction_count,
                    "total_amount": float(vp.total_amount) if vp.total_amount else 0,
                    "outstanding": float(vp.outstanding) if vp.outstanding else 0
                } for vp in vendor_payments
            ],
            "grn_summary": [
                {
                    "vendor_name": vg.vendor_name,
                    "grn_count": vg.grn_count,
                    "total_value": float(vg.total_value) if vg.total_value else 0
                } for vg in vendor_grns
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/monthly-trends")
def get_monthly_trends(months: int = 6, db: Session = Depends(get_tenant_db)):
    """Get monthly trends for key metrics"""
    try:
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=months * 30)
        
        # Monthly GRN trends
        monthly_grns = db.query(
            func.date_format(GRN.grn_date, '%Y-%m').label('month'),
            func.count(GRN.id).label('count'),
            func.sum(GRN.total_amount).label('total_amount')
        ).filter(
            GRN.grn_date >= start_date.date()
        ).group_by(
            func.date_format(GRN.grn_date, '%Y-%m')
        ).all()
        
        # Monthly issues trends
        monthly_issues = db.query(
            func.date_format(IssueHeader.created_at, '%Y-%m').label('month'),
            func.count(IssueHeader.id).label('count')
        ).filter(
            IssueHeader.created_at >= start_date
        ).group_by(
            func.date_format(IssueHeader.created_at, '%Y-%m')
        ).all()
        
        return {
            "grn_trends": [
                {
                    "month": grn.month,
                    "count": grn.count,
                    "total_amount": float(grn.total_amount) if grn.total_amount else 0
                } for grn in monthly_grns
            ],
            "issue_trends": [
                {
                    "month": issue.month,
                    "count": issue.count
                } for issue in monthly_issues
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/system-health")
def get_system_health(db: Session = Depends(get_tenant_db)):
    """Get system health metrics"""
    try:
        # Database table counts
        table_counts = {
            "items": db.query(Item).count(),
            "vendors": db.query(Vendor).count(),
            "customers": db.query(Customer).count(),
            "users": db.query(User).count(),
            "departments": db.query(Department).count(),
            "grns": db.query(GRN).count(),
            "stock_records": db.query(StockOverview).count()
        }
        
        # Data quality checks
        items_without_category = db.query(Item).filter(
            (Item.category == None) | (Item.category == "")
        ).count()
        
        items_without_min_stock = db.query(Item).filter(
            Item.min_stock == 0
        ).count()
        
        return {
            "table_counts": table_counts,
            "data_quality": {
                "items_without_category": items_without_category,
                "items_without_min_stock": items_without_min_stock,
                "total_items": table_counts["items"]
            },
            "system_status": "healthy"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))