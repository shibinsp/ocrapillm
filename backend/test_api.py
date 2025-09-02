import requests
import json

# Test basic health endpoint first
print("Testing health endpoint...")
try:
    response = requests.get("http://localhost:8000/health")
    print(f"Health Status Code: {response.status_code}")
    print(f"Health Response: {response.text}")
except Exception as e:
    print(f"Health Error: {e}")

print("\n" + "="*50 + "\n")

# Test documents endpoint
print("Testing documents endpoint...")
try:
    response = requests.get("http://localhost:8000/documents/")
    print(f"Documents Status Code: {response.status_code}")
    print(f"Documents Response: {response.text[:200]}...")
except Exception as e:
    print(f"Documents Error: {e}")

print("\n" + "="*50 + "\n")

# Test the get_document_pages endpoint
doc_id = "f05194fc-d873-48ab-a180-9fa617936bdc"
url = f"http://localhost:8000/documents/{doc_id}/pages"

print(f"Testing URL: {url}")
print(f"Document ID: {doc_id}")

try:
    response = requests.get(url)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")