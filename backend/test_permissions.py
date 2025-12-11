#!/usr/bin/env python3
"""
Test script to verify permission system is working correctly.
Run this to test different user scenarios.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_tenant_db
from models.tenant_models import User
from utils.permissions import has_permission

def test_permissions():
    print("🔍 Testing Permission System...")
    
    # Test 1: Mock admin user
    admin_user = {
        "role": "admin",
        "permissions": ["*"]
    }
    
    print(f"Admin user has departments.view: {has_permission(admin_user, 'departments.view')}")
    print(f"Admin user has departments.delete: {has_permission(admin_user, 'departments.delete')}")
    
    # Test 2: Regular user with limited permissions
    regular_user = {
        "role": "user",
        "permissions": ["departments.view", "departments.create"]
    }
    
    print(f"Regular user has departments.view: {has_permission(regular_user, 'departments.view')}")
    print(f"Regular user has departments.create: {has_permission(regular_user, 'departments.create')}")
    print(f"Regular user has departments.delete: {has_permission(regular_user, 'departments.delete')}")
    
    # Test 3: Check haruharinie user from database
    try:
        tenant_db_gen = get_tenant_db('arun')
        tenant_db = next(tenant_db_gen)
        
        user = tenant_db.query(User).filter(User.email == 'haruharinie@gmail.com').first()
        if user:
            permissions = []
            for role in user.roles:
                for perm in role.permissions:
                    permissions.append(perm.name)
            
            user_data = {
                "role": "user",
                "permissions": list(set(permissions))
            }
            
            print(f"\n👤 Haruharinie's permissions: {user_data['permissions']}")
            print(f"Has departments.view: {has_permission(user_data, 'departments.view')}")
            print(f"Has departments.delete: {has_permission(user_data, 'departments.delete')}")
        else:
            print("❌ Haruharinie user not found")
        
        tenant_db.close()
    except Exception as e:
        print(f"❌ Database error: {e}")

if __name__ == "__main__":
    test_permissions()