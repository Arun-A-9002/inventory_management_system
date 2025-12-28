from sqlalchemy import create_engine, text
from database import get_tenant_engine

def add_location_column():
    """Add location column to return_billing table if it doesn't exist"""
    
    tenant_name = "arun"
    engine = get_tenant_engine(tenant_name)
    
    try:
        with engine.connect() as conn:
            # Check if location column exists
            result = conn.execute(text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'return_billing' 
                AND COLUMN_NAME = 'location'
                AND TABLE_SCHEMA = DATABASE()
            """))
            
            if not result.fetchone():
                print("Adding location column to return_billing table...")
                conn.execute(text("ALTER TABLE return_billing ADD COLUMN location VARCHAR(191) NULL"))
                conn.commit()
                print("Location column added successfully!")
            else:
                print("Location column already exists")
                
    except Exception as e:
        print(f"Failed to add location column: {e}")

if __name__ == "__main__":
    add_location_column()