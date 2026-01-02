"""
Test script to verify warranty period fields are working
"""

import requests
import json

def test_warranty_fields():
    """Test creating an item with warranty period fields"""
    
    # API endpoint
    base_url = "http://localhost:8000"
    
    # Test data with new warranty fields
    test_item = {
        "name": "Test Warranty Item",
        "item_code": "TEST-WARRANTY-001",
        "description": "Test item with warranty period",
        "category": "1",
        "sub_category": "1",
        "brand": "Test Brand",
        "manufacturer": "Test Manufacturer",
        "uom": "Piece",
        "min_stock": 10,
        "max_stock": 100,
        "fixing_price": 50.0,
        "mrp": 75.0,
        "tax": 18.0,
        "is_batch_managed": False,
        "has_expiry": False,
        "has_warranty": True,
        "warranty_period": 2,
        "warranty_period_type": "years",
        "is_active": True
    }
    
    try:
        # Test creating item
        print("Testing item creation with warranty period...")
        response = requests.post(f"{base_url}/items/", json=test_item)
        
        if response.status_code == 200:
            print("✅ Item created successfully")
            item_data = response.json()
            print(f"   Item ID: {item_data.get('id')}")
            print(f"   Warranty Period: {item_data.get('warranty_period')} {item_data.get('warranty_period_type')}")
        else:
            print(f"❌ Failed to create item: {response.status_code}")
            print(f"   Response: {response.text}")
        
        # Test getting all items
        print("\nTesting item retrieval...")
        response = requests.get(f"{base_url}/items/")
        
        if response.status_code == 200:
            items = response.json()
            print(f"✅ Retrieved {len(items)} items")
            
            # Find our test item
            test_item_found = None
            for item in items:
                if item.get('item_code') == 'TEST-WARRANTY-001':
                    test_item_found = item
                    break
            
            if test_item_found:
                print(f"✅ Test item found with warranty: {test_item_found.get('warranty_period')} {test_item_found.get('warranty_period_type')}")
            else:
                print("❌ Test item not found in list")
        else:
            print(f"❌ Failed to retrieve items: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to API server. Make sure the backend is running on http://localhost:8000")
    except Exception as e:
        print(f"❌ Test failed with error: {e}")

if __name__ == "__main__":
    test_warranty_fields()