
from minio import Minio
from dotenv import load_dotenv
import os

load_dotenv()

endpoint = os.getenv("MINIO_ENDPOINT")
access_key = os.getenv("MINIO_ACCESS_KEY")
secret_key = os.getenv("MINIO_SECRET_KEY")
bucket_name = os.getenv("MINIO_BUCKET")
secure = os.getenv("MINIO_SECURE", "false").lower() == "true"

print(f"🚀 Testing MinIO connection to {endpoint}...")

try:
    client = Minio(
        endpoint,
        access_key=access_key,
        secret_key=secret_key,
        secure=secure
    )
    
    # Check if bucket exists
    if not client.bucket_exists(bucket_name):
        print(f"⚠️  Bucket '{bucket_name}' does not exist. Creating it...")
        client.make_bucket(bucket_name)
        print(f"✅ Bucket '{bucket_name}' created successfully.")
    else:
        print(f"✅ Bucket '{bucket_name}' already exists.")
    
    # List buckets to confirm connection
    buckets = client.list_buckets()
    print(f"📦 Total buckets found: {len(buckets)}")
    for bucket in buckets:
        print(f"   - {bucket.name}")

    print("✨ MinIO Connection Verified Successfully!")

except Exception as e:
    print(f"❌ Error connecting to MinIO: {e}")
    exit(1)
