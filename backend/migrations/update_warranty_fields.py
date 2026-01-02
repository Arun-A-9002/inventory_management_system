"""
Migration to update warranty fields in items table
- Remove warranty_start_date and warranty_end_date columns
- Add warranty_period and warranty_period_type columns
"""

import sqlite3
import os
from pathlib import Path

def migrate_warranty_fields():
    """Update warranty fields in items table"""
    
    # Get the database path
    db_path = Path(__file__).parent / "inventory_management.db"
    
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if the table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='items'")
        if not cursor.fetchone():
            print("Items table not found")
            return
        
        # Check current table structure
        cursor.execute("PRAGMA table_info(items)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        print("Current columns:", column_names)
        
        # Check if new columns already exist
        if 'warranty_period' in column_names and 'warranty_period_type' in column_names:
            print("New warranty columns already exist")
            return
        
        # Add new warranty columns
        if 'warranty_period' not in column_names:
            cursor.execute("ALTER TABLE items ADD COLUMN warranty_period INTEGER DEFAULT 0")
            print("Added warranty_period column")
        
        if 'warranty_period_type' not in column_names:
            cursor.execute("ALTER TABLE items ADD COLUMN warranty_period_type VARCHAR(20) DEFAULT 'years'")
            print("Added warranty_period_type column")
        
        # Note: SQLite doesn't support dropping columns directly
        # The old columns (warranty_start_date, warranty_end_date) will remain but won't be used
        # In a production environment, you might want to create a new table and migrate data
        
        conn.commit()
        print("Migration completed successfully")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_warranty_fields()