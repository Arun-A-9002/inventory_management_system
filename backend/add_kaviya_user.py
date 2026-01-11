#!/usr/bin/env python3
"""
Add kaviya user back to kaviya tenant database
"""

import pymysql
import hashlib

def add_kaviya_user():
    """Add kaviya user to kaviya database"""
    try:
        conn = pymysql.connect(
            host="localhost",
            user="root",
            password="",
            port=3306,
            database="kaviya"
        )
        
        cursor = conn.cursor()
        
        # Hash password (using same method as your system)
        salt = "inventory_salt_2024"
        password = "kaviya123"  # Default password
        hashed_password = hashlib.sha256((password + salt).encode()).hexdigest()
        
        # Insert user
        insert_query = """
        INSERT INTO users (full_name, email, login_code, hashed_password, is_active, two_factor_enabled, multi_login_enabled, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
        """
        
        user_data = (
            "kaviya",                    # full_name
            "arun@nutryah.com",         # email
            "JA982093",                 # login_code
            hashed_password,            # hashed_password
            1,                          # is_active
            0,                          # two_factor_enabled
            1,                          # multi_login_enabled
        )
        
        cursor.execute(insert_query, user_data)
        conn.commit()
        
        print(f"User 'kaviya' added successfully to kaviya database")
        print(f"Email: arun@nutryah.com")
        print(f"Login Code: JA982093")
        print(f"Password: {password}")
        print(f"Active: Yes")
        print(f"Two Factor: Disabled")
        print(f"Multi Login: Enabled")
        
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    add_kaviya_user()