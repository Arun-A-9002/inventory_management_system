#!/usr/bin/env python3

"""
Script to check available inventory locations and update return records
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
import urllib.parse

def check_and_update_locations():
    """Check available locations and update return records"""
    
    # Database configuration
    DB_USER = "root"
    DB_PASSWORD = ""
    DB_HOST = "localhost"
    DB_PORT = "3306"
    DB_NAME = "arun"
    
    # Create database URL
    database_url = f"mysql+pymysql://{DB_USER}:{urllib.parse.quote_plus(DB_PASSWORD)}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    engine = create_engine(database_url)
    
    try:
        with engine.connect() as conn:
            # Check available inventory locations
            result = conn.execute(text("""
                SELECT id, code, name, description 
                FROM inventory_locations 
                WHERE is_active = 1
                ORDER BY name
            """))
            
            locations = result.fetchall()
            print(f"Available inventory locations ({len(locations)}):")
            
            for location in locations:
                print(f"  - {location[2]} ({location[1]})")
            
            if locations:
                # Use the first location as default for existing returns
                default_location = locations[0][2]  # name
                
                update_result = conn.execute(text("""
                    UPDATE return_headers 
                    SET location = :location_name 
                    WHERE location = 'Main Warehouse'
                """), {"location_name": default_location})
                
                conn.commit()
                print(f"Updated {update_result.rowcount} return records with location: {default_location}")
            else:
                print("No inventory locations found. Creating a default location...")
                
                # Create a default inventory location
                conn.execute(text("""
                    INSERT INTO inventory_locations (code, name, description, is_active) 
                    VALUES ('WH001', 'Main Warehouse', 'Primary warehouse location', 1)
                """))
                
                conn.commit()
                print("Created default inventory location: Main Warehouse (WH001)")
            
            # Show sample return records with locations
            result = conn.execute(text("""
                SELECT return_no, return_type, vendor, location, status 
                FROM return_headers 
                ORDER BY created_at DESC 
                LIMIT 5
            """))
            
            returns = result.fetchall()
            print(f"\nSample return records with locations:")
            
            for return_record in returns:
                print(f"  {return_record[0]} | {return_record[1]} | {return_record[2]} | Location: {return_record[3]} | {return_record[4]}")
            
    except Exception as e:
        print(f"Error: {e}")
        raise

if __name__ == "__main__":
    print("Checking inventory locations and updating return records...")
    check_and_update_locations()
    print("Process completed successfully!")