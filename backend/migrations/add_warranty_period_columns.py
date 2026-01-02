"""
MySQL Migration: Add warranty period columns to items table
Run this script to add warranty_period and warranty_period_type columns
"""

import pymysql
import sys

def migrate_warranty_fields():
    """Add warranty period columns to items table"""
    
    # Database configuration
    DB_CONFIG = {
        'host': 'localhost',
        'user': 'root',
        'password': '',
        'database': 'arun',
        'port': 3306
    }
    
    try:
        # Connect to database
        connection = pymysql.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        print("Connected to MySQL database")
        
        # Check if columns already exist
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'arun' 
            AND TABLE_NAME = 'items' 
            AND COLUMN_NAME IN ('warranty_period', 'warranty_period_type')
        """)
        
        existing_columns = [row[0] for row in cursor.fetchall()]
        
        if 'warranty_period' in existing_columns and 'warranty_period_type' in existing_columns:
            print("Warranty period columns already exist")
            return
        
        # Add warranty_period column
        if 'warranty_period' not in existing_columns:
            cursor.execute("""
                ALTER TABLE items 
                ADD COLUMN warranty_period INT DEFAULT 0 
                AFTER has_warranty
            """)
            print("Added warranty_period column")
        
        # Add warranty_period_type column
        if 'warranty_period_type' not in existing_columns:
            cursor.execute("""
                ALTER TABLE items 
                ADD COLUMN warranty_period_type VARCHAR(20) DEFAULT 'years' 
                AFTER warranty_period
            """)
            print("Added warranty_period_type column")
        
        # Commit changes
        connection.commit()
        print("Migration completed successfully")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        if 'connection' in locals():
            connection.rollback()
        sys.exit(1)
    finally:
        if 'connection' in locals():
            connection.close()
            print("Database connection closed")

if __name__ == "__main__":
    migrate_warranty_fields()