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

    # Company
    ("company.view", "Company — View", "Organization"),
    ("company.create", "Company — Create", "Organization"),
    ("company.edit", "Company — Edit", "Organization"),
    ("company.delete", "Company — Delete", "Organization"),

    # Branch
    ("branch.view", "Branch — View", "Organization"),
    ("branch.create", "Branch — Create", "Organization"),
    ("branch.edit", "Branch — Edit", "Organization"),
    ("branch.delete", "Branch — Delete", "Organization"),

    # Store
    ("store.view", "Store — View", "Organization"),
    ("store.create", "Store — Create", "Organization"),
    ("store.edit", "Store — Edit", "Organization"),
    ("store.delete", "Store — Delete", "Organization"),

    # Department (view only)
    ("department.view", "Department — View", "Organization"),

    # Item Master
    ("items.view", "Items — View", "Item Master"),
    ("items.create", "Items — Create", "Item Master"),
    ("items.edit", "Items — Edit", "Item Master"),
    ("items.delete", "Items — Delete", "Item Master"),

    # Category
    ("category.view", "Category — View", "Master Data"),
    ("category.create", "Category — Create", "Master Data"),
    ("category.edit", "Category — Edit", "Master Data"),
    ("category.delete", "Category — Delete", "Master Data"),

    # Sub Category
    ("subcategory.view", "Sub Category — View", "Master Data"),
    ("subcategory.create", "Sub Category — Create", "Master Data"),
    ("subcategory.edit", "Sub Category — Edit", "Master Data"),
    ("subcategory.delete", "Sub Category — Delete", "Master Data"),

    # Brand
    ("brand.view", "Brand — View", "Master Data"),
    ("brand.create", "Brand — Create", "Master Data"),
    ("brand.edit", "Brand — Edit", "Master Data"),
    ("brand.delete", "Brand — Delete", "Master Data"),

    # Master Data Setup
    ("masterdata.setup", "Master Data — Setup Access", "Master Data"),

    # Vendor Management
    ("vendors.view", "Vendors — View", "Vendor Management"),
    ("vendors.create", "Vendors — Create", "Vendor Management"),
    ("vendors.edit", "Vendors — Edit", "Vendor Management"),
    ("vendors.delete", "Vendors — Delete", "Vendor Management"),
    ("vendors.status", "Vendors — Change Status", "Vendor Management"),

    # Customer Management
    ("customers.view", "Customers — View", "Customer Management"),
    ("customers.create", "Customers — Create", "Customer Management"),
    ("customers.edit", "Customers — Edit", "Customer Management"),
    ("customers.delete", "Customers — Delete", "Customer Management"),
    ("customers.status", "Customers — Change Status", "Customer Management"),

    # Location Management
    ("locations.view", "Locations — View", "Location Management"),
    ("locations.create_internal", "Locations — Create Internal", "Location Management"),
    ("locations.create_external", "Locations — Create External", "Location Management"),
    ("locations.edit", "Locations — Edit", "Location Management"),
    ("locations.delete", "Locations — Delete", "Location Management"),

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

    # Purchase Management
    ("purchase_request.view", "Purchase Request — View", "Purchase Management"),
    ("purchase_request.create", "Purchase Request — Create", "Purchase Management"),
    ("purchase_request.edit", "Purchase Request — Edit", "Purchase Management"),
    ("purchase_request.delete", "Purchase Request — Delete", "Purchase Management"),
    ("purchase_request.status", "Purchase Request — Change Status", "Purchase Management"),
    ("purchase_request.send_po", "Purchase Request — Send Purchase Order", "Purchase Management"),
    ("purchase_order.view", "Purchase Order — View", "Purchase Management"),
    ("purchase_order.print", "Purchase Order — Print", "Purchase Management"),
    ("purchase_order.download", "Purchase Order — Download", "Purchase Management"),
]


def main():
    if len(sys.argv) < 2:
        print("ERROR: Provide tenant DB name.\nExample: python seed_permission.py arun")
        return

    tenant_db = sys.argv[1]
    print(f"Connecting to tenant DB: {tenant_db}")

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
            print(f"Added permission: {name}")

        db.commit()
        print(f"\nPermission seeding completed for '{tenant_db}'.")
        print(f"Total new permissions added: {added}")

    except Exception as e:
        db.rollback()
        print("Seeding failed:", e)

    finally:
        db.close()


if __name__ == "__main__":
    main()
