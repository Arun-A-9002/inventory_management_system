import requests
import json

# Test data
test_data = {
    "location": "Main Store",
    "staff_name": "John Doe",
    "staff_id": "EMP001",
    "staff_location": "External Site A",
    "reason": "Equipment transfer for project",
    "items": [
        {
            "item_name": "Laptop",
            "batch_no": "BATCH001",
            "quantity": 1,
            "reason": "Work assignment",
            "return_date": "2026-01-15"
        }
    ]
}

try:
    # Test POST request
    response = requests.post(
        "http://localhost:8000/api/external-transfers/",
        json=test_data,
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        print("✅ External transfer created successfully!")
    else:
        print("❌ Failed to create external transfer")
        
except Exception as e:
    print(f"Error: {e}")