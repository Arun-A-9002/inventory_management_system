from sqlalchemy import create_engine, text
from database import get_tenant_engine

def remove_location_column():
    """Remove location column from return_headers table"""
    
    tenant_name = "arun"
    engine = get_tenant_engine(tenant_name)
    
    try:
        with engine.connect() as conn:
            # Check if location column exists
            result = conn.execute(text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'return_headers' 
                AND COLUMN_NAME = 'location'
                AND TABLE_SCHEMA = DATABASE()
            """))
            
            if result.fetchone():
                print("Removing location column from return_headers table...")
                conn.execute(text("ALTER TABLE return_headers DROP COLUMN location"))
                conn.commit()
                print("Location column removed successfully!")
            else:
                print("Location column does not exist")
                
    except Exception as e:
        print(f"Failed to remove location column: {e}")

if __name__ == "__main__":
    remove_location_column()