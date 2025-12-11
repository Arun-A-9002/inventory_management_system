# backend/utils/seed_permission.py
"""
Run this script to seed permissions into a tenant database.
Usage:
    python backend/utils/seed_permission.py arun
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import sessionmaker
from database import get_tenant_engine
from models.tenant_models import TenantBase, Permission

# ---------- PERMISSIONS LIST ----------
PERMISSIONS = [
    # Departments
    ("departments.view", "Departments — View", "Departments"),
    ("departments.create", "Departments — Create", "Departments"),
    ("departments.update", "Departments — Update", "Departments"),
    ("departments.delete", "Departments — Delete", "Departments"),

    # Roles
    ("roles.view", "Roles — View", "Roles"),
    ("roles.create", "Roles — Create", "Roles"),
    ("roles.update", "Roles — Update", "Roles"),
    ("roles.delete", "Roles — Delete", "Roles"),

    # Users
    ("users.view", "Users — View", "Users"),
    ("users.create", "Users — Create", "Users"),
    ("users.update", "Users — Update", "Users"),
    ("users.delete", "Users — Delete", "Users"),

    # Inventory (for future modules)
    ("inventory.view", "Inventory — View", "Inventory"),
    ("inventory.create", "Inventory — Create", "Inventory"),
    ("inventory.update", "Inventory — Update", "Inventory"),
    ("inventory.delete", "Inventory — Delete", "Inventory"),

    # Reports (for future modules)
    ("reports.view", "Reports — View", "Reports"),
    ("reports.create", "Reports — Create", "Reports"),

    # Settings (for future modules)
    ("settings.view", "Settings — View", "Settings"),
    ("settings.update", "Settings — Update", "Settings"),
]


def main():
    if len(sys.argv) < 2:
        print("❌ ERROR: Provide tenant DB name.\nExample: python seed_permission.py arun")
        return

    tenant_db = sys.argv[1]
    print(f"🔄 Connecting to tenant DB: {tenant_db}")

    engine = get_tenant_engine(tenant_db)

    # Make sure tables exist
    TenantBase.metadata.create_all(bind=engine)

    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    db = SessionLocal()

    try:
        added = 0
        for name, label, group in PERMISSIONS:
            exists = db.query(Permission).filter(Permission.name == name).first()
            if exists:
                continue
            perm = Permission(name=name, label=label, group=group)
            db.add(perm)
            added += 1
            print(f"✔ Added permission: {name}")

        db.commit()
        print(f"\n✅ Permission seeding completed for '{tenant_db}'.")
        print(f"Total new permissions added: {added}")

    except Exception as e:
        db.rollback()
        print("❌ Seeding failed:", e)

    finally:
        db.close()


if __name__ == "__main__":
    main()
