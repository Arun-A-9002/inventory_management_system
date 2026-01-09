#!/usr/bin/env python3
"""
Migration script to add tenant_code column to master_tenant table
"""

import pymysql

def add_tenant_code_column():
    try:
        # Connect to the database
        conn = pymysql.connect(
            host="localhost",
            user="root",
            password="",
            port=3306,
            database="ims_master"
        )
        
        cursor = conn.cursor()
        
        # Add the tenant_code column
        alter_query = """
        ALTER TABLE master_tenant 
        ADD COLUMN tenant_code VARCHAR(50) AFTER designation
        """
        
        cursor.execute(alter_query)
        conn.commit()
        
        print("Successfully added tenant_code column to master_tenant table")
        
    except pymysql.err.OperationalError as e:
        if "Duplicate column name" in str(e):
            print("tenant_code column already exists")
        else:
            print(f"Error: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    add_tenant_code_column()