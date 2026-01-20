# backend/utils/run_item_permissions.py
"""
Quick script to add item master permissions to a tenant.
Run this from the backend directory:
    python utils/run_item_permissions.py
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from add_item_master_permissions import add_permissions_to_tenant, assign_permissions_to_roles

def main():
    # Change this to your tenant database name
    tenant_db = "arun"  # Replace with your actual tenant DB name
    
    print(f"Adding item master permissions to tenant: {tenant_db}")
    
    # Add the new permissions
    if add_permissions_to_tenant(tenant_db):
        print("✓ Permissions added successfully")
        
        # Assign to admin roles
        print("Assigning permissions to admin roles...")
        if assign_permissions_to_roles(tenant_db):
            print("✓ Permissions assigned to admin roles successfully")
        else:
            print("✗ Failed to assign permissions to roles")
    else:
        print("✗ Failed to add permissions")

if __name__ == "__main__":
    main()