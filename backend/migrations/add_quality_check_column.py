import sqlite3
import os

def add_quality_check_column():
    """Add quality_check column to grns table"""
    
    # Database path
    db_path = os.path.join(os.path.dirname(__file__), '..', 'inventory_management.db')
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(grns)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'quality_check' not in columns:
            # Add quality_check column
            cursor.execute("ALTER TABLE grns ADD COLUMN quality_check BOOLEAN DEFAULT 0")
            print("Added quality_check column to grns table")
        else:
            print("quality_check column already exists in grns table")
        
        conn.commit()
        conn.close()
        print("Migration completed successfully")
        
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    add_quality_check_column()