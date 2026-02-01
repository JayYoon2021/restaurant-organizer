from duckduckgo_search import DDGS
import google.generativeai as genai
import json
import sys
import asyncio

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

def test_auto_update():
    # Load env vars for local test
    # (Assuming .env.local was populated or just hardcode key for this disposable test if needed, 
    # but better to read from env or assume user env is set)
    
    # Simple env parser since python-dotenv might not be installed
    if os.path.exists('../.env.local'):
        with open('../.env.local', 'r', encoding='utf-8') as f:
            for line in f:
                if line.startswith('GEMINI_API_KEY='):
                    os.environ['GEMINI_API_KEY'] = line.split('=', 1)[1].strip().strip('"')

    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        print("Error: GEMINI_API_KEY not found")
        return

    print(f"API Key found: {api_key[:5]}...")

    restaurant_name = "을지다락"
    restaurant_address = "서울 중구"
    
    print(f"Searching for {restaurant_name}...")
    
    query = f"{restaurant_name} {restaurant_address}"
    search_results = []
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=3))
            for r in results:
                print(f"Found: {r['title']}")
                search_results.append(f"Title: {r['title']}\nSnippet: {r['body']}\n")
    except Exception as e:
        print(f"Search failed: {e}")
        return

    print("Sending to Gemini...")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    context = "\n".join(search_results)
    prompt = f"""
    Target Restaurant: {restaurant_name} ({restaurant_address})
    Search Results:
    {context}
    
    Extract JSON (status, businessHours, phoneNumber, recentVibes, priceRange).
    """
    
    try:
        response = model.generate_content(prompt)
        print("Gemini Response:")
        print(response.text)
    except Exception as e:
        print(f"Gemini failed: {e}")

if __name__ == "__main__":
    test_auto_update()
