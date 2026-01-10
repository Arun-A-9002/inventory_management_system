# backend/utils/bulk_seed_permissions.py
"""
Utility script to seed permissions for all existing tenants.
Usage:
    python backend/utils/bulk_seed_permissions.py
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import sessionmaker
from database import get_master_db
from models.register_models import Tenant
from utils.seed_permission import seed_permissions_for_tenant


def bulk_seed_permissions():
    """
    Seed permissions for all existing tenants in the master database.
    """
    print("Starting bulk permission seeding for all tenants...")
    
    # Get master database session
    master_db = next(get_master_db())
    
    try:
        # Get all tenants
        tenants = master_db.query(Tenant).all()
        
        if not tenants:
            print("No tenants found in master database.")
            return
        
        print(f"Found {len(tenants)} tenants. Starting permission seeding...")
        
        success_count = 0
        failed_count = 0
        
        for tenant in tenants:
            print(f"\nProcessing tenant: {tenant.organization_name} (DB: {tenant.database_name})")
            
            if seed_permissions_for_tenant(tenant.database_name):
                success_count += 1
                print(f"✓ Successfully seeded permissions for {tenant.organization_name}")
            else:
                failed_count += 1
                print(f"✗ Failed to seed permissions for {tenant.organization_name}")
        
        print(f"\n=== BULK SEEDING SUMMARY ===")
        print(f"Total tenants: {len(tenants)}")
        print(f"Successfully seeded: {success_count}")
        print(f"Failed: {failed_count}")
        
    except Exception as e:
        print(f"Error during bulk seeding: {e}")
    
    finally:
        master_db.close()


if __name__ == "__main__":
    bulk_seed_permissions()