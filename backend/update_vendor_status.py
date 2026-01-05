import mysql.connector
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def update_existing_vendor_status():
    """Update all existing vendors to active status"""
    
    try:
        # Connect to MySQL database
        conn = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'arun')
        )
        cursor = conn.cursor()
        
        # Update all existing vendors to active status
        print("Updating all existing vendors to active status...")
        
        cursor.execute("""
            UPDATE vendors 
            SET status = 'active' 
            WHERE status = 'inactive' OR status IS NULL
        """)
        
        affected_rows = cursor.rowcount
        conn.commit()
        
        print(f"Updated {affected_rows} vendors to active status")
        
        # Show current vendor status distribution
        cursor.execute("SELECT status, COUNT(*) FROM vendors GROUP BY status")
        results = cursor.fetchall()
        
        print("\nCurrent vendor status distribution:")
        for status, count in results:
            print(f"  {status}: {count}")
        
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    update_existing_vendor_status()