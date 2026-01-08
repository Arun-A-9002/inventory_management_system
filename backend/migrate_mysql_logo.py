#!/usr/bin/env python3
"""
MySQL Migration script to convert logo column from VARCHAR to BLOB
"""

import pymysql
import urllib.parse

def migrate_logo_column():
    # Database configuration
    DB_USER = "root"
    DB_PASSWORD = ""
    DB_HOST = "localhost"
    DB_PORT = 3306
    TENANT_DB = "arun"  # The tenant database name
    
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
        
        # Check if companies table exists
        cursor.execute("SHOW TABLES LIKE 'companies'")
        if not cursor.fetchone():
            print("Companies table not found!")
            return
        
        # Check current schema
        cursor.execute("DESCRIBE companies")
        columns = cursor.fetchall()
        print("Current companies table schema:")
        for col in columns:
            print(f"  {col[0]} {col[1]}")
        
        # Check if logo column exists and its type
        logo_column = next((col for col in columns if col[0] == 'logo'), None)
        if not logo_column:
            print("Logo column not found!")
            return
            
        if 'blob' in logo_column[1].lower():
            print("Logo column is already BLOB type!")
            return
        
        print(f"\\nMigrating logo column from {logo_column[1]} to LONGBLOB...")
        
        # Modify the logo column to LONGBLOB
        cursor.execute("ALTER TABLE companies MODIFY COLUMN logo LONGBLOB")
        
        conn.commit()
        print("Successfully migrated logo column to LONGBLOB type!")
        print("Note: Existing logo data (if any) has been preserved.")
        
        # Verify the change
        cursor.execute("DESCRIBE companies")
        columns = cursor.fetchall()
        logo_column = next((col for col in columns if col[0] == 'logo'), None)
        print(f"New logo column type: {logo_column[1]}")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        if 'conn' in locals():
            conn.rollback()
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    migrate_logo_column()