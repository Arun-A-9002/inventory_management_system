"""
Check database tables and structure
"""

import sqlite3
import os
from pathlib import Path

def check_database():
    """Check database structure"""
    
    # Get the database path
    db_path = Path(__file__).parent / "inventory_management.db"
    
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        
        print("Available tables:")
        for table in tables:
            print(f"  - {table[0]}")
        
        # Check if there's an items-like table
        for table in tables:
            table_name = table[0]
            if 'item' in table_name.lower():
                print(f"\nStructure of {table_name}:")
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns = cursor.fetchall()
                for col in columns:
                    print(f"  {col[1]} ({col[2]})")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_database()