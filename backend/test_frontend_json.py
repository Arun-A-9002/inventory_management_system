"""
Test the exact JSON format that should be sent from frontend
"""

# This is what the frontend should send when processing returns:
test_json = {
    "return_staff_name": "kural",
    "return_staff_phone": "8596545225", 
    "return_staff_email": "arun.eng27@gmail.com",
    "staff_change_reason": "staff busy in their work",
    "items": [
        {
            "item_id": 48,  # Replace with actual item ID
            "returned_quantity": 26,
            "damaged_quantity": 1,
            "damage_reason": "Reason for damage"
        }
    ]
}

print("Frontend should send this JSON to:")
print("PUT /api/external-transfers/{transfer_id}/return")
print()
print("JSON Body:")
import json
print(json.dumps(test_json, indent=2))