"""
Check existing tables in the database
"""

import sqlite3
import os
from pathlib import Path

def check_tables():
    """Check what tables exist in the database"""
    
    # Get the database path
    backend_dir = Path(__file__).parent
    db_path = backend_dir / "inventory_management.db"
    
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        
        print("Existing tables:")
        for table in tables:
            print(f"  - {table[0]}")
            
        # Check if items table exists and show its structure
        if any('items' in table for table in tables):
            cursor.execute("PRAGMA table_info(items)")
            columns = cursor.fetchall()
            print("\nItems table structure:")
            for column in columns:
                print(f"  - {column[1]} ({column[2]})")
        
    except Exception as e:
        print(f"Error checking tables: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    check_tables()