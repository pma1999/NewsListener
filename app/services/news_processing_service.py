import logging
from typing import List, Optional, Dict, Any
import feedparser # New import
import requests # New import
from bs4 import BeautifulSoup # New import
import asyncio # For running async http requests if needed, or just for consistency with async def

logger = logging.getLogger(__name__)

class NewsProcessingService:
    def __init__(self):
        # In the future, this could initialize clients for news APIs, etc.
        pass

    async def _fetch_article_content(self, url: str) -> Optional[str]:
        """Fetches and extracts text content from a single article URL."""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 NewsListenerApp/1.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'DNT': '1', # Do Not Track
                'Upgrade-Insecure-Requests': '1'
            }
            # Using asyncio.to_thread for synchronous requests in an async function
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, lambda: requests.get(url, timeout=15, headers=headers))
            response.raise_for_status()
            
            # Decode content explicitly using UTF-8, fallback to apparent_encoding
            content_bytes = response.content
            try:
                html_content = content_bytes.decode('utf-8')
            except UnicodeDecodeError:
                html_content = content_bytes.decode(response.apparent_encoding, errors='replace')

            soup = BeautifulSoup(html_content, 'html.parser')
            
            paragraphs = soup.find_all('p')
            text_content = "\n".join([p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True)])
            
            if not text_content.strip() or len(text_content.strip()) < 100: # Check for minimal content length
                logger.warning(f"Paragraph extraction yielded little to no content for URL: {url}. Trying main content tags.")
                # Try to find common main content containers
                main_content_tags = soup.find_all(['article', 'main', {'role': 'main'}, {'id': 'content'}, {'class': 'content'}])
                if main_content_tags:
                    text_content = "\n".join([tag.get_text(separator='\n', strip=True) for tag in main_content_tags])
                else:
                     # Fallback: get text from body, can be noisy
                    body_text = soup.body.get_text(separator='\n', strip=True) if soup.body else None
                    if body_text and len(body_text) > 100:
                        logger.info(f"Falling back to body text for {url}")
                        text_content = body_text
                    else:
                        logger.warning(f"No substantial text content found for URL: {url}")
                        return None
            
            return text_content.strip()

        except requests.Timeout:
            logger.error(f"Timeout fetching URL {url}")
            return None
        except requests.RequestException as e:
            logger.error(f"Error fetching URL {url}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error processing article content from {url}: {e}", exc_info=True)
            return None

    async def _fetch_rss_feed_items(self, rss_url: str) -> List[Dict[str, str]]:
        """Fetches and parses items from an RSS feed."""
        items = []
        try:
            logger.info(f"Fetching RSS feed: {rss_url}")
            # Using asyncio.to_thread for synchronous feedparser in an async function
            loop = asyncio.get_event_loop()
            feed_data = await loop.run_in_executor(None, lambda: feedparser.parse(rss_url))

            if feed_data.bozo:
                logger.warning(f"RSS feed {rss_url} may be malformed: {feed_data.bozo_exception}")

            for entry in feed_data.entries:
                title = entry.get("title", "")
                link = entry.get("link", "")
                summary = entry.get("summary", entry.get("description", ""))
                
                content_from_rss = ""
                if hasattr(entry, 'content') and entry.content:
                    if isinstance(entry.content, list) and len(entry.content) > 0:
                        content_value = entry.content[0].get('value', '')
                        soup = BeautifulSoup(content_value, 'html.parser')
                        content_from_rss = soup.get_text(separator='\n', strip=True)
                
                # Prefer full content from RSS, then summary. Title used if both are empty.
                text_for_llm = content_from_rss if content_from_rss else summary
                if not text_for_llm.strip() and title: # If content and summary are empty, use title as placeholder
                    text_for_llm = title

                if title and link: # Must have at least title and link
                    items.append({
                        "title": title.strip(), 
                        "link": link.strip(), 
                        "summary": summary.strip(), 
                        "content_preview": text_for_llm.strip()[:500], # Preview of what we send to LLM initially
                        "full_content_from_rss": text_for_llm.strip()
                    })
            logger.info(f"Fetched {len(items)} items from RSS feed: {rss_url}")
        except Exception as e:
            logger.error(f"Error fetching or parsing RSS feed {rss_url}: {e}", exc_info=True)
        return items

    async def get_content_for_news_digest(
        self, 
        criteria: Dict[str, Any],
        user_id: Optional[int] = None
    ) -> str:
        logger.info(f"NewsProcessingService: Received request with criteria: {criteria} (User: {user_id})")

        all_processed_news_items_text = []
        source_type = criteria.get("source_type")
        MAX_ARTICLES_TO_PROCESS = 15 # Limit number of articles to prevent very long outputs / processing times
        processed_article_count = 0

        if source_type == "specific_urls":
            urls = criteria.get("urls", [])
            logger.info(f"Processing {len(urls)} specific URLs provided.")
            for url in urls:
                if processed_article_count >= MAX_ARTICLES_TO_PROCESS: break
                content = await self._fetch_article_content(url)
                if content:
                    all_processed_news_items_text.append(f"Article from URL: {url}\n\n{content}")
                    processed_article_count += 1
                else:
                    all_processed_news_items_text.append(f"Article from URL: {url}\n\n[Content could not be retrieved for this URL]")
        
        elif source_type in ["user_preferences", "direct_input"]:
            rss_urls = criteria.get("rss_urls", []) or []
            topics = criteria.get("topics", []) or []
            keywords = criteria.get("keywords", []) or []
            exclude_keywords_list = criteria.get("exclude_keywords", []) or []
            exclude_domains_list = criteria.get("exclude_source_domains", []) or []
            
            raw_feed_items = []
            # Fetch from all RSS feeds concurrently using asyncio.gather
            fetch_tasks = [self._fetch_rss_feed_items(rss_url) for rss_url in rss_urls]
            results = await asyncio.gather(*fetch_tasks, return_exceptions=True) # Handle individual fetch errors
            for i, result_item in enumerate(results):
                if isinstance(result_item, Exception):
                    logger.error(f"Error fetching/processing RSS feed {rss_urls[i]}: {result_item}")
                elif result_item: # If it's a list of items
                    raw_feed_items.extend(result_item)

            logger.info(f"Collected {len(raw_feed_items)} items from all RSS feeds after handling errors.")
            
            selected_articles_content = []
            urls_processed_for_content = set()

            for item in raw_feed_items:
                if processed_article_count >= MAX_ARTICLES_TO_PROCESS: break
                item_link = item.get("link")
                if not item_link or item_link in urls_processed_for_content: continue

                try:
                    item_domain = requests.utils.urlparse(item_link).netloc.lower()
                    if any(ex_domain.lower() in item_domain for ex_domain in exclude_domains_list if ex_domain):
                        logger.debug(f"Excluding item from domain {item_domain}: {item.get('title')}")
                        continue
                except Exception as e:
                    logger.warning(f"Could not parse domain from URL {item_link}: {e}")
                    continue # Skip if URL is malformed

                title_desc_rss_content = (item.get("title", "") + " " + item.get("summary", "") + " " + item.get("full_content_from_rss", "")).lower()
                if any(ex_kw.lower() in title_desc_rss_content for ex_kw in exclude_keywords_list if ex_kw):
                    logger.debug(f"Excluding item '{item.get('title')}' due to excluded keyword.")
                    continue
                
                matched_by_criteria = not (topics or keywords) # If no topics/keywords, include all (after exclusions)
                match_reason = "no specific topic/keyword criteria" if matched_by_criteria else ""

                if not matched_by_criteria:
                    for topic in topics:
                        if topic and topic.lower() in title_desc_rss_content:
                            matched_by_criteria = True
                            match_reason = f"topic: {topic}"
                            break
                if not matched_by_criteria:
                    for keyword in keywords:
                        if keyword and keyword.lower() in title_desc_rss_content:
                            matched_by_criteria = True
                            match_reason = f"keyword: {keyword}"
                            break
                
                if matched_by_criteria:
                    logger.info(f"Item '{item.get('title')}' matched criteria (reason: {match_reason}). Link: {item_link}")
                    article_text = item.get("full_content_from_rss")
                    if not article_text or len(article_text) < 150: # If RSS content is too short/summary-like
                         logger.info(f"RSS content for '{item.get('title')}' is short/missing. Attempting to fetch full content from: {item_link}")
                         fetched_content = await self._fetch_article_content(item_link)
                         if fetched_content:
                             article_text = fetched_content
                         elif item.get("summary"): # Fallback to summary if fetch fails but summary exists
                             article_text = item.get("summary")
                         else: # Final fallback if all else fails
                             article_text = f"Title: {item.get('title')}. Summary: {item.get('summary', 'Not available')}. [Full content retrieval failed or was insufficient]"
                    
                    if article_text and article_text.strip():
                         selected_articles_content.append(f"News Item: {item.get('title')}\nSource: {item_link}\n\n{article_text.strip()}")
                         urls_processed_for_content.add(item_link)
                         processed_article_count += 1
                    else:
                        logger.warning(f"No usable text could be obtained for matched item: {item.get('title')}, Link: {item_link}")

            if not selected_articles_content and raw_feed_items:
                logger.warning("No articles matched topic/keyword filters, but RSS items were fetched. Consider broadening criteria.")
            
            all_processed_news_items_text.extend(selected_articles_content)

        else:
            logger.warning(f"Unknown source_type '{source_type}' or no criteria provided. Returning placeholder content.")
            return ("This is placeholder news content because the selection criteria were unclear or could not be processed. "
                    "Please check your preferences or request details.")

        if not all_processed_news_items_text:
            logger.warning("No news items could be processed or found based on the criteria.")
            return ("No news content could be found or processed based on the provided criteria. "
                    "Please try different topics, keywords, or add RSS feeds to your preferences.")

        final_content = "\n\n---\nEND OF ARTICLE\n---\n\n".join(all_processed_news_items_text)
        logger.info(f"NewsProcessingService: Returning content of length {len(final_content)} characters from {len(all_processed_news_items_text)} articles.")
        return final_content


