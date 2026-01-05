"""
Debug script to test socket connectivity to database.
Uses environment variables for host and port.
"""
import socket
import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Get host and port from environment
host = os.environ.get('POSTGRES_HOST')
port = int(os.environ.get('POSTGRES_PORT', 5432))

if not host:
    print("ERROR: POSTGRES_HOST environment variable not set.")
    print("Please set it in your .env file.")
    sys.exit(1)

print(f"Attempting to connect to {host}:{port}...")

try:
    sock = socket.create_connection((host, port), timeout=5)
    print("✅ SUCCESS: Connected to socket")
    sock.close()
except Exception as e:
    print(f"❌ FAILURE: {e}")
    sys.exit(1)
