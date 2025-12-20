import sqlite3
import os

def check_database():
    db_path = "inventory_management.db"
    
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found!")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("Available tables:")
        for table in tables:
            print(f"  - {table[0]}")
        
        # Check if items table exists in any tenant database
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%items%';")
        item_tables = cursor.fetchall()
        print("\nItem-related tables:")
        for table in item_tables:
            print(f"  - {table[0]}")
            
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_database()