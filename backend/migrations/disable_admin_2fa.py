#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script to disable 2FA for all existing admin accounts
"""

import sys
import os

# Add the backend directory to the path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_master_db
from models.register_models import Tenant
from sqlalchemy import text

def disable_admin_2fa():
    """Disable 2FA for all existing admin accounts"""
    
    try:
        # Get database connection
        db_gen = get_master_db()
        db = next(db_gen)
        
        # Update all existing tenants to have 2FA disabled
        result = db.execute(text("UPDATE master_tenant SET admin_two_factor_enabled = FALSE"))
        db.commit()
        
        # Get count of updated records
        count_result = db.execute(text("SELECT COUNT(*) FROM master_tenant")).fetchone()
        total_admins = count_result[0] if count_result else 0
        
        print(f"Successfully disabled 2FA for {total_admins} admin account(s)")
        print("All admin accounts can now login without OTP verification")
        
        db.close()
        
    except Exception as e:
        print(f"Error disabling admin 2FA: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("Disabling 2FA for all admin accounts...")
    success = disable_admin_2fa()
    
    if success:
        print("Operation completed successfully!")
        print("\nSummary:")
        print("- All existing admin accounts now have 2FA disabled")
        print("- Admin users can login directly without OTP")
        print("- Regular users' 2FA settings remain unchanged")
    else:
        print("Operation failed!")
        sys.exit(1)