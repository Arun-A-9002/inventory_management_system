#!/usr/bin/env python3
"""
Migration script to convert logo column from VARCHAR to BLOB
"""

import sqlite3
import os

def migrate_logo_column():
    db_path = "inventory_management.db"
    
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found!")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if companies table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='companies'")
        if not cursor.fetchone():
            print("Companies table not found!")
            return
        
        # Check current schema
        cursor.execute("PRAGMA table_info(companies)")
        columns = cursor.fetchall()
        print("Current companies table schema:")
        for col in columns:
            print(f"  {col[1]} {col[2]}")
        
        # Check if logo column is already BLOB
        logo_column = next((col for col in columns if col[1] == 'logo'), None)
        if logo_column and 'BLOB' in logo_column[2].upper():
            print("Logo column is already BLOB type!")
            return
        
        print("\nMigrating logo column to BLOB...")
        
        # Create new table with BLOB logo column
        cursor.execute("""
            CREATE TABLE companies_new (
                id INTEGER PRIMARY KEY,
                name VARCHAR(191) NOT NULL,
                code VARCHAR(100),
                gst_number VARCHAR(100),
                address TEXT,
                contact_person VARCHAR(191),
                email VARCHAR(191),
                phone VARCHAR(100),
                logo BLOB,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME
            )
        """)
        
        # Copy data from old table to new table (logo will be NULL for existing records)
        cursor.execute("""
            INSERT INTO companies_new (id, name, code, gst_number, address, contact_person, email, phone, is_active, created_at, updated_at)
            SELECT id, name, code, gst_number, address, contact_person, email, phone, is_active, created_at, updated_at
            FROM companies
        """)
        
        # Drop old table
        cursor.execute("DROP TABLE companies")
        
        # Rename new table
        cursor.execute("ALTER TABLE companies_new RENAME TO companies")
        
        conn.commit()
        print("Successfully migrated logo column to BLOB type!")
        print("Note: Existing logo data (if any) has been cleared and will need to be re-uploaded.")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_logo_column()