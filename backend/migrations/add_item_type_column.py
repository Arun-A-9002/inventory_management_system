"""
MySQL Migration: Add item_type column to items table
"""

import pymysql

def add_item_type_column():
    """Add item_type column to items table"""
    
    DB_CONFIG = {
        'host': 'localhost',
        'user': 'root',
        'password': '',
        'database': 'arun',
        'port': 3306
    }
    
    try:
        connection = pymysql.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        print("Connected to MySQL database")
        
        # Check if column already exists
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'arun' 
            AND TABLE_NAME = 'items' 
            AND COLUMN_NAME = 'item_type'
        """)
        
        if cursor.fetchone():
            print("item_type column already exists")
            return
        
        # Add item_type column
        cursor.execute("""
            ALTER TABLE items 
            ADD COLUMN item_type VARCHAR(20) NOT NULL DEFAULT 'consumable'
            AFTER manufacturer
        """)
        print("Added item_type column")
        
        connection.commit()
        print("Migration completed successfully")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        connection.rollback()
    finally:
        connection.close()

if __name__ == "__main__":
    add_item_type_column()