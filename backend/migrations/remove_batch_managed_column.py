"""
MySQL Migration: Remove is_batch_managed column from items table
"""

import pymysql

def remove_batch_managed_column():
    """Remove is_batch_managed column from items table"""
    
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
            AND COLUMN_NAME = 'is_batch_managed'
        """)
        
        if not cursor.fetchone():
            print("is_batch_managed column doesn't exist")
            return
        
        # Drop is_batch_managed column
        cursor.execute("ALTER TABLE items DROP COLUMN is_batch_managed")
        print("Dropped is_batch_managed column")
        
        connection.commit()
        print("Migration completed successfully")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        connection.rollback()
    finally:
        connection.close()

if __name__ == "__main__":
    remove_batch_managed_column()