"""
Add total_amount field to GRN table
Migration script to add total_amount to grns table
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import get_tenant_db

def run_migration():
    """Run the migration to add total_amount field"""
    
    # Get database session
    db_gen = get_tenant_db("arun")
    db = next(db_gen)
    
    try:
        # Add total_amount field to grns table
        migration = "ALTER TABLE grns ADD COLUMN total_amount DECIMAL(10,2) DEFAULT 0.00"
        
        try:
            db.execute(text(migration))
            db.commit()
            print(f"SUCCESS: Executed: {migration}")
            print("SUCCESS: Migration completed successfully!")
        except Exception as e:
            if "Duplicate column name" in str(e) or "already exists" in str(e):
                print(f"WARNING: Column already exists: total_amount")
            else:
                print(f"ERROR: {migration} - {e}")
                db.rollback()
        
    except Exception as e:
        db.rollback()
        print(f"ERROR: Migration failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()