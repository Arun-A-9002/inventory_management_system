# backend/utils/remove_auto_permissions.py
"""
Script to remove automatically assigned item master permissions from roles.
Usage:
    python backend/utils/remove_auto_permissions.py <tenant_db_name>
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import sessionmaker
from database import get_tenant_engine
from models.tenant_models import Permission, Role

def remove_auto_permissions(tenant_db: str):
    """Remove new item master permissions from all roles."""
    try:
        engine = get_tenant_engine(tenant_db)
        SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
        db = SessionLocal()

        try:
            # Get the permissions to remove
            permissions_to_remove = db.query(Permission).filter(
                Permission.name.in_([
                    'items.bulk_import',
                    'items.location_access', 
                    'items.master_data_setup'
                ])
            ).all()

            if not permissions_to_remove:
                print("Permissions not found.")
                return

            # Remove from all roles
            roles = db.query(Role).all()
            updated_roles = 0

            for role in roles:
                perms_to_remove = [p for p in role.permissions if p.name in [
                    'items.bulk_import', 'items.location_access', 'items.master_data_setup'
                ]]
                
                if perms_to_remove:
                    for perm in perms_to_remove:
                        role.permissions.remove(perm)
                    updated_roles += 1
                    print(f"Removed {len(perms_to_remove)} permissions from role: {role.name}")

            db.commit()
            print(f"Successfully removed permissions from {updated_roles} roles in '{tenant_db}'")

        except Exception as e:
            db.rollback()
            print(f"Error: {e}")
        finally:
            db.close()

    except Exception as e:
        print(f"Failed to connect to tenant DB '{tenant_db}': {e}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python remove_auto_permissions.py <tenant_db_name>")
        return

    tenant_db = sys.argv[1]
    remove_auto_permissions(tenant_db)

if __name__ == "__main__":
    main()