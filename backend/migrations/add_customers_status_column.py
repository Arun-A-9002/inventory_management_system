"""
Migration: Add status column to customers table
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import get_tenant_db

def add_status_column():
    """Add status column to customers table"""
    try:
        # Get database connection
        db = next(get_tenant_db("arun"))
        
        # Add status column using text() for raw SQL
        alter_query = text("""
        ALTER TABLE customers 
        ADD COLUMN status VARCHAR(50) DEFAULT 'pending' AFTER reference_details
        """)
        
        db.execute(alter_query)
        db.commit()
        
        print("Successfully added status column to customers table")
        
    except Exception as e:
        print(f"Error adding status column: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_status_column()