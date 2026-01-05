from database import get_tenant_db
from models.tenant_models import Vendor
from schemas.tenant_schemas import VendorCreate
import uuid

def test_vendor_with_bank_details():
    try:
        db = next(get_tenant_db('arun'))
        
        # Create test vendor data with bank details
        vendor_data = VendorCreate(
            vendor_name="Test Bank Vendor",
            contact_person="John Doe",
            phone="9876543210",
            email="test@vendor.com",
            address="123 Test Street",
            country="India",
            state="Karnataka",
            city="Bangalore",
            pan_number="ABCDE1234F",
            gst_number="29ABCDE1234F1Z5",
            # Bank Details
            ifsc_code="HDFC0001234",
            account_number="12345678901234",
            account_holder_name="Test Bank Vendor Pvt Ltd",
            branch_name="Bangalore Main Branch"
        )
        
        # Create vendor code
        vendor_code = f"VND-{uuid.uuid4().hex[:6].upper()}"
        
        # Create vendor instance
        vendor = Vendor(
            **vendor_data.dict(),
            vendor_code=vendor_code
        )
        
        # Save to database
        db.add(vendor)
        db.commit()
        db.refresh(vendor)
        
        print(f"Vendor created successfully with ID: {vendor.id}")
        print(f"Vendor Code: {vendor.vendor_code}")
        print(f"Bank Details - IFSC: {vendor.ifsc_code}, Account: {vendor.account_number}")
        print(f"Account Holder: {vendor.account_holder_name}")
        print(f"Branch: {vendor.branch_name}")
        
        # Verify by querying back
        saved_vendor = db.query(Vendor).filter(Vendor.id == vendor.id).first()
        if saved_vendor:
            print("✅ Vendor with bank details saved and retrieved successfully!")
        else:
            print("❌ Failed to retrieve saved vendor")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_vendor_with_bank_details()