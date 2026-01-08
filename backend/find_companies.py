#!/usr/bin/env python3
"""
Find companies table in database files
"""

import sqlite3
import os
import glob

def find_companies_table():
    # Look for all .db files
    db_files = glob.glob("*.db")
    
    if not db_files:
        print("No database files found!")
        return
    
    print(f"Found database files: {db_files}")
    
    for db_file in db_files:
        print(f"\n--- Checking {db_file} ---")
        try:
            conn = sqlite3.connect(db_file)
            cursor = conn.cursor()
            
            # Get all tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            
            print(f"Tables in {db_file}:")
            for table in tables:
                print(f"  - {table[0]}")
                
                # Check if this is companies table
                if table[0] == 'companies':
                    print(f"  *** FOUND COMPANIES TABLE in {db_file} ***")
                    
                    # Show schema
                    cursor.execute(f"PRAGMA table_info(companies)")
                    columns = cursor.fetchall()
                    print("  Schema:")
                    for col in columns:
                        print(f"    {col[1]} {col[2]}")
                    
                    # Show data count
                    cursor.execute("SELECT COUNT(*) FROM companies")
                    count = cursor.fetchone()[0]
                    print(f"  Records: {count}")
            
            conn.close()
            
        except Exception as e:
            print(f"Error checking {db_file}: {e}")

if __name__ == "__main__":
    find_companies_table()