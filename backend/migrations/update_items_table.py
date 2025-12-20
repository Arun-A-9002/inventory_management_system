"""
Database migration script to update items table:
- Remove reorder_level column
- Add fixing_price column (Float, default 0.0)
- Add mrp column (Float, default 0.0)

Run this script to update your database schema.
"""

import sqlite3
import os

def migrate_items_table():
    # Database path
    db_path = "inventory_management.db"
    
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found!")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("Starting migration...")
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(items)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Add fixing_price column if it doesn't exist
        if 'fixing_price' not in columns:
            cursor.execute("ALTER TABLE items ADD COLUMN fixing_price REAL DEFAULT 0.0")
            print("Added fixing_price column")
        else:
            print("fixing_price column already exists")
        
        # Add mrp column if it doesn't exist
        if 'mrp' not in columns:
            cursor.execute("ALTER TABLE items ADD COLUMN mrp REAL DEFAULT 0.0")
            print("Added mrp column")
        else:
            print("mrp column already exists")
        
        # Update existing records to set default values
        cursor.execute("UPDATE items SET fixing_price = 0.0 WHERE fixing_price IS NULL")
        cursor.execute("UPDATE items SET mrp = 0.0 WHERE mrp IS NULL")
        print("Updated existing records with default values")
        
        # Note: SQLite doesn't support DROP COLUMN directly
        # We'll create a new table without reorder_level and copy data
        if 'reorder_level' in columns:
            print("Removing reorder_level column...")
            
            # Create new table without reorder_level
            cursor.execute("""
                CREATE TABLE items_new (
                    id INTEGER PRIMARY KEY,
                    name VARCHAR(150) NOT NULL,
                    item_code VARCHAR(50) UNIQUE NOT NULL,
                    description VARCHAR(255),
                    category VARCHAR(100),
                    sub_category VARCHAR(100),
                    brand VARCHAR(100),
                    manufacturer VARCHAR(150),
                    uom VARCHAR(50),
                    min_stock INTEGER DEFAULT 0,
                    max_stock INTEGER DEFAULT 0,
                    fixing_price REAL DEFAULT 0.0,
                    mrp REAL DEFAULT 0.0,
                    is_batch_managed BOOLEAN DEFAULT 0,
                    has_expiry BOOLEAN DEFAULT 0,
                    expiry_date DATE,
                    barcode VARCHAR(100) UNIQUE,
                    qr_code VARCHAR(100) UNIQUE,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME
                )
            """)
            
            # Copy data from old table to new table (excluding reorder_level)
            cursor.execute("""
                INSERT INTO items_new (
                    id, name, item_code, description, category, sub_category, 
                    brand, manufacturer, uom, min_stock, max_stock, 
                    fixing_price, mrp, is_batch_managed, has_expiry, 
                    expiry_date, barcode, qr_code, is_active, created_at, updated_at
                )
                SELECT 
                    id, name, item_code, description, category, sub_category,
                    brand, manufacturer, uom, min_stock, max_stock,
                    COALESCE(fixing_price, 0.0), COALESCE(mrp, 0.0), 
                    is_batch_managed, has_expiry, expiry_date, barcode, qr_code, 
                    is_active, created_at, updated_at
                FROM items
            """)
            
            # Drop old table and rename new table
            cursor.execute("DROP TABLE items")
            cursor.execute("ALTER TABLE items_new RENAME TO items")
            
            print("Successfully removed reorder_level column")
        else:
            print("reorder_level column not found")
        
        conn.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_items_table()