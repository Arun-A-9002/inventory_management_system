#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migration script to add admin_two_factor_enabled column to master_tenant table
"""

import sqlite3
import os
import sys

# Add the backend directory to the path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_master_db
from sqlalchemy import text

def add_admin_2fa_column():
    """Add admin_two_factor_enabled column to master_tenant table"""
    
    try:
        # Get database connection
        db_gen = get_master_db()
        db = next(db_gen)
        
        # Check if column already exists (MySQL syntax)
        result = db.execute(text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'master_tenant' 
            AND COLUMN_NAME = 'admin_two_factor_enabled'
        """)).fetchall()
        
        if not result:
            print("Adding admin_two_factor_enabled column to master_tenant table...")
            
            # Add the column with default value False (MySQL syntax)
            db.execute(text("ALTER TABLE master_tenant ADD COLUMN admin_two_factor_enabled BOOLEAN DEFAULT FALSE"))
            db.commit()
            
            print("Successfully added admin_two_factor_enabled column")
            print("All existing admin accounts have 2FA disabled by default")
            print("You can enable 2FA for admin accounts through the admin panel")
        else:
            print("admin_two_factor_enabled column already exists")
        
        db.close()
        
    except Exception as e:
        print(f"Error adding admin_two_factor_enabled column: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("Running migration: Add admin 2FA setting...")
    success = add_admin_2fa_column()
    
    if success:
        print("Migration completed successfully!")
        print("\nSummary:")
        print("- Added admin_two_factor_enabled column to master_tenant table")
        print("- All existing admin accounts have 2FA disabled by default")
        print("- Admin users can now control their 2FA setting independently")
    else:
        print("Migration failed!")
        sys.exit(1)