import mysql.connector
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def fix_vendor_status():
    """Fix vendor status values"""
    
    try:
        # Connect to MySQL database
        conn = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'arun')
        )
        cursor = conn.cursor()
        
        # Update all vendors with empty or null status to 'active'
        print("Setting all vendors to active status...")
        
        cursor.execute("""
            UPDATE vendors 
            SET status = 'active' 
            WHERE status = '' OR status IS NULL
        """)
        
        affected_rows = cursor.rowcount
        conn.commit()
        
        print(f"Updated {affected_rows} vendors to active status")
        
        # Show current vendor status distribution
        cursor.execute("SELECT status, COUNT(*) FROM vendors GROUP BY status")
        results = cursor.fetchall()
        
        print("\nCurrent vendor status distribution:")
        for status, count in results:
            status_display = status if status else "(empty)"
            print(f"  {status_display}: {count}")
        
        # Show all vendors with their status
        cursor.execute("SELECT id, vendor_name, status FROM vendors ORDER BY id")
        vendors = cursor.fetchall()
        
        print(f"\nAll vendors ({len(vendors)} total):")
        for vendor_id, name, status in vendors:
            status_display = status if status else "(empty)"
            print(f"  ID {vendor_id}: {name} - {status_display}")
        
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    fix_vendor_status()