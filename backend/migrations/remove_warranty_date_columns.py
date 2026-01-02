"""
MySQL Migration: Remove old warranty date columns from items table
"""

import pymysql

def remove_warranty_date_columns():
    """Remove warranty_start_date and warranty_end_date columns from items table"""
    
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
        
        # Check if columns exist
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'arun' 
            AND TABLE_NAME = 'items' 
            AND COLUMN_NAME IN ('warranty_start_date', 'warranty_end_date')
        """)
        
        existing_columns = [row[0] for row in cursor.fetchall()]
        
        if not existing_columns:
            print("Warranty date columns don't exist")
            return
        
        # Drop warranty_start_date column
        if 'warranty_start_date' in existing_columns:
            cursor.execute("ALTER TABLE items DROP COLUMN warranty_start_date")
            print("Dropped warranty_start_date column")
        
        # Drop warranty_end_date column
        if 'warranty_end_date' in existing_columns:
            cursor.execute("ALTER TABLE items DROP COLUMN warranty_end_date")
            print("Dropped warranty_end_date column")
        
        connection.commit()
        print("Migration completed successfully")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        connection.rollback()
    finally:
        connection.close()

if __name__ == "__main__":
    remove_warranty_date_columns()