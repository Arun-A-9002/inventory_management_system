#!/usr/bin/env python3

import sqlite3
import sys
import os

def check_returned_quantities():
    """Check returned quantities in the database"""
    
    # Get database path
    db_path = "inventory_management.db"
    
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found!")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check return items with returned quantities
        cursor.execute("""
            SELECT id, return_id, item_name, batch_no, qty, 
                   COALESCE(returned_qty, 0) as returned_qty
            FROM return_items
            ORDER BY return_id, item_name
        """)
        
        results = cursor.fetchall()
        
        if results:
            print("Return Items with Returned Quantities:")
            print("-" * 70)
            print(f"{'Return ID':<10} {'Item':<20} {'Batch':<10} {'Original':<8} {'Returned':<8} {'Remaining':<9}")
            print("-" * 70)
            
            for row in results:
                item_id, return_id, item_name, batch_no, qty, returned_qty = row
                remaining = qty - returned_qty
                print(f"{return_id:<10} {item_name:<20} {batch_no:<10} {qty:<8} {returned_qty:<8} {remaining:<9}")
        else:
            print("No return items found in database")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error checking returned quantities: {e}")
        return False

if __name__ == "__main__":
    print("Checking returned quantities in database...")
    success = check_returned_quantities()
    if not success:
        sys.exit(1)