# backend/utils/seed_permission.py
"""
Run this script to seed permissions into a tenant database based on subscription tier.
Usage:
    python backend/utils/seed_permission.py arun
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import sessionmaker
from database import get_tenant_engine, get_master_db
from models.tenant_models import TenantBase, Permission, Role, SubscriptionTier
from models.register_models import Tenant
from utils.subscription_permissions import get_permissions_for_tier, get_permission_tier

# ---------- PERMISSIONS LIST ----------
# This is kept for backward compatibility but now permissions are managed
# through subscription tiers in utils/subscription_permissions.py
PERMISSIONS = []  # Deprecated - use subscription_permissions.py instead


def add_new_permissions_to_existing_roles(db):
    """Add new item master permissions to roles that have items.view permission."""
    # Commented out to make permissions selective
    # These permissions should be manually assigned through the admin interface
    pass


def seed_permissions_for_tenant(tenant_db: str, subscription_tier: SubscriptionTier = SubscriptionTier.BASIC) -> bool:
    """
    Seed permissions for a specific tenant database based on their subscription tier.
    Returns True if successful, False otherwise.
    """
    try:
        engine = get_tenant_engine(tenant_db)
        SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
        db = SessionLocal()

        try:
            # Get permissions for the tenant's subscription tier
            permissions_to_add = get_permissions_for_tier(subscription_tier)
            
            added = 0
            for name, label, group in permissions_to_add:
                exists = db.query(Permission).filter(Permission.name == name).first()
                if exists:
                    continue
                
                # Determine the minimum tier required for this permission
                required_tier = get_permission_tier(name)
                
                perm = Permission(
                    name=name, 
                    label=label, 
                    group=group,
                    subscription_tier=required_tier
                )
                db.add(perm)
                added += 1

            db.commit()
            
            print(f"Permission seeding completed for '{tenant_db}' ({subscription_tier.value} tier). Added {added} permissions.")
            return True

        except Exception as e:
            db.rollback()
            print(f"Permission seeding failed for '{tenant_db}': {e}")
            return False

        finally:
            db.close()

    except Exception as e:
        print(f"Failed to connect to tenant DB '{tenant_db}': {e}")
        return False


def main():
    if len(sys.argv) < 2:
        print("ERROR: Provide tenant DB name.\nExample: python seed_permission.py arun")
        return

    tenant_db = sys.argv[1]
    print(f"Connecting to tenant DB: {tenant_db}")
    
    # Get tenant's subscription tier from master database
    master_db = next(get_master_db())
    try:
        tenant = master_db.query(Tenant).filter(Tenant.database_name == tenant_db).first()
        if not tenant:
            print(f"Tenant with database '{tenant_db}' not found in master database.")
            return
        
        subscription_tier = tenant.subscription_tier
        print(f"Tenant subscription tier: {subscription_tier.value}")
    except Exception as e:
        print(f"Error getting tenant info: {e}")
        subscription_tier = SubscriptionTier.BASIC
    finally:
        master_db.close()

    engine = get_tenant_engine(tenant_db)

    # Make sure tables exist
    TenantBase.metadata.create_all(bind=engine)

    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    db = SessionLocal()

    try:
        # Get permissions for the tenant's subscription tier
        permissions_to_add = get_permissions_for_tier(subscription_tier)
        
        added = 0
        for name, label, group in permissions_to_add:
            exists = db.query(Permission).filter(Permission.name == name).first()
            if exists:
                continue
            
            # Determine the minimum tier required for this permission
            required_tier = get_permission_tier(name)
            
            perm = Permission(
                name=name, 
                label=label, 
                group=group,
                subscription_tier=required_tier
            )
            db.add(perm)
            added += 1
            print(f"Added permission: {name} (requires {required_tier.value} tier)")

        db.commit()
        print(f"\nPermission seeding completed for '{tenant_db}' ({subscription_tier.value} tier).")
        print(f"Total new permissions added: {added}")

    except Exception as e:
        db.rollback()
        print("Seeding failed:", e)

    finally:
        db.close()


def bulk_seed_permissions():
    """
    Seed permissions for all existing tenants in the master database based on their subscription tiers.
    """
    print("Starting bulk permission seeding for all tenants...")
    
    from database import get_master_db
    from models.register_models import Tenant
    
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
            print(f"Subscription tier: {tenant.subscription_tier.value}")
            
            if seed_permissions_for_tenant(tenant.database_name, tenant.subscription_tier):
                success_count += 1
                print(f"[OK] Successfully seeded permissions for {tenant.organization_name}")
            else:
                failed_count += 1
                print(f"[FAILED] Failed to seed permissions for {tenant.organization_name}")
        
        print(f"\n=== BULK SEEDING SUMMARY ===")
        print(f"Total tenants: {len(tenants)}")
        print(f"Successfully seeded: {success_count}")
        print(f"Failed: {failed_count}")
        
    except Exception as e:
        print(f"Error during bulk seeding: {e}")
    
    finally:
        master_db.close()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "--bulk":
            bulk_seed_permissions()
        else:
            main()
    else:
        main()
