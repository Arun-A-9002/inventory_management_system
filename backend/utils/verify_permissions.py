# backend/utils/verify_permissions.py
"""
Script to verify that the new item master permissions are properly assigned.
Usage:
    python backend/utils/verify_permissions.py <tenant_db_name>
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import sessionmaker
from database import get_tenant_engine
from models.tenant_models import Permission, Role

def verify_permissions(tenant_db: str):
    """Verify that new item master permissions exist and are assigned to roles."""
    try:
        engine = get_tenant_engine(tenant_db)
        SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
        db = SessionLocal()

        try:
            # Check if new permissions exist
            new_permissions = db.query(Permission).filter(
                Permission.name.in_([
                    'items.bulk_import',
                    'items.location_access', 
                    'items.master_data_setup'
                ])
            ).all()

            print(f"=== PERMISSION VERIFICATION FOR '{tenant_db}' ===")
            print(f"Found {len(new_permissions)} new item master permissions:")
            for perm in new_permissions:
                print(f"  [OK] {perm.name} - {perm.label}")

            # Check role assignments
            print(f"\n=== ROLE ASSIGNMENTS ===")
            for perm in new_permissions:
                roles = db.query(Role).join(Role.permissions).filter(
                    Permission.name == perm.name
                ).all()
                
                print(f"\nPermission: {perm.name}")
                if roles:
                    print(f"  Assigned to {len(roles)} roles:")
                    for role in roles:
                        print(f"    - {role.name}")
                else:
                    print("  [WARNING] Not assigned to any roles")

        finally:
            db.close()

    except Exception as e:
        print(f"Error: {e}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python verify_permissions.py <tenant_db_name>")
        return

    tenant_db = sys.argv[1]
    verify_permissions(tenant_db)

if __name__ == "__main__":
    main()