#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from database import get_tenant_db
from models.tenant_models import User
from utils.auth import hash_password, verify_password

def reset_password():
    print("=== PASSWORD RESET SCRIPT ===")
    
    tenant_db_name = "arun"
    user_email = "a.arun2722004@gmail.com"
    new_password = "password123"  # Set a known password
    
    try:
        tenant_db_gen = get_tenant_db(tenant_db_name)
        tenant_db = next(tenant_db_gen)
        
        # Find the user
        user = tenant_db.query(User).filter(User.email == user_email).first()
        if not user:
            print(f"User with email {user_email} not found!")
            return
        
        print(f"Found user: {user.full_name} ({user.email})")
        print(f"Current hash: {user.hashed_password}")
        
        # Generate new hash
        new_hash = hash_password(new_password)
        print(f"New hash: {new_hash}")
        
        # Update the password
        user.hashed_password = new_hash
        tenant_db.commit()
        
        print(f"Password updated successfully!")
        print(f"New password: {new_password}")
        
        # Verify the change
        is_valid = verify_password(new_password, user.hashed_password)
        print(f"Verification test: {is_valid}")
        
        tenant_db.close()
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    reset_password()