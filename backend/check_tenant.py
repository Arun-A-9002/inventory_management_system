#!/usr/bin/env python3
"""
Simple debug script to check tenant data
"""

import pymysql

def check_tenant_data():
    """Check tenant data in master database"""
    try:
        conn = pymysql.connect(
            host="localhost",
            user="root",
            password="",
            port=3306,
            database="ims_master"
        )
        
        cursor = conn.cursor()
        
        # Check all tenants
        print("ALL TENANTS IN MASTER DATABASE:")
        print("-" * 60)
        cursor.execute("SELECT id, organization_name, admin_email, tenant_code, database_name FROM master_tenant")
        tenants = cursor.fetchall()
        
        for tenant in tenants:
            print(f"ID: {tenant[0]}")
            print(f"Organization: {tenant[1]}")
            print(f"Admin Email: {tenant[2]}")
            print(f"Tenant Code: {tenant[3]}")
            print(f"Database Name: {tenant[4]}")
            print("-" * 60)
        
        # Check specific email
        email = "arun@nutryah.com"
        print(f"\nCHECKING SPECIFIC EMAIL: {email}")
        print("-" * 60)
        cursor.execute("SELECT id, organization_name, tenant_code, database_name FROM master_tenant WHERE admin_email = %s", (email,))
        specific_tenant = cursor.fetchone()
        
        if specific_tenant:
            print(f"FOUND TENANT:")
            print(f"ID: {specific_tenant[0]}")
            print(f"Organization: {specific_tenant[1]}")
            print(f"Tenant Code: {specific_tenant[2]}")
            print(f"Database Name: {specific_tenant[3]}")
        else:
            print("NO TENANT FOUND WITH THIS EMAIL")
        
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_tenant_data()