from flask import Flask, request, jsonify
from duckduckgo_search import DDGS
import google.generativeai as genai
import os
import json
import sys
import asyncio

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

app = Flask(__name__)

# Configure Gemini
def get_gemini_model():
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        return None
    genai.configure(api_key=api_key)
    return genai.GenerativeModel('gemini-1.5-flash')

@app.route('/api/update-info', methods=['POST'])
def update_info():
    data = request.get_json()
    restaurant_name = data.get('name')
    restaurant_address = data.get('address', '')
    
    if not restaurant_name:
        return jsonify({"error": "Restaurant name is required"}), 400

    # 1. Search Web
    query = f"{restaurant_name} {restaurant_address}"
    search_results = []
    try:
        with DDGS() as ddgs:
            # Get top 5 results
            results = list(ddgs.text(query, max_results=5))
            for r in results:
                search_results.append(f"Title: {r['title']}\nSnippet: {r['body']}\n")
    except Exception as e:
        print(f"Search failed: {e}")
        return jsonify({"error": f"Search failed: {str(e)}"}), 500

    if not search_results:
        return jsonify({"error": "No search results found"}), 404

    # 2. Process with Gemini
    model = get_gemini_model()
    if not model:
        return jsonify({"error": "Gemini API Key not configured"}), 500

    context = "\n".join(search_results)
    prompt = f"""
    You are an AI assistant that extracts restaurant information from search results.
    Target Restaurant: {restaurant_name} ({restaurant_address})

    Search Results:
    {context}

    Based on the search results, extract the following information in JSON format:
    - status: Current business status (e.g., "영업 중", "영업 종료", "정보 없음").
    - businessHours: Strings describing business hours and break time (e.g. "Mon-Fri 10:00-22:00").
    - phoneNumber: Phone number.
    - recentVibes: A one-line summary of the restaurant's vibe based on reviews (in Korean).
    - priceRange: Approximate price range (e.g., "1만원대").

    If information is not found, leave the field as null or empty string.
    Return ONLY the JSON object, no markdown formatting.
    """

    try:
        response = model.generate_content(prompt)
        text_response = response.text.strip()
        # Clean up code blocks if present
        if text_response.startswith('```json'):
            text_response = text_response[7:]
        if text_response.endswith('```'):
            text_response = text_response[:-3]
        
        extracted_data = json.loads(text_response)
        return jsonify(extracted_data)

    except Exception as e:
        print(f"Gemini processing failed: {e}")
        return jsonify({"error": f"AI processing failed: {str(e)}"}), 500
