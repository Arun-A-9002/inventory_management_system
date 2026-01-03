#!/usr/bin/env python3

import pymysql
import sys
import os
from dotenv import load_dotenv

def add_returned_qty_column():
    """Add returned_qty column to return_items table for MySQL"""
    
    # Load environment variables
    load_dotenv()
    
    # Database connection parameters
    db_config = {
        'host': 'localhost',
        'user': 'root',
        'password': '',
        'database': 'arun',  # Use the actual tenant database name
        'charset': 'utf8mb4'
    }
    
    try:
        # Connect to database
        connection = pymysql.connect(**db_config)
        cursor = connection.cursor()
        
        # Check if column already exists
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = %s 
            AND TABLE_NAME = 'return_items' 
            AND COLUMN_NAME = 'returned_qty'
        """, (db_config['database'],))
        
        if cursor.fetchone():
            print("returned_qty column already exists")
        else:
            # Add the returned_qty column
            cursor.execute("""
                ALTER TABLE return_items 
                ADD COLUMN returned_qty DECIMAL(10, 2) DEFAULT 0.00
            """)
            print("Added returned_qty column to return_items table")
        
        connection.commit()
        cursor.close()
        connection.close()
        return True
        
    except Exception as e:
        print(f"Error adding returned_qty column: {e}")
        return False

if __name__ == "__main__":
    print("Adding returned_qty column to return_items table (MySQL)...")
    success = add_returned_qty_column()
    if success:
        print("Migration completed successfully!")
    else:
        print("Migration failed!")
        sys.exit(1)