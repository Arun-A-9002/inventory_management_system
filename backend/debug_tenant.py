#!/usr/bin/env python3
"""
Debug script to verify tenant database and user creation
"""

import pymysql
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

def check_tenant_database(tenant_code):
    """Check if tenant database exists and has tables"""
    try:
        # Check if database exists
        conn = pymysql.connect(
            host="localhost",
            user="root",
            password="",
            port=3306
        )
        
        cursor = conn.cursor()
        cursor.execute("SHOW DATABASES")
        databases = [db[0] for db in cursor.fetchall()]
        
        db_name = tenant_code.lower().strip()
        
        if db_name in databases:
            print(f"✅ Database '{db_name}' exists")
            
            # Check tables in the database
            cursor.execute(f"USE {db_name}")
            cursor.execute("SHOW TABLES")
            tables = [table[0] for table in cursor.fetchall()]
            
            print(f"📋 Tables in '{db_name}': {len(tables)} tables")
            for table in tables:
                print(f"   - {table}")
            
            # Check if users table has data
            if 'users' in tables:
                cursor.execute("SELECT COUNT(*) FROM users")
                user_count = cursor.fetchone()[0]
                print(f"👥 Users in database: {user_count}")
                
                if user_count > 0:
                    cursor.execute("SELECT id, full_name, email, is_active FROM users")
                    users = cursor.fetchall()
                    for user in users:
                        print(f"   - ID: {user[0]}, Name: {user[1]}, Email: {user[2]}, Active: {user[3]}")
            
        else:
            print(f"❌ Database '{db_name}' does not exist")
            print(f"Available databases: {databases}")
        
        conn.close()
        
    except Exception as e:
        print(f"Error checking database: {e}")

def check_master_tenant(admin_email):
    """Check if tenant exists in master database"""
    try:
        conn = pymysql.connect(
            host="localhost",
            user="root",
            password="",
            port=3306,
            database="ims_master"
        )
        
        cursor = conn.cursor()
        cursor.execute("SELECT id, organization_name, tenant_code, database_name FROM master_tenant WHERE admin_email = %s", (admin_email,))
        tenant = cursor.fetchone()
        
        if tenant:
            print(f"✅ Tenant found in master DB:")
            print(f"   - ID: {tenant[0]}")
            print(f"   - Organization: {tenant[1]}")
            print(f"   - Tenant Code: {tenant[2]}")
            print(f"   - Database Name: {tenant[3]}")
            return tenant[2]  # Return tenant_code
        else:
            print(f"❌ No tenant found with email: {admin_email}")
            return None
        
        conn.close()
        
    except Exception as e:
        print(f"Error checking master tenant: {e}")
        return None

if __name__ == "__main__":
    admin_email = input("Enter admin email to check: ").strip()
    
    print("=" * 50)
    print("CHECKING MASTER DATABASE")
    print("=" * 50)
    
    tenant_code = check_master_tenant(admin_email)
    
    if tenant_code:
        print("\n" + "=" * 50)
        print("CHECKING TENANT DATABASE")
        print("=" * 50)
        check_tenant_database(tenant_code)
    
    print("\n" + "=" * 50)
    print("DEBUG COMPLETE")
    print("=" * 50)