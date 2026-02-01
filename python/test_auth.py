import os
from google.cloud import vision

try:
    # Force set it here to be sure for the test
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "service-account.json"
    client = vision.ImageAnnotatorClient()
    print("Auth Success")
except Exception as e:
    print(f"Auth Failed: {e}")
