import httpx
import asyncio
import time

BASE_URL = "http://127.0.0.1:8000/api/v1"
# Since auth is mocked to user_id 1, no actual token is needed for these tests.
# If real auth was in place, you'd get a token from a login endpoint first.
# HEADERS = {"Authorization": "Bearer YOUR_MOCKED_OR_REAL_TOKEN"}
HEADERS = {"Content-Type": "application/json"}

# Store news_digest_id from successful generation to test status endpoint
current_news_digest_id = None

async def test_update_user_preferences(client: httpx.AsyncClient):
    print("--- Test Case 1.A: Update User Preferences ---")
    payload = {
        "preferred_topics": ["technology", "science"],
        "custom_keywords": [],
        "include_source_rss_urls": [
            "http://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
            "https://www.technologyreview.com/feed/"
        ],
        "exclude_keywords": ["rumor", "opinion"],
        "exclude_source_domains": ["fakenews.example.com"],
        "default_language": "en",
        "default_audio_style": "professional_narrator"
    }
    try:
        response = await client.put(f"{BASE_URL}/user/preferences/me", json=payload, headers=HEADERS)
        response.raise_for_status() # Raise an exception for HTTP errors 4xx/5xx
        print(f"Status Code: {response.status_code}")
        print(f"Response JSON: {response.json()}")
        print("User preferences updated successfully.")
    except httpx.HTTPStatusError as e:
        print(f"Error updating preferences: {e.response.status_code} - {e.response.text}")
    except httpx.RequestError as e:
        print(f"Request error for updating preferences: {e}")
    print("---------------------------------------------\n")

async def test_get_user_preferences(client: httpx.AsyncClient):
    print("--- Test Case 1.B: Get User Preferences ---")
    try:
        response = await client.get(f"{BASE_URL}/user/preferences/me", headers=HEADERS)
        response.raise_for_status()
        print(f"Status Code: {response.status_code}")
        retrieved_prefs = response.json()
        print(f"Response JSON: {retrieved_prefs}")
        # Basic check against one of the previously set values
        if "technology" in retrieved_prefs.get("preferred_topics", []):
            print("User preferences retrieved successfully and seem consistent.")
        else:
            print("Retrieved preferences don't match expected. Might be defaults or an issue.")
    except httpx.HTTPStatusError as e:
        print(f"Error getting preferences: {e.response.status_code} - {e.response.text}")
    except httpx.RequestError as e:
        print(f"Request error for getting preferences: {e}")
    print("---------------------------------------------")

async def test_generate_podcast_with_defaults(client: httpx.AsyncClient):
    global current_news_digest_id
    print("--- Test Case 2.A: Generate Podcast with Stored Preferences ---")
    payload = {
        "use_user_default_preferences": True
        # language and audio_style will be picked from user's defaults or request defaults
    }
    try:
        response = await client.post(f"{BASE_URL}/podcasts/generate-podcast", json=payload, headers=HEADERS)
        response.raise_for_status()
        print(f"Status Code: {response.status_code}")
        response_data = response.json()
        print(f"Response JSON: {response_data}")
        current_news_digest_id = response_data.get("news_digest_id")
        if current_news_digest_id:
            print(f"Podcast generation with defaults started. News Digest ID: {current_news_digest_id}")
            print("Monitor FastAPI logs for background task progress & NewsProcessingService criteria.")
        else:
            print("Failed to get news_digest_id from response.")
    except httpx.HTTPStatusError as e:
        print(f"Error generating podcast with defaults: {e.response.status_code} - {e.response.text}")
    except httpx.RequestError as e:
        print(f"Request error for generating podcast with defaults: {e}")
    print("------------------------------------------------------------------\n")
    # Add a small delay to allow background task to start and potentially create logs
    await asyncio.sleep(5) 

