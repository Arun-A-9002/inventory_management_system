import mysql.connector
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def add_vendor_status_column():
    """Add status column to vendors table and migrate existing data"""
    
    try:
        # Connect to MySQL database
        conn = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'arun')
        )
        cursor = conn.cursor()
        
        # Check if status column already exists
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'vendors'
        """, (os.getenv('DB_NAME', 'arun'),))
        
        columns = [column[0] for column in cursor.fetchall()]
        
        if 'status' not in columns:
            print("Adding status column to vendors table...")
            
            # Add status column with default value 'inactive'
            cursor.execute("""
                ALTER TABLE vendors 
                ADD COLUMN status VARCHAR(20) DEFAULT 'inactive'
            """)
            
            # Update all existing vendors to 'inactive' status
            cursor.execute("""
                UPDATE vendors 
                SET status = 'inactive' 
                WHERE status IS NULL
            """)
            
            print("Status column added successfully")
        else:
            print("Status column already exists")
        
        # Update verification_status to use simple active/inactive values
        print("Updating verification_status values...")
        
        # Map old enum values to new simple values
        cursor.execute("""
            UPDATE vendors 
            SET verification_status = 'active' 
            WHERE verification_status IN ('Verified', 'verified', 'Pending', 'pending')
        """)
        
        cursor.execute("""
            UPDATE vendors 
            SET verification_status = 'inactive' 
            WHERE verification_status IN ('Rejected', 'rejected')
        """)
        
        # Set default status based on verification_status
        cursor.execute("""
            UPDATE vendors 
            SET status = verification_status 
            WHERE status = 'inactive'
        """)
        
        conn.commit()
        print("Vendor status migration completed successfully")
        
        # Show updated vendor count
        cursor.execute("SELECT COUNT(*) FROM vendors WHERE status = 'active'")
        active_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM vendors WHERE status = 'inactive'")
        inactive_count = cursor.fetchone()[0]
        
        print(f"Active vendors: {active_count}")
        print(f"Inactive vendors: {inactive_count}")
        
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    add_vendor_status_column()