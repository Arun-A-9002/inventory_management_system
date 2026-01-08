#!/usr/bin/env python3
"""
Migration script to convert logo binary data to file paths
"""

import sqlite3
import os
from pathlib import Path

def migrate_logo_to_path():
    """Convert existing logo binary data to file paths"""
    
    # Database path
    db_path = "inventory_management.db"
    
    if not os.path.exists(db_path):
        print("Database not found!")
        return
    
    # Create frontend uploads directory if it doesn't exist
    frontend_upload_dir = Path("../frontend/public/uploads")
    frontend_upload_dir.mkdir(exist_ok=True)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if logo_path column exists
        cursor.execute("PRAGMA table_info(companies)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'logo_path' not in columns:
            # Add logo_path column
            cursor.execute("ALTER TABLE companies ADD COLUMN logo_path TEXT")
            print("Added logo_path column to companies table")
        
        # Get companies with logo data
        cursor.execute("SELECT id, name, logo FROM companies WHERE logo IS NOT NULL")
        companies = cursor.fetchall()
        
        for company_id, company_name, logo_data in companies:
            if logo_data:
                # Generate filename
                filename = f"company_logo_{company_id}.png"
                file_path = frontend_upload_dir / filename
                
                # Save logo data to file
                with open(file_path, 'wb') as f:
                    f.write(logo_data)
                
                # Update database with file path
                logo_path = f"/uploads/{filename}"
                cursor.execute("UPDATE companies SET logo_path = ? WHERE id = ?", (logo_path, company_id))
                
                print(f"Migrated logo for company: {company_name}")
        
        # Drop the old logo column (optional - comment out if you want to keep it)
        # cursor.execute("ALTER TABLE companies DROP COLUMN logo")
        
        conn.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_logo_to_path()