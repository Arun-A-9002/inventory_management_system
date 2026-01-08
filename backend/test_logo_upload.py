#!/usr/bin/env python3
"""
Test script to verify logo upload functionality
"""

import requests
import os
from pathlib import Path

def test_logo_upload():
    """Test the logo upload functionality"""
    
    # API base URL
    base_url = "http://localhost:8000"
    
    # Test data
    company_data = {
        'name': 'Test Company',
        'code': 'TEST001',
        'gst_number': '12ABCDE1234F1Z5',
        'address': '123 Test Street',
        'contact_person': 'John Doe',
        'email': 'test@company.com',
        'phone': '+1234567890'
    }
    
    # Create a simple test image (1x1 pixel PNG)
    test_image_data = b'\\x89PNG\\r\\n\\x1a\\n\\x00\\x00\\x00\\rIHDR\\x00\\x00\\x00\\x01\\x00\\x00\\x00\\x01\\x08\\x02\\x00\\x00\\x00\\x90wS\\xde\\x00\\x00\\x00\\tpHYs\\x00\\x00\\x0b\\x13\\x00\\x00\\x0b\\x13\\x01\\x00\\x9a\\x9c\\x18\\x00\\x00\\x00\\nIDATx\\x9cc```\\x00\\x00\\x00\\x04\\x00\\x01\\xdd\\x8d\\xb4\\x1c\\x00\\x00\\x00\\x00IEND\\xaeB`\\x82'\n    \n    # Save test image\    test_image_path = Path('test_logo.png')\n    with open(test_image_path, 'wb') as f:\n        f.write(test_image_data)\n    \n    try:\n        # Test company creation with logo\n        with open(test_image_path, 'rb') as logo_file:\n            files = {'logo': ('test_logo.png', logo_file, 'image/png')}\n            \n            response = requests.post(\n                f\"{base_url}/company/\",\n                data=company_data,\n                files=files\n            )\n            \n            if response.status_code == 200:\n                print(\"✅ Company created successfully with logo!\")\n                company = response.json()\n                print(f\"Company ID: {company['id']}\")\n                print(f\"Logo Path: {company.get('logo_path', 'Not set')}\")\n                \n                # Test logo retrieval\n                logo_response = requests.get(f\"{base_url}/company/{company['id']}/logo\")\n                if logo_response.status_code == 200:\n                    logo_data = logo_response.json()\n                    print(f\"✅ Logo path retrieved: {logo_data['logo_path']}\")\n                else:\n                    print(f\"❌ Failed to retrieve logo: {logo_response.status_code}\")\n                    \n            else:\n                print(f\"❌ Failed to create company: {response.status_code}\")\n                print(response.text)\n                \n    except requests.exceptions.ConnectionError:\n        print(\"❌ Could not connect to server. Make sure the backend is running on localhost:8000\")\n    except Exception as e:\n        print(f\"❌ Test failed: {e}\")\n    finally:\n        # Clean up test file\n        if test_image_path.exists():\n            test_image_path.unlink()\n            print(\"🧹 Cleaned up test files\")\n\nif __name__ == \"__main__\":\n    test_logo_upload()