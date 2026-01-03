"""
Migration script to add staff_phone and staff_email columns to external_transfers table
"""
import pymysql
from config.database import get_database_url
from urllib.parse import urlparse

def add_staff_contact_columns():
    # Parse database URL
    db_url = get_database_url("arun")  # Replace with your tenant name
    parsed = urlparse(db_url.replace("mysql+pymysql://", "mysql://"))
    
    # Connect to database
    connection = pymysql.connect(
        host=parsed.hostname,
        user=parsed.username,
        password=parsed.password,
        database=parsed.path[1:],  # Remove leading slash
        port=parsed.port or 3306
    )
    
    try:
        with connection.cursor() as cursor:
            # Check if columns already exist
            cursor.execute("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'external_transfers' 
                AND COLUMN_NAME IN ('staff_phone', 'staff_email')
            """)
            existing_columns = [row[0] for row in cursor.fetchall()]
            
            # Add staff_phone column if it doesn't exist
            if 'staff_phone' not in existing_columns:
                cursor.execute("""
                    ALTER TABLE external_transfers 
                    ADD COLUMN staff_phone VARCHAR(20) NULL
                """)
                print("Added staff_phone column")
            
            # Add staff_email column if it doesn't exist
            if 'staff_email' not in existing_columns:
                cursor.execute("""
                    ALTER TABLE external_transfers 
                    ADD COLUMN staff_email VARCHAR(100) NULL
                """)
                print("Added staff_email column")
            
            connection.commit()
            print("Migration completed successfully!")
            
    except Exception as e:
        print(f"Error: {e}")
        connection.rollback()
    finally:
        connection.close()

if __name__ == "__main__":
    add_staff_contact_columns()