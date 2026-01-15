"""
Test script to create a segment and see detailed error logs
Run this to test segment creation and see what errors occur
"""

import requests
import json
import sys

# Test data
category_id = "3d4217e5-144e-4267-868a-22f4f76efce7"
url = f"http://localhost:8000/api/v1/admin/categories/{category_id}/segments"

# You'll need to get a valid admin token
# For now, this will show the error response
token = "YOUR_ADMIN_TOKEN_HERE"  # Replace with actual token

headers = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Origin": "http://localhost:3000",
}

if token != "YOUR_ADMIN_TOKEN_HERE":
    headers["Authorization"] = f"Bearer {token}"

data = {
    "category_id": category_id,
    "name": "Highlights",
    "description": " ",
    "is_collapsible": True
}

print("=" * 60)
print("Testing Segment Creation")
print("=" * 60)
print(f"URL: {url}")
print(f"Method: POST")
print(f"Headers: {json.dumps(headers, indent=2)}")
print(f"Data: {json.dumps(data, indent=2)}")
print("=" * 60)
print()

try:
    response = requests.post(url, json=data, headers=headers, timeout=10)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print()
    
    try:
        response_json = response.json()
        print("Response Body:")
        print(json.dumps(response_json, indent=2))
    except:
        print("Response Body (text):")
        print(response.text)
    
    if response.status_code != 201:
        print()
        print("=" * 60)
        print("ERROR - Request failed!")
        print("=" * 60)
        print("Check backend logs at: backend/logs/backend.log")
        print("View logs with: .\\view_backend_logs.ps1")
        
except requests.exceptions.RequestException as e:
    print(f"Request failed: {e}")
    print()
    print("Make sure:")
    print("  1. Backend is running on http://localhost:8000")
    print("  2. You have a valid admin token")
    print("  3. Check backend logs for more details")
