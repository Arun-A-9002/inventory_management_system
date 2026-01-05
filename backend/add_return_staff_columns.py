"""
Add return staff details columns to return_headers table
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_tenant_db
from sqlalchemy import text

def add_return_staff_columns():
    """Add return staff details columns to return_headers table"""
    try:
        db = next(get_tenant_db())
        
        # Add columns one by one with error handling
        columns_to_add = [
            ("return_staff_name", "VARCHAR(255) NULL"),
            ("return_staff_phone", "VARCHAR(20) NULL"),
            ("return_staff_email", "VARCHAR(191) NULL"),
            ("staff_change_reason", "TEXT NULL")
        ]
        
        for column_name, column_def in columns_to_add:
            try:
                db.execute(text(f"ALTER TABLE return_headers ADD COLUMN {column_name} {column_def}"))
                print(f"✅ Added column: {column_name}")
            except Exception as e:
                if "Duplicate column name" in str(e) or "already exists" in str(e):
                    print(f"⚠️ Column {column_name} already exists")
                else:
                    print(f"❌ Error adding {column_name}: {e}")
        
        db.commit()
        print("✅ Migration completed successfully")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        if 'db' in locals():
            db.rollback()
    finally:
        if 'db' in locals():
            db.close()

if __name__ == "__main__":
    print("🚀 Adding return staff details columns...")
    add_return_staff_columns()