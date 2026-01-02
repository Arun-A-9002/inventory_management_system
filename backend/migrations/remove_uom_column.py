"""
MySQL Migration: Remove uom column from items table
"""

import pymysql

def remove_uom_column():
    """Remove uom column from items table"""
    
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
        
        # Check if column exists
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'arun' 
            AND TABLE_NAME = 'items' 
            AND COLUMN_NAME = 'uom'
        """)
        
        if not cursor.fetchone():
            print("uom column doesn't exist")
            return
        
        # Drop uom column
        cursor.execute("ALTER TABLE items DROP COLUMN uom")
        print("Dropped uom column")
        
        connection.commit()
        print("Migration completed successfully")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        connection.rollback()
    finally:
        connection.close()

if __name__ == "__main__":
    remove_uom_column()