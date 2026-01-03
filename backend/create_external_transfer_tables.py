from database import get_tenant_engine
from models.tenant_models import TenantBase, ExternalTransfer, ExternalTransferItem

def create_external_transfer_tables():
    """Create external transfer tables if they don't exist"""
    try:
        engine = get_tenant_engine("arun")  # Your tenant database name
        
        # Create only external transfer tables
        ExternalTransfer.__table__.create(engine, checkfirst=True)
        ExternalTransferItem.__table__.create(engine, checkfirst=True)
        
        print("External transfer tables created successfully")
        
    except Exception as e:
        print(f"Error creating tables: {e}")

if __name__ == "__main__":
    create_external_transfer_tables()