# Example usage (for testing this service directly):
async def main_test():
    service = NewsProcessingService()
    
    # Test 1: Specific URLs
    # criteria1 = {
    #     "source_type": "specific_urls",
    #     "urls": ["https://www.theverge.com/2023/10/26/23933449/google-ai-search-generative-experience-new-features-images-summaries"]
    # }
    # content1 = await service.get_content_for_news_digest(criteria1, user_id=123)
    # print(f"--- Content for Specific URLs ---\n{content1[:1000]}...\n")

    # Test 2: RSS Feeds with keywords
    criteria2 = {
        "source_type": "user_preferences",
        "rss_urls": ["http://feeds.bbci.co.uk/news/technology/rss.xml", "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml"],
        "keywords": ["apple", "google"],
        "topics": [],
        "exclude_keywords": ["patent"],
        "exclude_source_domains": ["example-exclude.com"]
    }
    content2 = await service.get_content_for_news_digest(criteria2, user_id=123)
    print(f"--- Content for RSS (Keywords: apple, google) ---\n{content2[:2000]}...\n")

    # Test 3: Empty criteria (should hit placeholder)
    # criteria3 = {"source_type": "direct_input"} # No actual topics/keywords/rss
    # content3 = await service.get_content_for_news_digest(criteria3, user_id=123)
    # print(f"--- Content for Empty Criteria ---\n{content3}\n")

    # Test 4: No matching items
    # criteria4 = {
    #     "source_type": "user_preferences",
    #     "rss_urls": ["http://feeds.bbci.co.uk/news/technology/rss.xml"],
    #     "keywords": ["nonexistentkeywordxyz123"],
    # }
    # content4 = await service.get_content_for_news_digest(criteria4, user_id=123)
    # print(f"--- Content for No Matching Items ---\n{content4}\n")

if __name__ == "__main__":
    # To avoid RuntimeError: Event loop is closed in __main__ when using asyncio.run more than once sometimes.
    # It's better to run tests within a single async function if running multiple tests.
    async def run_all_tests():
        # print("Running Test 1: Specific URLs")
        # await main_test_specific_url() # You would define this separately
        print("\nRunning Test 2: RSS Feeds with Keywords")
        await main_test_rss_keywords() # You would define this separately
        # ... and so on for other tests

    async def main_test_rss_keywords():
        service = NewsProcessingService()
        criteria = {
            "source_type": "user_preferences",
            "rss_urls": ["http://feeds.bbci.co.uk/news/technology/rss.xml", "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml"],
            "keywords": ["ai", "israel"],
            "topics": ["artificial intelligence", "middle east"],
            "exclude_keywords": ["review", "Palestine"],
            "exclude_source_domains": []
        }
        content = await service.get_content_for_news_digest(criteria, user_id=123)
        print(f"--- Content for RSS (Keywords: ai, israel; Topic: artificial intelligence, middle east) ---\n{content[:5000]}...\nTotal length: {len(content)}")

    asyncio.run(main_test_rss_keywords()) 