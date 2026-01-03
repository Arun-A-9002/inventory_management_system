from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional
from datetime import datetime, date, timedelta

from database import get_tenant_db
from models.tenant_models import (
    Stock, StockOverview, StockLedger, StockBatch, Item,
    GRN, GRNItem, Batch, StockTxnType
)
from schemas.tenant_schemas import StockResponse

router = APIRouter(prefix="/api/stock-management", tags=["Stock Management"])

@router.get("/real-time-overview")
def get_real_time_stock_overview(db: Session = Depends(get_tenant_db)):
    """Get real-time stock overview with calculations"""
    try:
        # Get all stock overview records
        stock_records = db.query(StockOverview).all()
        
        # Calculate totals
        total_items = len(stock_records)
        total_quantity = sum([stock.available_qty for stock in stock_records])
        low_stock_count = len([s for s in stock_records if s.available_qty <= s.min_stock and s.min_stock > 0])
        
        # Group by status
        status_summary = {}
        for stock in stock_records:
            status = stock.status
            if status not in status_summary:
                status_summary[status] = {"count": 0, "quantity": 0}
            status_summary[status]["count"] += 1
            status_summary[status]["quantity"] += stock.available_qty
        
        # Group by location
        location_summary = {}
        for stock in stock_records:
            location = stock.location
            if location not in location_summary:
                location_summary[location] = {"count": 0, "quantity": 0}
            location_summary[location]["count"] += 1
            location_summary[location]["quantity"] += stock.available_qty
        
        return {
            "summary": {
                "total_items": total_items,
                "total_quantity": total_quantity,
                "low_stock_count": low_stock_count,
                "locations": len(location_summary),
                "last_updated": datetime.now().isoformat()
            },
            "by_status": status_summary,
            "by_location": location_summary,
            "low_stock_items": [
                {
                    "item_name": stock.item_name,
                    "available_qty": stock.available_qty,
                    "min_stock": stock.min_stock,
                    "location": stock.location,
                    "shortage": stock.min_stock - stock.available_qty
                }
                for stock in stock_records 
                if stock.available_qty <= stock.min_stock and stock.min_stock > 0
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/batch-tracking/{item_name}")
def get_batch_tracking(item_name: str, db: Session = Depends(get_tenant_db)):
    """Get batch tracking information for an item"""
    try:
        # Get batches from GRN system
        grn_batches = db.query(
            Batch.batch_no,
            Batch.qty,
            Batch.mfg_date,
            Batch.expiry_date,
            Batch.warranty_start_date,
            Batch.warranty_end_date,
            GRNItem.item_name,
            GRN.grn_number,
            GRN.grn_date
        ).join(
            GRNItem, Batch.grn_item_id == GRNItem.id
        ).join(
            GRN, GRNItem.grn_id == GRN.id
        ).filter(
            GRNItem.item_name == item_name
        ).all()
        
        # Get stock batches
        stock_batches = db.query(StockBatch).join(
            Stock, StockBatch.stock_id == Stock.id
        ).filter(
            Stock.item_name == item_name
        ).all()
        
        # Combine and format batch information
        batch_info = []
        
        for batch in grn_batches:
            batch_info.append({
                "batch_no": batch.batch_no,
                "quantity": batch.qty,
                "mfg_date": batch.mfg_date.isoformat() if batch.mfg_date else None,
                "expiry_date": batch.expiry_date.isoformat() if batch.expiry_date else None,
                "warranty_start": batch.warranty_start_date.isoformat() if batch.warranty_start_date else None,
                "warranty_end": batch.warranty_end_date.isoformat() if batch.warranty_end_date else None,
                "grn_number": batch.grn_number,
                "grn_date": batch.grn_date.isoformat() if batch.grn_date else None,
                "source": "GRN"
            })
        
        for batch in stock_batches:
            batch_info.append({
                "batch_no": batch.batch_no,
                "quantity": batch.qty,
                "expiry_date": batch.expiry_date.isoformat() if batch.expiry_date else None,
                "store": batch.store,
                "source": "Stock"
            })
        
        return {
            "item_name": item_name,
            "total_batches": len(batch_info),
            "batches": batch_info
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/expiry-tracking")
def get_expiry_tracking(days_ahead: int = 30, db: Session = Depends(get_tenant_db)):
    """Get items expiring within specified days"""
    try:
        future_date = datetime.now() + timedelta(days=days_ahead)
        
        # Get expiring batches from GRN system
        expiring_batches = db.query(
            Batch.batch_no,
            Batch.qty,
            Batch.expiry_date,
            GRNItem.item_name,
            GRN.grn_number
        ).join(
            GRNItem, Batch.grn_item_id == GRNItem.id
        ).join(
            GRN, GRNItem.grn_id == GRN.id
        ).filter(
            and_(
                Batch.expiry_date.isnot(None),
                Batch.expiry_date <= future_date.date(),
                Batch.expiry_date >= datetime.now().date()
            )
        ).all()
        
        # Get expiring items from stock overview
        expiring_stock = db.query(StockOverview).filter(
            and_(
                StockOverview.expiry_date != "—",
                StockOverview.expiry_date <= future_date.strftime("%Y-%m-%d"),
                StockOverview.expiry_date >= datetime.now().strftime("%Y-%m-%d")
            )
        ).all()
        
        # Format results
        expiring_items = []
        
        for batch in expiring_batches:
            days_to_expire = (batch.expiry_date - datetime.now().date()).days
            expiring_items.append({
                "item_name": batch.item_name,
                "batch_no": batch.batch_no,
                "quantity": batch.qty,
                "expiry_date": batch.expiry_date.isoformat(),
                "days_to_expire": days_to_expire,
                "grn_number": batch.grn_number,
                "source": "GRN"
            })
        
        for stock in expiring_stock:
            try:
                expiry_date = datetime.strptime(stock.expiry_date, "%Y-%m-%d").date()
                days_to_expire = (expiry_date - datetime.now().date()).days
                expiring_items.append({
                    "item_name": stock.item_name,
                    "batch_no": stock.batch_no,
                    "quantity": stock.available_qty,
                    "expiry_date": stock.expiry_date,
                    "days_to_expire": days_to_expire,
                    "location": stock.location,
                    "source": "Stock"
                })
            except ValueError:
                continue  # Skip invalid date formats
        
        # Sort by days to expire
        expiring_items.sort(key=lambda x: x["days_to_expire"])
        
        return {
            "total_expiring": len(expiring_items),
            "days_ahead": days_ahead,
            "expiring_items": expiring_items
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync-stock-overview")
def sync_stock_overview(db: Session = Depends(get_tenant_db)):
    """Sync stock overview with latest data from GRN and stock tables"""
    try:
        # Clear existing stock overview
        db.query(StockOverview).delete()
        
        # Get data from Items and GRN
        items_with_stock = db.query(
            Item.name,
            Item.item_code,
            Item.min_stock,
            func.coalesce(func.sum(Batch.qty), 0).label("total_qty")
        ).outerjoin(
            GRNItem, Item.name == GRNItem.item_name
        ).outerjoin(
            Batch, GRNItem.id == Batch.grn_item_id
        ).group_by(
            Item.id, Item.name, Item.item_code, Item.min_stock
        ).all()
        
        # Create new stock overview records
        for item in items_with_stock:
            # Determine status
            if item.total_qty == 0:
                status = "Out of Stock"
            elif item.total_qty <= item.min_stock and item.min_stock > 0:
                status = "Low Stock"
            else:
                status = "In Stock"
            
            # Get latest batch info for this item
            latest_batch = db.query(
                Batch.batch_no,
                Batch.expiry_date,
                Batch.warranty_end_date
            ).join(
                GRNItem, Batch.grn_item_id == GRNItem.id
            ).filter(
                GRNItem.item_name == item.name
            ).order_by(
                Batch.id.desc()
            ).first()
            
            stock_overview = StockOverview(
                item_name=item.name,
                item_code=item.item_code,
                location="Main Store",  # Default location
                available_qty=int(item.total_qty),
                min_stock=item.min_stock or 0,
                warranty=latest_batch.warranty_end_date.isoformat() if latest_batch and latest_batch.warranty_end_date else "—",
                expiry_date=latest_batch.expiry_date.isoformat() if latest_batch and latest_batch.expiry_date else "—",
                batch_no=latest_batch.batch_no if latest_batch else None,
                status=status
            )
            
            db.add(stock_overview)
        
        db.commit()
        
        # Get updated count
        updated_count = db.query(StockOverview).count()
        
        return {
            "message": "Stock overview synchronized successfully",
            "updated_records": updated_count,
            "sync_time": datetime.now().isoformat()
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/movement-history/{item_name}")
def get_stock_movement_history(
    item_name: str,
    limit: int = 50,
    db: Session = Depends(get_tenant_db)
):
    """Get stock movement history for an item"""
    try:
        # Get stock ledger entries
        movements = db.query(StockLedger).join(
            Stock, StockLedger.stock_id == Stock.id
        ).filter(
            Stock.item_name == item_name
        ).order_by(
            StockLedger.created_at.desc()
        ).limit(limit).all()
        
        movement_history = []
        for movement in movements:
            movement_history.append({
                "transaction_type": movement.txn_type,
                "quantity_in": movement.qty_in,
                "quantity_out": movement.qty_out,
                "balance": movement.balance,
                "batch_no": movement.batch_no,
                "reference_no": movement.ref_no,
                "remarks": movement.remarks,
                "created_at": movement.created_at.isoformat() if movement.created_at else None
            })
        
        return {
            "item_name": item_name,
            "total_movements": len(movement_history),
            "movements": movement_history
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reorder-suggestions")
def get_reorder_suggestions(db: Session = Depends(get_tenant_db)):
    """Get items that need reordering based on stock levels"""
    try:
        # Get items below minimum stock
        low_stock_items = db.query(StockOverview).filter(
            and_(
                StockOverview.available_qty <= StockOverview.min_stock,
                StockOverview.min_stock > 0
            )
        ).all()
        
        suggestions = []
        for item in low_stock_items:
            # Calculate suggested order quantity (simple logic: bring to 2x min stock)
            suggested_qty = (item.min_stock * 2) - item.available_qty
            
            suggestions.append({
                "item_name": item.item_name,
                "item_code": item.item_code,
                "current_stock": item.available_qty,
                "min_stock": item.min_stock,
                "suggested_order_qty": max(suggested_qty, item.min_stock),
                "location": item.location,
                "priority": "High" if item.available_qty == 0 else "Medium"
            })
        
        # Sort by priority and shortage
        suggestions.sort(key=lambda x: (x["priority"] == "High", x["current_stock"]))
        
        return {
            "total_suggestions": len(suggestions),
            "high_priority": len([s for s in suggestions if s["priority"] == "High"]),
            "suggestions": suggestions
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))