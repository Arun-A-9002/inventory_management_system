#!/usr/bin/env python3

import pymysql
import os
from dotenv import load_dotenv

def add_location_type_column():
    """Add location_type column to inventory_locations table in MySQL"""
    
    # Load environment variables
    load_dotenv()
    
    # Database connection details
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'user': os.getenv('DB_USER', 'root'),
        'password': os.getenv('DB_PASSWORD', ''),
        'database': os.getenv('DB_NAME', 'arun'),  # Default tenant database
        'charset': 'utf8mb4'
    }
    
    try:
        # Connect to database
        connection = pymysql.connect(**db_config)
        cursor = connection.cursor()
        
        # Check if table exists
        cursor.execute("SHOW TABLES LIKE 'inventory_locations'")
        if not cursor.fetchone():
            print("inventory_locations table does not exist yet")
            return
        
        # Check if column already exists
        cursor.execute("SHOW COLUMNS FROM inventory_locations LIKE 'location_type'")
        if cursor.fetchone():
            print("location_type column already exists")
            return
        
        # Add location_type column
        cursor.execute("""
            ALTER TABLE inventory_locations 
            ADD COLUMN location_type VARCHAR(20) DEFAULT 'internal'
        """)
        
        # Update existing external locations based on code or name
        cursor.execute("""
            UPDATE inventory_locations 
            SET location_type = 'external' 
            WHERE code = 'EXT' OR LOWER(name) LIKE '%external%'
        """)
        
        connection.commit()
        print("Added location_type column and updated existing records")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'connection' in locals():
            connection.close()

if __name__ == "__main__":
    add_location_type_column()