async def test_generate_podcast_with_overrides(client: httpx.AsyncClient):
    print("--- Test Case 2.B: Generate Podcast with Overrides ---")
    payload = {
        "use_user_default_preferences": True,
        "request_topics": ["space travel"], 
        "request_keywords": None, # Explicitly nullify/clear keywords for this run
        "language": "fr",
        "audio_style": "enthusiastic_reporter"
    }
    try:
        response = await client.post(f"{BASE_URL}/podcasts/generate-podcast", json=payload, headers=HEADERS)
        response.raise_for_status()
        print(f"Status Code: {response.status_code}")
        print(f"Response JSON: {response.json()}")
        print("Podcast generation with overrides started.")
        print("Monitor FastAPI logs. Criteria should show 'space travel', no keywords from prefs, lang 'fr'.")
    except httpx.HTTPStatusError as e:
        print(f"Error generating podcast with overrides: {e.response.status_code} - {e.response.text}")
    except httpx.RequestError as e:
        print(f"Request error for generating podcast with overrides: {e}")
    print("------------------------------------------------------\n")
    await asyncio.sleep(5)

async def test_generate_podcast_specific_urls(client: httpx.AsyncClient):
    print("--- Test Case 2.C: Generate Podcast with Specific URLs ---")
    payload = {
        "specific_article_urls": [
            "https://www.theverge.com/2024/3/1/24088441/apple-macbook-air-m3-announcement",
            # Add another valid and different news URL if possible
            "https://techcrunch.com/2024/03/04/cognition-launches-with-21m-to-build-an-ai-software-engineer-named-devin/"
        ],
        "language": "en",
        "audio_style": "news_anchor"
    }
    try:
        response = await client.post(f"{BASE_URL}/podcasts/generate-podcast", json=payload, headers=HEADERS)
        response.raise_for_status()
        print(f"Status Code: {response.status_code}")
        print(f"Response JSON: {response.json()}")
        print("Podcast generation with specific URLs started.")
        print("Monitor FastAPI logs. NewsProcessingService should fetch these specific URLs.")
    except httpx.HTTPStatusError as e:
        print(f"Error generating podcast with specific URLs: {e.response.status_code} - {e.response.text}")
    except httpx.RequestError as e:
        print(f"Request error for generating podcast with specific URLs: {e}")
    print("--------------------------------------------------------\n")
    await asyncio.sleep(5)

async def test_generate_podcast_adhoc(client: httpx.AsyncClient):
    print("--- Test Case 2.D: Generate Podcast with Ad-hoc Criteria ---")
    payload = {
        "use_user_default_preferences": False, 
        "request_topics": ["independent filmmakers"],
        "request_rss_urls": ["https://nofilmschool.com/rss.xml"], 
        "language": "en",
        "audio_style": "documentary_style"
    }
    try:
        response = await client.post(f"{BASE_URL}/podcasts/generate-podcast", json=payload, headers=HEADERS)
        response.raise_for_status()
        print(f"Status Code: {response.status_code}")
        print(f"Response JSON: {response.json()}")
        print("Podcast generation with ad-hoc criteria started.")
        print("Monitor FastAPI logs. Only ad-hoc criteria should be used.")
    except httpx.HTTPStatusError as e:
        print(f"Error generating podcast with ad-hoc criteria: {e.response.status_code} - {e.response.text}")
    except httpx.RequestError as e:
        print(f"Request error for generating podcast with ad-hoc criteria: {e}")
    print("------------------------------------------------------------\n")
    await asyncio.sleep(5)

async def test_generate_podcast_override_keywords(client: httpx.AsyncClient):
    print("--- Test Case 2.E: Generate Podcast with Override Specific Keywords ---")
    payload = {
        "use_user_default_preferences": True,
        "request_keywords": ["mars rover", "space exploration"], # Override keywords
        # Topics, RSS, exclusions, lang, style should come from user prefs or their defaults
    }
    try:
        response = await client.post(f"{BASE_URL}/podcasts/generate-podcast", json=payload, headers=HEADERS)
        response.raise_for_status()
        print(f"Status Code: {response.status_code}")
        print(f"Response JSON: {response.json()}")
        print("Podcast generation with overridden keywords started.")
        print("Monitor FastAPI logs. Criteria should show 'mars rover', 'space exploration' for keywords; topics/RSS from prefs.")
    except httpx.HTTPStatusError as e:
        print(f"Error generating podcast with overridden keywords: {e.response.status_code} - {e.response.text}")
    except httpx.RequestError as e:
        print(f"Request error for generating podcast with overridden keywords: {e}")
    print("----------------------------------------------------------------------------\n")
    await asyncio.sleep(5)

