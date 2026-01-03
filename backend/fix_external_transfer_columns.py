import pymysql
from database import DB_HOST, DB_USER, DB_PASSWORD, DB_PORT

def add_missing_columns():
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
        
        # Check if columns exist
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'arun' 
            AND TABLE_NAME = 'external_transfers' 
            AND COLUMN_NAME IN ('staff_phone', 'staff_email', 'return_deadline')
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]
        
        # Add staff_phone if it doesn't exist
        if 'staff_phone' not in existing_columns:
            cursor.execute("ALTER TABLE external_transfers ADD COLUMN staff_phone VARCHAR(20) NULL")
            print("Added staff_phone column")
        else:
            print("staff_phone column already exists")
        
        # Add staff_email if it doesn't exist
        if 'staff_email' not in existing_columns:
            cursor.execute("ALTER TABLE external_transfers ADD COLUMN staff_email VARCHAR(100) NULL")
            print("Added staff_email column")
        else:
            print("staff_email column already exists")
            
        # Add return_deadline if it doesn't exist
        if 'return_deadline' not in existing_columns:
            cursor.execute("ALTER TABLE external_transfers ADD COLUMN return_deadline DATE NULL")
            print("Added return_deadline column")
        else:
            print("return_deadline column already exists")
        
        conn.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Error: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    add_missing_columns()