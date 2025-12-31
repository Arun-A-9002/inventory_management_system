#!/usr/bin/env python3

import sqlite3
import os

def add_location_type_column():
    """Add location_type column to inventory_locations table"""
    
    # Database path
    db_path = "inventory_management.db"
    
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found!")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # List all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print("Available tables:", [table[0] for table in tables])
        
        # Check if inventory_locations table exists
        if ('inventory_locations',) not in tables:
            print("inventory_locations table does not exist yet")
            return
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(inventory_locations)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'location_type' not in columns:
            # Add location_type column
            cursor.execute("""
                ALTER TABLE inventory_locations 
                ADD COLUMN location_type TEXT DEFAULT 'internal'
            """)
            
            # Update existing external locations based on code or name
            cursor.execute("""
                UPDATE inventory_locations 
                SET location_type = 'external' 
                WHERE code = 'EXT' OR LOWER(name) LIKE '%external%'
            """)
            
            conn.commit()
            print("Added location_type column and updated existing records")
        else:
            print("location_type column already exists")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    add_location_type_column()