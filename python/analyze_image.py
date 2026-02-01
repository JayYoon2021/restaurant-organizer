import sys
import json
import io
import re
import os

# Try to import vision; handle case where it's not installed or setup
try:
    from google.cloud import vision
except ImportError:
    print(json.dumps({"error": "google-cloud-vision library not installed"}))
    sys.exit(1)

def analyze_image(path):
    # Instantiate a client
    # This assumes GOOGLE_APPLICATION_CREDENTIALS environment variable is set
    # or 'gcloud auth application-default login' has been run.
    try:
        client = vision.ImageAnnotatorClient()
    except Exception as e:
        return {"error": f"Failed to initialize Vision Client: {str(e)}"}

    try:
        with io.open(path, 'rb') as image_file:
            content = image_file.read()
    except Exception as e:
        return {"error": f"Failed to read file: {str(e)}"}

    image = vision.Image(content=content)

    # Perform text detection
    try:
        response = client.text_detection(image=image)
        texts = response.text_annotations
        
        # Perform label detection for tags
        label_response = client.label_detection(image=image)
        labels = label_response.label_annotations
    except Exception as e:
        return {"error": f"Vision API request failed: {str(e)}"}

    if response.error.message:
        return {"error": response.error.message}

    if not texts:
        return {"restaurant_name": "", "recommended_menu": [], "address": "", "tags": [], "raw_text": ""}

    full_text = texts[0].description
    lines = full_text.split('\n')

    # Heuristics
    # 1. Name: Assume the first non-empty line is the name.
    #    Improvement: Could check for font size if we iterated over words, but line 1 is decent baseline.
    name = lines[0].strip()

    # 2. Address: Regex for Korean address patterns
    restaurant_address = ""
    # Matches patterns like "Seoul Gangnam-gu...", "경기도 성남시..."
    # A simplified regex for identifying address-like lines
    address_keywords = ['시', '구', '동', '길', '로', '읍', '면']
    # Regex to find a sequence that looks like an address (e.g., ending in specific suffixes)
    address_pattern = re.compile(r'([가-힣]+(시|도|군|구)).+([가-힣]+(길|로|동|가|읍|면))')

    # 3. Menu: Lines containing prices
    recommended_menu = []
    price_pattern = re.compile(r'[0-9]{1,3}(,[0-9]{3})*') # simple number match, effectively
    
    # 4. Tags
    tags = []
    # Add some default tags or derived from labels
    for label in labels:
        if label.score > 0.7:
             # Translate or just use English labels for now, or simplistic mapping if needed
             # Ideally we'd translate, but let's just keep them or prepend #
             tags.append(f"#{label.description.replace(' ', '')}")

    # Process lines for Address and Menu
    for line in lines:
        line = line.strip()
        if not line: continue

        # Check for address (if not found yet)
        if not restaurant_address and address_pattern.search(line):
             restaurant_address = line
        
        # Check for menu (if line has digits and text)
        # Avoid things that look like phone numbers (xxx-xxxx) or dates for now?
        # Simple heuristic: has digits and length is reasonable
        if price_pattern.search(line) and len(line) > 3:
            if line not in recommended_menu:
                 recommended_menu.append(line)

    # Fallback for name if first line was just "Menu" or something generic
    if name.lower() in ["menu", "메뉴", "차림표"] and len(lines) > 1:
        name = lines[1].strip()

    return {
        "restaurant_name": name,
        "recommended_menu": recommended_menu[:3], # Limit to top 3
        "address": restaurant_address,
        "tags": tags[:5] # Limit to top 5
    }

if __name__ == "__main__":
    # Ensure stdout is utf-8
    sys.stdout.reconfigure(encoding='utf-8')

    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    result = analyze_image(image_path)
    print(json.dumps(result, ensure_ascii=False))