async def test_generate_podcast_override_rss(client: httpx.AsyncClient):
    print("--- Test Case 2.F: Generate Podcast with Override Specific RSS Feeds ---")
    payload = {
        "use_user_default_preferences": True,
        "request_rss_urls": ["https://rss.nytimes.com/services/xml/rss/nyt/Space.xml"], # Override RSS
        # Topics, keywords, exclusions, lang, style should come from user prefs or their defaults
    }
    try:
        response = await client.post(f"{BASE_URL}/podcasts/generate-podcast", json=payload, headers=HEADERS)
        response.raise_for_status()
        print(f"Status Code: {response.status_code}")
        print(f"Response JSON: {response.json()}")
        print("Podcast generation with overridden RSS feeds started.")
        print("Monitor FastAPI logs. Criteria should show only NYT Space RSS; topics/keywords from prefs.")
    except httpx.HTTPStatusError as e:
        print(f"Error generating podcast with overridden RSS: {e.response.status_code} - {e.response.text}")
    except httpx.RequestError as e:
        print(f"Request error for generating podcast with overridden RSS: {e}")
    print("---------------------------------------------------------------------------\n")
    await asyncio.sleep(5)

async def test_generate_podcast_override_exclude_keywords(client: httpx.AsyncClient):
    print("--- Test Case 2.G: Generate Podcast with Override Exclude Keywords ---")
    payload = {
        "use_user_default_preferences": True,
        "request_exclude_keywords": ["budget cuts", "controversy"], # Override exclude_keywords
        # Topics, keywords, RSS, exclude_domains, lang, style should come from user prefs / defaults
    }
    try:
        response = await client.post(f"{BASE_URL}/podcasts/generate-podcast", json=payload, headers=HEADERS)
        response.raise_for_status()
        print(f"Status Code: {response.status_code}")
        print(f"Response JSON: {response.json()}")
        print("Podcast generation with overridden exclude_keywords started.")
        print("Monitor FastAPI logs. Criteria should show new exclude_keywords; others from prefs.")
    except httpx.HTTPStatusError as e:
        print(f"Error generating podcast with overridden exclude_keywords: {e.response.status_code} - {e.response.text}")
    except httpx.RequestError as e:
        print(f"Request error for generating podcast with overridden exclude_keywords: {e}")
    print("--------------------------------------------------------------------------------\n")
    await asyncio.sleep(5)

async def test_generate_podcast_override_exclude_domains(client: httpx.AsyncClient):
    print("--- Test Case 2.H: Generate Podcast with Override Exclude Domains ---")
    payload = {
        "use_user_default_preferences": True,
        "request_exclude_source_domains": ["example-news.com", "another-one.org"], # Override exclude_domains
    }
    try:
        response = await client.post(f"{BASE_URL}/podcasts/generate-podcast", json=payload, headers=HEADERS)
        response.raise_for_status()
        print(f"Status Code: {response.status_code}")
        print(f"Response JSON: {response.json()}")
        print("Podcast generation with overridden exclude_domains started.")
        print("Monitor FastAPI logs. Criteria should show new exclude_domains; others from prefs.")
    except httpx.HTTPStatusError as e:
        print(f"Error generating podcast with overridden exclude_domains: {e.response.status_code} - {e.response.text}")
    except httpx.RequestError as e:
        print(f"Request error for generating podcast with overridden exclude_domains: {e}")
    print("---------------------------------------------------------------------------------\n")
    await asyncio.sleep(5)

