import sqlite3
import os

def add_invoice_fields_to_grn():
    db_path = "inventory_management.db"
    
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found!")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # List all tables first
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"Available tables: {[table[0] for table in tables]}")
        
        # Check if grns table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='grns';")
        if not cursor.fetchone():
            print("GRNs table does not exist. Creating it first...")
            cursor.execute("""
                CREATE TABLE grns (
                    id INTEGER PRIMARY KEY,
                    grn_number VARCHAR(50) UNIQUE,
                    grn_date DATE,
                    po_number VARCHAR(50),
                    vendor_name VARCHAR(100),
                    store VARCHAR(100),
                    invoice_number VARCHAR(50),
                    invoice_date DATE,
                    status VARCHAR(50) DEFAULT 'Pending',
                    total_amount DECIMAL(10, 2) DEFAULT 0.00
                )
            """)
            print("Created grns table with invoice fields")
        else:
            # Check if columns already exist
            cursor.execute("PRAGMA table_info(grns)")
            columns = [column[1] for column in cursor.fetchall()]
            
            if 'invoice_number' not in columns:
                cursor.execute("ALTER TABLE grns ADD COLUMN invoice_number VARCHAR(50)")
                print("Added invoice_number column to grns table")
            
            if 'invoice_date' not in columns:
                cursor.execute("ALTER TABLE grns ADD COLUMN invoice_date DATE")
                print("Added invoice_date column to grns table")
        
        conn.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {str(e)}")
        conn.rollback()
    
    finally:
        conn.close()

if __name__ == "__main__":
    add_invoice_fields_to_grn()