from flask import Flask, request, jsonify
from google.cloud import vision
from google.oauth2 import service_account
import os
import json
import re

app = Flask(__name__)

def get_vision_client():
    # Use environment variable for credentials (JSON string)
    creds_json = os.environ.get('GOOGLE_CREDENTIALS_JSON')
    
    if creds_json:
        try:
            info = json.loads(creds_json)
            creds = service_account.Credentials.from_service_account_info(info)
            return vision.ImageAnnotatorClient(credentials=creds)
        except Exception as e:
            print(f"Error loading credentials from JSON: {e}")
            return None
            
    # Fallback to local file for testing if env var not set
    # (Though in Vercel, env var is the way to go)
    if os.environ.get('GOOGLE_APPLICATION_CREDENTIALS'):
        return vision.ImageAnnotatorClient()
        
    return None

@app.route('/api/analyze', methods=['POST'])
def analyze_image():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    content = file.read()

    client = get_vision_client()
    if not client:
        return jsonify({"error": "Server configuration error: Google Cloud Credentials not found"}), 500

    image = vision.Image(content=content)

    try:
        response = client.text_detection(image=image)
        texts = response.text_annotations
        
        # Labels for tags
        label_response = client.label_detection(image=image)
        labels = label_response.label_annotations
    except Exception as e:
        return jsonify({"error": f"Vision API error: {str(e)}"}), 500

    if response.error.message:
        return jsonify({"error": response.error.message}), 500

    if not texts:
        return jsonify({
            "restaurant_name": "", 
            "recommended_menu": [], 
            "address": "", 
            "tags": []
        })

    full_text = texts[0].description
    lines = full_text.split('\n')

    # Heuristics (Same as before)
    name = lines[0].strip()
    restaurant_address = ""
    address_pattern = re.compile(r'([가-힣]+(시|도|군|구)).+([가-힣]+(길|로|동|가|읍|면))')
    
    recommended_menu = []
    price_pattern = re.compile(r'[0-9]{1,3}(,[0-9]{3})*')
    
    tags = []
    for label in labels:
        if label.score > 0.7:
             tags.append(f"#{label.description.replace(' ', '')}")

    for line in lines:
        line = line.strip()
        if not line: continue
        if not restaurant_address and address_pattern.search(line):
             restaurant_address = line
        if price_pattern.search(line) and len(line) > 3:
            if line not in recommended_menu:
                 recommended_menu.append(line)

    if name.lower() in ["menu", "메뉴", "차림표"] and len(lines) > 1:
        name = lines[1].strip()

    return jsonify({
        "restaurant_name": name,
        "recommended_menu": recommended_menu[:3],
        "address": restaurant_address,
        "tags": tags[:5]
    })

# For Vercel, we need to expose the app
# Vercel entry point looks for 'app' usually
