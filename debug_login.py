#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from database import get_tenant_db
from models.tenant_models import User
from utils.auth import hash_password, verify_password

def debug_login():
    print("=== LOGIN DEBUG SCRIPT ===")
    
    # Test the tenant database connection
    tenant_db_name = "arun"
    print(f"Connecting to tenant database: {tenant_db_name}")
    
    try:
        tenant_db_gen = get_tenant_db(tenant_db_name)
        tenant_db = next(tenant_db_gen)
        
        # Get all users
        users = tenant_db.query(User).all()
        print(f"Found {len(users)} users in database:")
        
        for user in users:
            print(f"  - ID: {user.id}")
            print(f"    Name: {user.full_name}")
            print(f"    Email: {user.email}")
            print(f"    Login Code: {user.login_code}")
            print(f"    Hashed Password: {user.hashed_password}")
            print(f"    Is Active: {user.is_active}")
            print(f"    2FA Enabled: {user.two_factor_enabled}")
            print("    ---")
        
        # Test password hashing and verification
        test_email = "a.arun2722004@gmail.com"
        test_password = "your_actual_password_here"  # Replace with the actual password you're trying
        
        user = tenant_db.query(User).filter(User.email == test_email).first()
        if user:
            print(f"\nTesting password for user: {user.email}")
            print(f"Stored hash: {user.hashed_password}")
            
            # Test with different passwords
            test_passwords = ["password", "admin", "123456", "arun", "test"]
            
            for pwd in test_passwords:
                new_hash = hash_password(pwd)
                is_valid = verify_password(pwd, user.hashed_password)
                print(f"Password '{pwd}': Hash={new_hash[:20]}... Valid={is_valid}")
            
            # Show what the hash should be for common passwords
            print(f"\nIf password is 'password': {hash_password('password')}")
            print(f"If password is 'admin': {hash_password('admin')}")
            print(f"If password is '123456': {hash_password('123456')}")
            
        else:
            print(f"User with email {test_email} not found!")
        
        tenant_db.close()
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_login()