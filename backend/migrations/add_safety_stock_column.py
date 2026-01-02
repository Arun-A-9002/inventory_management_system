"""
Migration to add safety_stock column to items table
"""

import pymysql
import urllib.parse
from pathlib import Path

def add_safety_stock_column():
    """Add safety_stock column to items table in tenant database"""
    
    # Database configuration
    DB_USER = "root"
    DB_PASSWORD = ""
    DB_HOST = "localhost"
    DB_PORT = 3306
    TENANT_DB = "arun"  # Default tenant database
    
    try:
        # Connect to MySQL
        conn = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT,
            database=TENANT_DB
        )
        cursor = conn.cursor()
        
        # Check if items table exists
        cursor.execute("SHOW TABLES LIKE 'items'")
        if not cursor.fetchone():
            print(f"Items table not found in database {TENANT_DB}")
            return False
        
        # Check if safety_stock column already exists
        cursor.execute("SHOW COLUMNS FROM items LIKE 'safety_stock'")
        if cursor.fetchone():
            print("safety_stock column already exists in items table")
            return True
        
        # Add safety_stock column
        cursor.execute("ALTER TABLE items ADD COLUMN safety_stock INT DEFAULT 0 AFTER max_stock")
        
        conn.commit()
        print("Successfully added safety_stock column to items table")
        return True
        
    except Exception as e:
        print(f"Error adding safety_stock column: {e}")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    add_safety_stock_column()