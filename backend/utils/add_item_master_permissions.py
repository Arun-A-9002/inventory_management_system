# backend/utils/add_item_master_permissions.py
"""
Script to add new item master permissions to existing tenants and roles.
Usage:
    python backend/utils/add_item_master_permissions.py <tenant_db_name>
    python backend/utils/add_item_master_permissions.py --bulk  # For all tenants
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import sessionmaker
from database import get_tenant_engine, get_master_db
from models.tenant_models import TenantBase, Permission, Role
from models.register_models import Tenant

# New permissions to add
NEW_PERMISSIONS = [
    ("items.bulk_import", "Items — Bulk Import", "Item Master"),
    ("items.location_access", "Items — Location Access", "Item Master"),
    ("items.master_data_setup", "Items — Master Data Setup", "Item Master"),
]

def add_permissions_to_tenant(tenant_db: str) -> bool:
    """Add new permissions to a specific tenant database."""
    try:
        engine = get_tenant_engine(tenant_db)
        SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
        db = SessionLocal()

        try:
            added = 0
            for name, label, group in NEW_PERMISSIONS:
                exists = db.query(Permission).filter(Permission.name == name).first()
                if exists:
                    print(f"  Permission '{name}' already exists, skipping...")
                    continue
                
                perm = Permission(name=name, label=label, group=group)
                db.add(perm)
                added += 1
                print(f"  Added permission: {name}")

            db.commit()
            print(f"Successfully added {added} new permissions to '{tenant_db}'")
            return True

        except Exception as e:
            db.rollback()
            print(f"Failed to add permissions to '{tenant_db}': {e}")
            return False

        finally:
            db.close()

    except Exception as e:
        print(f"Failed to connect to tenant DB '{tenant_db}': {e}")
        return False

def assign_permissions_to_roles(tenant_db: str, role_names: list = None) -> bool:
    """Assign new permissions to specified roles or all admin roles."""
    try:
        engine = get_tenant_engine(tenant_db)
        SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
        db = SessionLocal()

        try:
            # Get the new permissions
            new_perms = db.query(Permission).filter(
                Permission.name.in_([perm[0] for perm in NEW_PERMISSIONS])
            ).all()
            
            if not new_perms:
                print(f"  No new permissions found in '{tenant_db}'")
                return True

            # If no specific roles provided, assign to admin-like roles
            if not role_names:
                role_names = ['Admin', 'Administrator', 'Super Admin', 'System Admin']
            
            roles_updated = 0
            for role_name in role_names:
                role = db.query(Role).filter(Role.name.ilike(f"%{role_name}%")).first()
                if role:
                    # Add new permissions to existing role permissions
                    existing_perm_ids = [p.id for p in role.permissions]
                    new_perm_ids = [p.id for p in new_perms if p.id not in existing_perm_ids]
                    
                    if new_perm_ids:
                        role.permissions.extend([p for p in new_perms if p.id in new_perm_ids])
                        roles_updated += 1
                        print(f"  Added {len(new_perm_ids)} permissions to role '{role.name}'")

            db.commit()
            print(f"Successfully updated {roles_updated} roles in '{tenant_db}'")
            return True

        except Exception as e:
            db.rollback()
            print(f"Failed to assign permissions to roles in '{tenant_db}': {e}")
            return False

        finally:
            db.close()

    except Exception as e:
        print(f"Failed to connect to tenant DB '{tenant_db}': {e}")
        return False

def main():
    if len(sys.argv) < 2:
        print("ERROR: Provide tenant DB name or --bulk flag.")
        print("Example: python add_item_master_permissions.py arun")
        print("Example: python add_item_master_permissions.py --bulk")
        return

    if sys.argv[1] == "--bulk":
        # Process all tenants
        print("Processing all tenants...")
        
        master_db = next(get_master_db())
        try:
            tenants = master_db.query(Tenant).all()
            
            if not tenants:
                print("No tenants found in master database.")
                return
            
            print(f"Found {len(tenants)} tenants. Processing...")
            
            success_count = 0
            failed_count = 0
            
            for tenant in tenants:
                print(f"\nProcessing tenant: {tenant.organization_name} (DB: {tenant.database_name})")
                
                # Add permissions
                if add_permissions_to_tenant(tenant.database_name):
                    # Assign to admin roles
                    assign_permissions_to_roles(tenant.database_name)
                    success_count += 1
                    print(f"✓ Successfully processed {tenant.organization_name}")
                else:
                    failed_count += 1
                    print(f"✗ Failed to process {tenant.organization_name}")
            
            print(f"\n=== BULK PROCESSING SUMMARY ===")
            print(f"Total tenants: {len(tenants)}")
            print(f"Successfully processed: {success_count}")
            print(f"Failed: {failed_count}")
            
        except Exception as e:
            print(f"Error during bulk processing: {e}")
        
        finally:
            master_db.close()
    
    else:
        # Process single tenant
        tenant_db = sys.argv[1]
        print(f"Processing tenant DB: {tenant_db}")
        
        # Ensure tables exist
        engine = get_tenant_engine(tenant_db)
        TenantBase.metadata.create_all(bind=engine)
        
        # Add permissions
        if add_permissions_to_tenant(tenant_db):
            # Ask user about role assignment
            print("\nWould you like to assign these permissions to admin roles? (y/n): ", end="")
            response = input().lower().strip()
            
            if response in ['y', 'yes']:
                assign_permissions_to_roles(tenant_db)
            
            print(f"\nCompleted processing for '{tenant_db}'")
        else:
            print(f"Failed to process '{tenant_db}'")

if __name__ == "__main__":
    main()