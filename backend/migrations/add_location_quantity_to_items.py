"""
Migration script to add location_id and current_quantity fields to items table
Run this script to update existing database schema
"""

import sqlite3
import os
from pathlib import Path

def migrate_items_table():
    """Add location_id and current_quantity columns to items table"""
    
    # Get the database path
    backend_dir = Path(__file__).parent.parent
    db_path = backend_dir / "inventory_management.db"
    
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(items)")
        columns = [column[1] for column in cursor.fetchall()]
        
        migrations_applied = []
        
        # Add location_id column if it doesn't exist
        if 'location_id' not in columns:
            cursor.execute("""
                ALTER TABLE items 
                ADD COLUMN location_id INTEGER 
                REFERENCES inventory_locations(id)
            """)
            migrations_applied.append("location_id")
            print("+ Added location_id column to items table")
        else:
            print("+ location_id column already exists")
        
        # Add current_quantity column if it doesn't exist
        if 'current_quantity' not in columns:
            cursor.execute("""
                ALTER TABLE items 
                ADD COLUMN current_quantity INTEGER DEFAULT 0
            """)
            migrations_applied.append("current_quantity")
            print("+ Added current_quantity column to items table")
        else:
            print("+ current_quantity column already exists")
        
        # Commit changes
        conn.commit()
        
        if migrations_applied:
            print(f"\nMigration completed successfully! Added columns: {', '.join(migrations_applied)}")
        else:
            print("\nNo migration needed - all columns already exist")
        
        return True
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("Starting migration: Add location and quantity fields to items table")
    print("=" * 60)
    
    success = migrate_items_table()
    
    print("=" * 60)
    if success:
        print("Migration completed successfully!")
        print("\nNext steps:")
        print("1. Restart your FastAPI server")
        print("2. The new fields are now available in the item creation form")
        print("3. Existing items will have current_quantity = 0 and location_id = NULL")
    else:
        print("Migration failed! Please check the errors above.")