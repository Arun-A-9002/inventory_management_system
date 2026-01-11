#!/usr/bin/env python3
"""
Remove duplicate user from kaviya database
"""

import pymysql

def remove_duplicate_user():
    """Remove user with email arun@nutryah.com from kaviya database"""
    try:
        conn = pymysql.connect(
            host="localhost",
            user="root",
            password="",
            port=3306,
            database="kaviya"
        )
        
        cursor = conn.cursor()
        
        # Check if user exists
        cursor.execute("SELECT id, full_name, email FROM users WHERE email = %s", ("arun@nutryah.com",))
        user = cursor.fetchone()
        
        if user:
            print(f"Found user to delete:")
            print(f"ID: {user[0]}, Name: {user[1]}, Email: {user[2]}")
            
            # Delete the user
            cursor.execute("DELETE FROM users WHERE email = %s", ("arun@nutryah.com",))
            conn.commit()
            
            print(f"User deleted successfully. Rows affected: {cursor.rowcount}")
        else:
            print("No user found with email arun@nutryah.com")
        
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    remove_duplicate_user()