async def test_generate_podcast_override_empty_topics(client: httpx.AsyncClient):
    print("--- Test Case 2.I: Generate Podcast with Override Empty Topics List ---")
    payload = {
        "use_user_default_preferences": True,
        "request_topics": [], # Override topics with an empty list (request no topic filtering)
    }
    try:
        response = await client.post(f"{BASE_URL}/podcasts/generate-podcast", json=payload, headers=HEADERS)
        response.raise_for_status()
        print(f"Status Code: {response.status_code}")
        print(f"Response JSON: {response.json()}")
        print("Podcast generation with overridden empty topics list started.")
        print("Monitor FastAPI logs. Criteria should show empty topics list; keywords/RSS from prefs.")
    except httpx.HTTPStatusError as e:
        print(f"Error generating podcast with overridden empty topics: {e.response.status_code} - {e.response.text}")
    except httpx.RequestError as e:
        print(f"Request error for generating podcast with overridden empty topics: {e}")
    print("------------------------------------------------------------------------------------\n")
    await asyncio.sleep(5)

async def test_get_podcast_status(client: httpx.AsyncClient):
    global current_news_digest_id
    print("--- Test Case 3: Get Podcast Status ---")
    if not current_news_digest_id:
        print("No news_digest_id available from previous tests to check status. Skipping.")
        print("----------------------------------------\n")
        return

    print(f"Checking status for News Digest ID: {current_news_digest_id}")
    max_retries = 10 # ~50 seconds
    retry_delay = 5  # seconds
    for attempt in range(max_retries):
        try:
            response = await client.get(f"{BASE_URL}/podcasts/podcast-status/{current_news_digest_id}", headers=HEADERS)
            response.raise_for_status()
            status_data = response.json()
            print(f"Attempt {attempt + 1}: Status Code: {response.status_code}, Status: {status_data.get('status')}")
            print(f"Response JSON: {status_data}")
            if status_data.get("status") in ["COMPLETED", "FAILED"]:
                print("Podcast processing finished.")
                if status_data.get("status") == "COMPLETED":
                    print(f"Audio URL: {status_data.get('audio_url')}")
                elif status_data.get("status") == "FAILED":
                    print(f"Error Message: {status_data.get('error_message')}")
                break
            await asyncio.sleep(retry_delay)
        except httpx.HTTPStatusError as e:
            print(f"Error getting status (Attempt {attempt + 1}): {e.response.status_code} - {e.response.text}")
            if e.response.status_code == 404:
                 print("News Digest not found, likely an issue with ID or creation.")
                 break # No point retrying if 404
            await asyncio.sleep(retry_delay) # Wait before retrying other HTTP errors
        except httpx.RequestError as e:
            print(f"Request error for getting status (Attempt {attempt + 1}): {e}")
            await asyncio.sleep(retry_delay)
        if attempt == max_retries - 1:
            print("Max retries reached for status check. Podcast might still be processing or encountered an issue.")
    print("----------------------------------------\n")

async def main():
    # Use a try-finally block to ensure the client is always closed
    async with httpx.AsyncClient(timeout=20.0) as client: # Increased timeout for potentially slow first requests
        print("Starting API tests...")
        
        # Test User Preferences
        await test_update_user_preferences(client)
        await test_get_user_preferences(client)

        # Test Podcast Generation Scenarios
        # Run these sequentially to avoid overwhelming the background worker/TTS service too quickly
        # and to have a current_news_digest_id for the status check.
        await test_generate_podcast_with_defaults(client)
        
        # Only run status check if the first generation was initiated
        if current_news_digest_id: 
            await test_get_podcast_status(client)
        else:
            print("Skipping initial status check as first podcast generation failed to start.")

        await test_generate_podcast_with_overrides(client)
        # You could add another status check here for the override podcast if needed

        await test_generate_podcast_specific_urls(client)
        # And here for specific URLs

        await test_generate_podcast_adhoc(client)
        # And here for adhoc

        # New detailed override tests
        await test_generate_podcast_override_keywords(client)
        await test_generate_podcast_override_rss(client)
        await test_generate_podcast_override_exclude_keywords(client)
        await test_generate_podcast_override_exclude_domains(client)
        await test_generate_podcast_override_empty_topics(client)

        print("API tests completed. Please check FastAPI logs for detailed background processing information.")

if __name__ == "__main__":
    asyncio.run(main()) 