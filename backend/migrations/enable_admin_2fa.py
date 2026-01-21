#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script to enable 2FA for admin accounts
"""

import sys
import os

# Add the backend directory to the path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_master_db
from sqlalchemy import text

def enable_admin_2fa():
    """Enable 2FA for all admin accounts"""
    
    try:
        # Get database connection
        db_gen = get_master_db()
        db = next(db_gen)
        
        # Update all existing tenants to have 2FA enabled
        result = db.execute(text("UPDATE master_tenant SET admin_two_factor_enabled = TRUE"))
        db.commit()
        
        # Get count of updated records
        count_result = db.execute(text("SELECT COUNT(*) FROM master_tenant")).fetchone()
        total_admins = count_result[0] if count_result else 0
        
        print(f"Successfully enabled 2FA for {total_admins} admin account(s)")
        print("All admin accounts will now require OTP verification")
        
        db.close()
        
    except Exception as e:
        print(f"Error enabling admin 2FA: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("Enabling 2FA for all admin accounts...")
    success = enable_admin_2fa()
    
    if success:
        print("Operation completed successfully!")
    else:
        print("Operation failed!")
        sys.exit(1)