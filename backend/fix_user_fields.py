#!/usr/bin/env python3
"""
Fix is_doctor field validation issue in kaviya database
"""

import pymysql

def fix_is_doctor_field():
    """Fix is_doctor field for all users in kaviya database"""
    try:
        conn = pymysql.connect(
            host="localhost",
            user="root",
            password="",
            port=3306,
            database="kaviya"
        )
        
        cursor = conn.cursor()
        
        # Update all users with NULL is_doctor to FALSE
        update_query = "UPDATE users SET is_doctor = 0 WHERE is_doctor IS NULL"
        cursor.execute(update_query)
        
        # Also ensure all boolean fields have proper default values
        cursor.execute("UPDATE users SET two_factor_enabled = 0 WHERE two_factor_enabled IS NULL")
        cursor.execute("UPDATE users SET multi_login_enabled = 1 WHERE multi_login_enabled IS NULL")
        cursor.execute("UPDATE users SET is_active = 1 WHERE is_active IS NULL")
        
        conn.commit()
        
        print("Fixed is_doctor and other boolean fields for all users")
        
        # Verify the fix
        cursor.execute("SELECT id, full_name, email, is_doctor, is_active, two_factor_enabled, multi_login_enabled FROM users")
        users = cursor.fetchall()
        
        print("\nUpdated users:")
        for user in users:
            print(f"ID: {user[0]}, Name: {user[1]}, Email: {user[2]}, is_doctor: {user[3]}, is_active: {user[4]}, 2FA: {user[5]}, multi_login: {user[6]}")
        
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_is_doctor_field()