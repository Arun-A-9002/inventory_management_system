import pymysql
from database import DB_HOST, DB_USER, DB_PASSWORD, DB_PORT

def add_all_missing_columns():
    try:
        # Connect to the tenant database
        conn = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database="arun",  # tenant database name
            port=int(DB_PORT)
        )
        
        cursor = conn.cursor()
        
        print("Starting migration for external transfer tables...")
        
        # ===== EXTERNAL_TRANSFERS TABLE =====
        print("\n1. Checking external_transfers table...")
        
        # Check existing columns in external_transfers
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'arun' 
            AND TABLE_NAME = 'external_transfers'
        """)
        existing_transfer_columns = [row[0] for row in cursor.fetchall()]
        print(f"Existing columns: {existing_transfer_columns}")
        
        # Columns to add to external_transfers
        transfer_columns_to_add = [
            ("staff_phone", "VARCHAR(20) NULL"),
            ("staff_email", "VARCHAR(100) NULL"),
            ("return_deadline", "DATE NULL"),
            ("approved_by", "VARCHAR(255) NULL"),
            ("approved_at", "DATETIME NULL"),
            ("rejection_reason", "TEXT NULL"),
            ("sent_at", "DATETIME NULL"),
            ("return_date", "DATE NULL"),
            ("returned_at", "DATETIME NULL")
        ]
        
        for column_name, column_def in transfer_columns_to_add:
            if column_name not in existing_transfer_columns:
                cursor.execute(f"ALTER TABLE external_transfers ADD COLUMN {column_name} {column_def}")
                print(f"Added {column_name} column to external_transfers")
            else:
                print(f"{column_name} column already exists in external_transfers")
        
        # ===== EXTERNAL_TRANSFER_ITEMS TABLE =====
        print("\n2. Checking external_transfer_items table...")
        
        # Check existing columns in external_transfer_items
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'arun' 
            AND TABLE_NAME = 'external_transfer_items'
        """)
        existing_item_columns = [row[0] for row in cursor.fetchall()]
        print(f"Existing columns: {existing_item_columns}")
        
        # Columns to add to external_transfer_items
        item_columns_to_add = [
            ("returned_quantity", "INT DEFAULT 0"),
            ("damaged_quantity", "INT DEFAULT 0"),
            ("damage_reason", "TEXT NULL"),
            ("returned_at", "DATETIME NULL")
        ]
        
        for column_name, column_def in item_columns_to_add:
            if column_name not in existing_item_columns:
                cursor.execute(f"ALTER TABLE external_transfer_items ADD COLUMN {column_name} {column_def}")
                print(f"Added {column_name} column to external_transfer_items")
            else:
                print(f"{column_name} column already exists in external_transfer_items")
        
        conn.commit()
        print("\nMigration completed successfully!")
        
    except Exception as e:
        print(f"Error: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    add_all_missing_columns()