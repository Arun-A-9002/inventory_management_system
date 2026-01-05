"""
Migration script to add bank details columns to vendors table
"""

import sqlite3
import os
from pathlib import Path

def add_vendor_bank_details():
    """Add bank details columns to vendors table"""
    
    # Get the database path
    db_path = Path(__file__).parent.parent / "inventory_management.db"
    
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(vendors)")
        columns = [column[1] for column in cursor.fetchall()]
        
        bank_columns = ['ifsc_code', 'account_number', 'account_holder_name', 'branch_name']
        
        for column in bank_columns:
            if column not in columns:
                if column in ['ifsc_code', 'account_number']:
                    cursor.execute(f"ALTER TABLE vendors ADD COLUMN {column} VARCHAR(30)")
                else:
                    cursor.execute(f"ALTER TABLE vendors ADD COLUMN {column} VARCHAR(150)")
                print(f"Added column: {column}")
            else:
                print(f"Column {column} already exists")
        
        conn.commit()
        print("Bank details columns added successfully to vendors table")
        return True
        
    except Exception as e:
        print(f"Error adding bank details columns: {e}")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    add_vendor_bank_details()