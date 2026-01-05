import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

conn = mysql.connector.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    user=os.getenv('DB_USER', 'root'),
    password=os.getenv('DB_PASSWORD', ''),
    database=os.getenv('DB_NAME', 'arun')
)
cursor = conn.cursor()

# Check current status values
cursor.execute("SELECT id, vendor_name, status FROM vendors")
vendors = cursor.fetchall()

print("Current vendor status values:")
for vendor_id, name, status in vendors:
    print(f"{vendor_id}: {name} -> '{status}'")

# Fix any null or empty status values
cursor.execute("UPDATE vendors SET status = 'active' WHERE status IS NULL OR status = ''")
affected = cursor.rowcount
conn.commit()

print(f"\nFixed {affected} vendors with null/empty status")

# Verify fix
cursor.execute("SELECT status, COUNT(*) FROM vendors GROUP BY status")
status_counts = cursor.fetchall()

print("\nStatus distribution after fix:")
for status, count in status_counts:
    print(f"  {status}: {count}")

conn.close()