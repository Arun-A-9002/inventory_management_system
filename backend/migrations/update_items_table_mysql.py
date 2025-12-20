"""
MySQL migration script to update items table:
- Remove reorder_level column
- Add fixing_price column (DECIMAL(10,2), default 0.00)
- Add mrp column (DECIMAL(10,2), default 0.00)

Run this script to update your database schema.
"""

import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def migrate_items_table():
    try:
        # Connect to MySQL database
        conn = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'arun')  # Default tenant database
        )
        cursor = conn.cursor()
        
        print("Starting migration...")
        
        # Check current table structure
        cursor.execute("DESCRIBE items")
        columns = [column[0] for column in cursor.fetchall()]
        print(f"Current columns: {columns}")
        
        # Add fixing_price column if it doesn't exist
        if 'fixing_price' not in columns:
            cursor.execute("ALTER TABLE items ADD COLUMN fixing_price DECIMAL(10,2) DEFAULT 0.00")
            print("Added fixing_price column")
        else:
            print("fixing_price column already exists")
        
        # Add mrp column if it doesn't exist
        if 'mrp' not in columns:
            cursor.execute("ALTER TABLE items ADD COLUMN mrp DECIMAL(10,2) DEFAULT 0.00")
            print("Added mrp column")
        else:
            print("mrp column already exists")
        
        # Update existing records to set default values
        cursor.execute("UPDATE items SET fixing_price = 0.00 WHERE fixing_price IS NULL")
        cursor.execute("UPDATE items SET mrp = 0.00 WHERE mrp IS NULL")
        print("Updated existing records with default values")
        
        # Remove reorder_level column if it exists
        if 'reorder_level' in columns:
            cursor.execute("ALTER TABLE items DROP COLUMN reorder_level")
            print("Removed reorder_level column")
        else:
            print("reorder_level column not found")
        
        conn.commit()
        print("Migration completed successfully!")
        
    except mysql.connector.Error as e:
        print(f"MySQL Error: {e}")
        if conn:
            conn.rollback()
    except Exception as e:
        print(f"Migration failed: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    migrate_items_table()