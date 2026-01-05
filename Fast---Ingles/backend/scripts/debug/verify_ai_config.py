"""
Verify AI configuration via API.
Uses environment variables for all credentials.
"""
import requests
import os
from dotenv import load_dotenv

load_dotenv()

API_URL = os.environ.get('API_URL')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD')

# Validate required variables
missing = []
if not API_URL:
    missing.append('API_URL')
if not ADMIN_EMAIL:
    missing.append('ADMIN_EMAIL')
if not ADMIN_PASSWORD:
    missing.append('ADMIN_PASSWORD')

if missing:
    print(f"ERROR: Missing environment variables: {', '.join(missing)}")
    print("Please set them in your .env file.")
    exit(1)

def main():
    # Login
    print(f"Logging in as {ADMIN_EMAIL}...")
    response = requests.post(f"{API_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if response.status_code != 200:
        print(f"Login failed: {response.text}")
        exit(1)
    
    token = response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get AI config
    print("Getting AI configuration...")
    response = requests.get(f"{API_URL}/api/admin/ai-config", headers=headers)
    
    if response.status_code == 200:
        print(f"AI Config: {response.json()}")
    else:
        print(f"Error: {response.status_code} - {response.text}")
    
    print("✅ AI config verification complete!")

if __name__ == "__main__":
    main()
