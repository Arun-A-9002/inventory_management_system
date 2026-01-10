# backend/test_permission_seeding.py
"""
Test script to verify automatic permission seeding functionality.
This script simulates the tenant creation process to test permission seeding.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import sessionmaker
from database import get_tenant_engine
from models.tenant_models import TenantBase, Permission
from utils.seed_permission import seed_permissions_for_tenant


def test_permission_seeding():
    """
    Test the permission seeding functionality.
    """
    test_db_name = "test_tenant_permissions"
    
    print(f"Testing permission seeding for database: {test_db_name}")
    
    try:
        # Create test database (you might need to create this manually in MySQL)
        import pymysql
        conn = pymysql.connect(host="localhost", user="root", password="", port=3306)
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {test_db_name}")
        conn.close()
        print(f"✓ Test database '{test_db_name}' created/verified")
        
        # Create tables
        tenant_engine = get_tenant_engine(test_db_name)
        TenantBase.metadata.create_all(bind=tenant_engine)
        print("✓ Tenant tables created")
        
        # Test permission seeding
        success = seed_permissions_for_tenant(test_db_name)
        
        if success:
            print("✓ Permission seeding completed successfully")
            
            # Verify permissions were created
            SessionLocal = sessionmaker(bind=tenant_engine)
            db = SessionLocal()
            
            try:
                permission_count = db.query(Permission).count()
                print(f"✓ Total permissions in database: {permission_count}")
                
                # Show some sample permissions
                sample_permissions = db.query(Permission).limit(5).all()
                print("\nSample permissions:")
                for perm in sample_permissions:
                    print(f"  - {perm.name}: {perm.label} ({perm.group})")
                
                print(f"\n✅ TEST PASSED: Permission seeding works correctly!")
                
            finally:
                db.close()
        else:
            print("❌ TEST FAILED: Permission seeding failed")
            
        # Cleanup - drop test database
        conn = pymysql.connect(host="localhost", user="root", password="", port=3306)
        cursor = conn.cursor()
        cursor.execute(f"DROP DATABASE IF EXISTS {test_db_name}")
        conn.close()
        print(f"✓ Test database '{test_db_name}' cleaned up")
        
    except Exception as e:
        print(f"❌ TEST ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    test_permission_seeding()