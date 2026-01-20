# backend/utils/add_permissions_to_roles.py
"""
Script to add new item master permissions to existing roles.
Usage:
    python backend/utils/add_permissions_to_roles.py <tenant_db_name>
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import sessionmaker
from database import get_tenant_engine
from models.tenant_models import TenantBase, Permission, Role

def add_permissions_to_roles(tenant_db: str):
    """Add new item master permissions to existing roles."""
    try:
        engine = get_tenant_engine(tenant_db)
        SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
        db = SessionLocal()

        try:
            # Get the new permissions
            new_permissions = db.query(Permission).filter(
                Permission.name.in_([
                    'items.bulk_import',
                    'items.location_access', 
                    'items.master_data_setup'
                ])
            ).all()

            if not new_permissions:
                print("New permissions not found. Run seed_permission.py first.")
                return

            # Get all roles that have items.view permission (likely need the new ones too)
            roles_with_items_view = db.query(Role).join(Role.permissions).filter(
                Permission.name == 'items.view'
            ).all()

            updated_roles = 0
            for role in roles_with_items_view:
                existing_perm_names = [p.name for p in role.permissions]
                perms_to_add = [p for p in new_permissions if p.name not in existing_perm_names]
                
                if perms_to_add:
                    role.permissions.extend(perms_to_add)
                    updated_roles += 1
                    print(f"Added {len(perms_to_add)} permissions to role: {role.name}")

            db.commit()
            print(f"Successfully updated {updated_roles} roles in '{tenant_db}'")

        except Exception as e:
            db.rollback()
            print(f"Error: {e}")
        finally:
            db.close()

    except Exception as e:
        print(f"Failed to connect to tenant DB '{tenant_db}': {e}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python add_permissions_to_roles.py <tenant_db_name>")
        return

    tenant_db = sys.argv[1]
    add_permissions_to_roles(tenant_db)

if __name__ == "__main__":
    main()