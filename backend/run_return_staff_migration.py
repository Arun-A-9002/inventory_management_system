"""
Run migration to add return staff details columns
"""

import sys
import os

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from migrations.add_return_staff_details import migrate_mysql, migrate_sqlite

if __name__ == "__main__":
    print("🚀 Running return staff details migration...")
    
    try:
        # Try MySQL first
        migrate_mysql()
    except Exception as e:
        print(f"MySQL migration failed: {e}")
        print("Trying SQLite fallback...")
        try:
            migrate_sqlite("inventory_management.db")
        except Exception as e2:
            print(f"SQLite migration also failed: {e2}")
            print("❌ Migration failed completely")
            sys.exit(1)
    
    print("✅ Migration completed successfully!")