"""
Script to check what tables exist in the database
"""

import sqlite3
from pathlib import Path

def check_database_tables():
    """Check what tables exist in the database"""
    
    # Get the database path
    backend_dir = Path(__file__).parent.parent
    db_path = backend_dir / "inventory_management.db"
    
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        print("Tables in database:")
        print("-" * 30)
        for table in tables:
            print(f"- {table[0]}")
            
        print(f"\nTotal tables: {len(tables)}")
        
        return True
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    check_database_tables()