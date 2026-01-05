"""
Migration: Add return staff details columns to return_headers table
Date: 2025-01-05
Purpose: Store different staff information when processing returns
"""

import sqlite3
import mysql.connector
from database import get_tenant_db
from sqlalchemy import text

def migrate_sqlite(db_path):
    """Apply migration for SQLite database"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Add return staff details columns
        cursor.execute("""
            ALTER TABLE return_headers 
            ADD COLUMN return_staff_name TEXT
        """)
        
        cursor.execute("""
            ALTER TABLE return_headers 
            ADD COLUMN return_staff_phone TEXT
        """)
        
        cursor.execute("""
            ALTER TABLE return_headers 
            ADD COLUMN return_staff_email TEXT
        """)
        
        cursor.execute("""
            ALTER TABLE return_headers 
            ADD COLUMN staff_change_reason TEXT
        """)
        
        conn.commit()
        print("✅ SQLite migration completed successfully")
        
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("⚠️ Columns already exist in SQLite database")
        else:
            print(f"❌ SQLite migration failed: {e}")
    finally:
        conn.close()

def migrate_mysql():
    """Apply migration for MySQL database using SQLAlchemy"""
    try:
        db = next(get_tenant_db())
        
        # Check if columns already exist
        result = db.execute(text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'return_headers' 
            AND COLUMN_NAME IN ('return_staff_name', 'return_staff_phone', 'return_staff_email', 'staff_change_reason')
        """)).fetchall()
        
        existing_columns = [row[0] for row in result]
        
        if len(existing_columns) == 4:
            print("⚠️ All columns already exist in MySQL database")
            return
        
        # Add missing columns
        if 'return_staff_name' not in existing_columns:
            db.execute(text("""
                ALTER TABLE return_headers 
                ADD COLUMN return_staff_name VARCHAR(255) NULL COMMENT 'Name of staff processing the return'
            """))
        
        if 'return_staff_phone' not in existing_columns:
            db.execute(text("""
                ALTER TABLE return_headers 
                ADD COLUMN return_staff_phone VARCHAR(20) NULL COMMENT 'Phone number of return processing staff'
            """))
        
        if 'return_staff_email' not in existing_columns:
            db.execute(text("""
                ALTER TABLE return_headers 
                ADD COLUMN return_staff_email VARCHAR(191) NULL COMMENT 'Email of return processing staff'
            """))
        
        if 'staff_change_reason' not in existing_columns:
            db.execute(text("""
                ALTER TABLE return_headers 
                ADD COLUMN staff_change_reason TEXT NULL COMMENT 'Reason for different staff processing the return'
            """))
        
        db.commit()
        print("✅ MySQL migration completed successfully")
        
    except Exception as e:
        print(f"❌ MySQL migration failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Starting return staff details migration...")
    
    # Try MySQL first, then SQLite as fallback
    try:
        migrate_mysql()
    except:
        print("📝 MySQL not available, trying SQLite...")
        migrate_sqlite("inventory_management.db")
    
    print("✨ Migration process completed!")