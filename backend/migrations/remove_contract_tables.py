#!/usr/bin/env python3
"""
Migration script to remove contract management tables
Run this script to drop vendor_contracts and vendor_contract_items tables
"""

import sqlite3
import os

def remove_contract_tables():
    """Remove contract-related tables from the database"""
    
    # Database path
    db_path = os.path.join(os.path.dirname(__file__), '..', 'inventory_management.db')
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("Removing contract management tables...")
        
        # Drop vendor_contract_items table first (due to foreign key constraint)
        cursor.execute("DROP TABLE IF EXISTS vendor_contract_items")
        print("✓ Dropped vendor_contract_items table")
        
        # Drop vendor_contracts table
        cursor.execute("DROP TABLE IF EXISTS vendor_contracts")
        print("✓ Dropped vendor_contracts table")
        
        # Commit changes
        conn.commit()
        print("✓ Contract management tables removed successfully!")
        
    except sqlite3.Error as e:
        print(f"✗ Database error: {e}")
    except Exception as e:
        print(f"✗ Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    remove_contract_tables()