#!/usr/bin/env python3
"""
Check users in kaviya tenant database
"""

import pymysql

def check_kaviya_users():
    """Check users in kaviya database"""
    try:
        conn = pymysql.connect(
            host="localhost",
            user="root",
            password="",
            port=3306,
            database="kaviya"
        )
        
        cursor = conn.cursor()
        
        # Check if users table exists
        cursor.execute("SHOW TABLES LIKE 'users'")
        if cursor.fetchone():
            print("USERS IN KAVIYA DATABASE:")
            print("-" * 60)
            cursor.execute("SELECT id, full_name, email, login_code, is_active FROM users")
            users = cursor.fetchall()
            
            if users:
                for user in users:
                    print(f"ID: {user[0]}")
                    print(f"Name: {user[1]}")
                    print(f"Email: {user[2]}")
                    print(f"Login Code: {user[3]}")
                    print(f"Active: {user[4]}")
                    print("-" * 60)
            else:
                print("NO USERS FOUND IN KAVIYA DATABASE")
        else:
            print("USERS TABLE DOES NOT EXIST IN KAVIYA DATABASE")
        
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_kaviya_users()