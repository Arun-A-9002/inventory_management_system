"""
Migration to add piece calculation columns to grn_items table
"""

import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

def run_migration():
    try:
        # Database connection
        connection = pymysql.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'inventory_management'),
            charset='utf8mb4'
        )
        
        cursor = connection.cursor()
        
        # Add new columns to grn_items table
        alter_queries = [
            "ALTER TABLE grn_items ADD COLUMN container INT DEFAULT 0",
            "ALTER TABLE grn_items ADD COLUMN package INT DEFAULT 0", 
            "ALTER TABLE grn_items ADD COLUMN piece INT DEFAULT 0",
            "ALTER TABLE grn_items ADD COLUMN package_cost DECIMAL(10,2) DEFAULT 0.00",
            "ALTER TABLE grn_items ADD COLUMN package_mrp DECIMAL(10,2) DEFAULT 0.00",
            "ALTER TABLE grn_items ADD COLUMN total_pieces INT DEFAULT 0",
            "ALTER TABLE grn_items ADD COLUMN cost_per_piece DECIMAL(10,2) DEFAULT 0.00",
            "ALTER TABLE grn_items ADD COLUMN mrp_per_piece DECIMAL(10,2) DEFAULT 0.00"
        ]
        
        for query in alter_queries:
            try:
                cursor.execute(query)
                print(f"✅ Executed: {query}")
            except pymysql.err.OperationalError as e:
                if "Duplicate column name" in str(e):
                    print(f"⚠️  Column already exists: {query}")
                else:
                    print(f"❌ Error: {query} - {e}")
        
        connection.commit()
        print("🎉 Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
    finally:
        if 'connection' in locals():
            connection.close()

if __name__ == "__main__":
    run_migration()