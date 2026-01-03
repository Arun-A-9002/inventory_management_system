#!/usr/bin/env python3

import sqlite3
import sys
import os

def add_returned_qty_column():
    """Add returned_qty column to return_items table"""
    
    # Get database path
    db_path = "inventory_management.db"
    
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found!")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(return_items)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'returned_qty' not in columns:
            # Add the returned_qty column
            cursor.execute("""
                ALTER TABLE return_items 
                ADD COLUMN returned_qty DECIMAL(10, 2) DEFAULT 0.00
            """)
            print("Added returned_qty column to return_items table")
        else:
            print("returned_qty column already exists")
        
        conn.commit()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error adding returned_qty column: {e}")
        return False

if __name__ == "__main__":
    print("Adding returned_qty column to return_items table...")
    success = add_returned_qty_column()
    if success:
        print("Migration completed successfully!")
    else:
        print("Migration failed!")
        sys.exit(1)