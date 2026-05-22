import requests
import json
from datetime import datetime, timedelta
from pathlib import Path
from config import NEWS_API_KEY, RISK_QUERIES

CACHE_FILE = Path(__file__).parent / "data" / "news_cache.json"


def fetch_supply_chain_news(max_articles: int = 50) -> list[dict]:
    """Fetch latest supply chain risk news from NewsAPI."""
    all_articles = []
    seen_titles = set()

    from_date = (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d")

    for query in RISK_QUERIES[:5]:  # limit to 5 queries to save API calls
        try:
            url = "https://newsapi.org/v2/everything"
            params = {
                "q": query,
                "from": from_date,
                "sortBy": "publishedAt",
                "language": "en",
                "pageSize": 10,
                "apiKey": NEWS_API_KEY,
            }
            response = requests.get(url, params=params, timeout=10)
            data = response.json()

            if data.get("status") == "ok":
                for article in data.get("articles", []):
                    title = article.get("title", "")
                    if title and title not in seen_titles:
                        seen_titles.add(title)
                        all_articles.append({
                            "title": title,
                            "description": article.get("description", ""),
                            "content": article.get("content", ""),
                            "url": article.get("url", ""),
                            "source": article.get("source", {}).get("name", "Unknown"),
                            "published_at": article.get("publishedAt", ""),
                            "query": query,
                        })
        except Exception as e:
            print(f"Error fetching news for query '{query}': {e}")
            continue

    # Save to cache
    CACHE_FILE.parent.mkdir(exist_ok=True)
    with open(CACHE_FILE, "w") as f:
        json.dump({
            "fetched_at": datetime.now().isoformat(),
            "articles": all_articles[:max_articles]
        }, f, indent=2)

    print(f"Fetched {len(all_articles)} articles")
    return all_articles[:max_articles]


def load_cached_news() -> list[dict]:
    """Load news from cache if available and fresh (less than 2 hours old)."""
    if not CACHE_FILE.exists():
        return fetch_supply_chain_news()

    try:
        with open(CACHE_FILE) as f:
            cache = json.load(f)

        fetched_at = datetime.fromisoformat(cache["fetched_at"])
        age_hours = (datetime.now() - fetched_at).total_seconds() / 3600

        if age_hours < 2:
            print(f"Using cached news ({len(cache['articles'])} articles, {age_hours:.1f}h old)")
            return cache["articles"]
        else:
            print("Cache expired, fetching fresh news...")
            return fetch_supply_chain_news()
    except Exception:
        return fetch_supply_chain_news()


if __name__ == "__main__":
    articles = fetch_supply_chain_news()
    print(f"Total articles: {len(articles)}")
    for a in articles[:3]:
        print(f"  - {a['title'][:80]}")
