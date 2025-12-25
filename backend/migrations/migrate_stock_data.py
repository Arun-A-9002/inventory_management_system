"""
Migration script to populate the stocks table with batch-based records
Run this once to migrate existing GRN data to the new stock structure
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from database import get_tenant_engine
from models.tenant_models import Stock, GRN, GRNItem, Batch, GRNStatus, StockLedger

def migrate_stock_data():
    """Migrate all approved GRN data to stocks table"""
    
    # Get database connection
    engine = get_tenant_engine("arun")
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        print("Starting stock data migration...")
        
        # Clear existing stock data
        db.query(Stock).delete()
        db.query(StockLedger).delete()
        db.commit()
        print("Cleared existing stock data")
        
        # Get all approved GRNs
        approved_grns = db.query(GRN).filter(GRN.status == GRNStatus.approved).all()
        print(f"Found {len(approved_grns)} approved GRNs")
        
        stock_count = 0
        
        for grn in approved_grns:
            print(f"Processing GRN: {grn.grn_number}")
            
            # Get all items in this GRN
            grn_items = db.query(GRNItem).filter(GRNItem.grn_id == grn.id).all()
            
            for item in grn_items:
                # Get all batches for this item
                batches = db.query(Batch).filter(Batch.grn_item_id == item.id).all()
                
                for batch in batches:
                    # Create separate stock record for each batch
                    stock = Stock(
                        item_name=item.item_name,
                        sku=batch.batch_no,  # Use batch number as SKU
                        uom=item.uom or "PCS",
                        total_qty=batch.qty,
                        available_qty=batch.qty,
                        reserved_qty=0,
                        reorder_level=0
                    )
                    db.add(stock)
                    db.flush()
                    
                    # Create stock ledger entry
                    ledger = StockLedger(
                        stock_id=stock.id,
                        txn_type="OPENING",
                        qty_in=batch.qty,
                        qty_out=0,
                        balance=stock.available_qty,
                        ref_no=grn.grn_number,
                        remarks=f"Migration: GRN Receipt from {grn.vendor_name} - Batch {batch.batch_no}"
                    )
                    db.add(ledger)
                    
                    stock_count += 1
                    print(f"  Created stock record: {item.item_name} - Batch {batch.batch_no} - Qty {batch.qty}")
        
        db.commit()
        print(f"Migration completed successfully! Created {stock_count} stock records")
        
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {str(e)}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    migrate_stock_data()