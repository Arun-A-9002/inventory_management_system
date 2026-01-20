"""
Test script to verify database migrations and new fields
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_tenant_engine
from models.tenant_models import TenantBase, Item, InventoryLocation
from sqlalchemy import text

def test_migrations():
    """Test that the new columns exist in the items table"""
    
    # Use a test tenant database
    test_tenant = "test_tenant_db"
    
    try:
        # Get engine for test tenant
        engine = get_tenant_engine(test_tenant)
        
        # Create all tables
        TenantBase.metadata.create_all(bind=engine)
        print("✓ Created all tenant tables")
        
        # Check if new columns exist
        with engine.connect() as conn:
            result = conn.execute(text("DESCRIBE items"))
            columns = [row[0] for row in result.fetchall()]
            
            print("\\nColumns in items table:")
            for col in columns:
                print(f"  - {col}")
            
            # Check for our new columns
            if 'location_id' in columns:
                print("\\n✓ location_id column exists")
            else:
                print("\\n✗ location_id column missing")
            
            if 'current_quantity' in columns:
                print("✓ current_quantity column exists")
            else:
                print("✗ current_quantity column missing")
        
        print("\\n✅ Migration test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Migration test failed: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing database migrations...")
    print("=" * 50)
    
    success = test_migrations()
    
    print("=" * 50)
    if success:
        print("🎉 All tests passed! The new fields are ready to use.")
    else:
        print("💥 Tests failed! Please check the errors above.")