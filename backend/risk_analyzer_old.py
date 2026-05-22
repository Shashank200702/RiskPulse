import json
import re
from groq import Groq
from config import GROQ_API_KEY, COUNTRY_REGIONS, INDUSTRY_SUPPLIERS

client = Groq(api_key=GROQ_API_KEY)


def analyze_article_risk(article: dict) -> dict:
    """Use Groq AI to analyze a news article for supply chain risk."""

    text = f"""
Title: {article.get('title', '')}
Description: {article.get('description', '')}
"""

    prompt = f"""You are a supply chain risk analyst. Analyze this news article and return a JSON response.

Article:
{text}

Return ONLY a valid JSON object with these exact fields:
{{
  "risk_score": <integer 0-100>,
  "risk_level": "<Low|Medium|High|Critical>",
  "affected_countries": [<list of country names from this list only: China, Taiwan, South Korea, Japan, India, Vietnam, Malaysia, Thailand, United States, Mexico, Canada, Germany, Netherlands, United Kingdom, France, Brazil, Australia, Saudi Arabia, UAE>],
  "affected_industries": [<list from: Semiconductors, Automotive, Pharmaceuticals, Electronics, Oil & Gas, Food & Agriculture, Steel & Metals, Textiles & Apparel, Shipping & Logistics>],
  "risk_type": "<Natural Disaster|Geopolitical|Labor Strike|Trade Policy|Logistics|Shortage|Pandemic|Other>",
  "summary": "<one sentence summary of the risk>",
  "impact": "<one sentence on business impact>"
}}

Risk score guide: 0-25=Low, 26-50=Medium, 51-75=High, 76-100=Critical
If the article is not supply chain related, return risk_score of 0."""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=400,
        )

        content = response.choices[0].message.content.strip()

        # Extract JSON from response
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            result["title"] = article.get("title", "")
            result["url"] = article.get("url", "")
            result["source"] = article.get("source", "")
            result["published_at"] = article.get("published_at", "")
            return result

    except Exception as e:
        print(f"Error analyzing article: {e}")

    # Fallback
    return {
        "risk_score": 0,
        "risk_level": "Low",
        "affected_countries": [],
        "affected_industries": [],
        "risk_type": "Other",
        "summary": article.get("title", ""),
        "impact": "Unable to analyze",
        "title": article.get("title", ""),
        "url": article.get("url", ""),
        "source": article.get("source", ""),
        "published_at": article.get("published_at", ""),
    }


def analyze_batch(articles: list[dict], max_articles: int = 20) -> list[dict]:
    """Analyze a batch of articles for risk."""
    results = []
    for i, article in enumerate(articles[:max_articles]):
        print(f"Analyzing article {i+1}/{min(len(articles), max_articles)}: {article['title'][:50]}...")
        result = analyze_article_risk(article)
        if result["risk_score"] > 0:
            results.append(result)

    # Sort by risk score descending
    results.sort(key=lambda x: x["risk_score"], reverse=True)
    return results


def calculate_country_risk_scores(analyzed_articles: list[dict]) -> dict:
    """Calculate overall risk score per country based on analyzed articles."""
    country_scores = {country: [] for country in COUNTRY_REGIONS.keys()}

    for article in analyzed_articles:
        for country in article.get("affected_countries", []):
            if country in country_scores:
                country_scores[country].append(article["risk_score"])

    # Calculate average score and risk level per country
    country_risk = {}
    for country, scores in country_scores.items():
        if scores:
            avg_score = sum(scores) / len(scores)
            max_score = max(scores)
            final_score = (avg_score * 0.4) + (max_score * 0.6)  # weight toward max
        else:
            final_score = 5  # baseline low risk

        country_risk[country] = {
            "score": round(final_score, 1),
            "level": get_risk_level(final_score),
            "article_count": len(scores),
            "lat": COUNTRY_REGIONS[country]["lat"],
            "lng": COUNTRY_REGIONS[country]["lng"],
            "region": COUNTRY_REGIONS[country]["region"],
        }

    return country_risk


def calculate_industry_risk_scores(analyzed_articles: list[dict]) -> dict:
    """Calculate risk score per industry."""
    industry_scores = {ind: [] for ind in INDUSTRY_SUPPLIERS.keys()}

    for article in analyzed_articles:
        for industry in article.get("affected_industries", []):
            if industry in industry_scores:
                industry_scores[industry].append(article["risk_score"])

    industry_risk = {}
    for industry, scores in industry_scores.items():
        if scores:
            avg = sum(scores) / len(scores)
        else:
            avg = 5
        industry_risk[industry] = {
            "score": round(avg, 1),
            "level": get_risk_level(avg),
            "article_count": len(scores),
            "key_suppliers": INDUSTRY_SUPPLIERS[industry],
        }

    return industry_risk


def get_risk_level(score: float) -> str:
    if score >= 76: return "Critical"
    if score >= 51: return "High"
    if score >= 26: return "Medium"
    return "Low"


def analyze_company_risk(company_name: str, industry: str, analyzed_articles: list[dict]) -> dict:
    """Analyze risk for a specific company based on their industry."""

    supplier_countries = INDUSTRY_SUPPLIERS.get(industry, [])

    # Find relevant articles
    relevant = []
    for article in analyzed_articles:
        country_match = any(c in article.get("affected_countries", []) for c in supplier_countries)
        industry_match = industry in article.get("affected_industries", [])
        if country_match or industry_match:
            relevant.append(article)

    if not relevant:
        overall_score = 10
        risk_level = "Low"
        top_risks = []
    else:
        scores = [a["risk_score"] for a in relevant]
        overall_score = round(sum(scores) / len(scores), 1)
        risk_level = get_risk_level(overall_score)
        top_risks = relevant[:5]

    # Country breakdown
    country_breakdown = {}
    for country in supplier_countries:
        country_articles = [a for a in relevant if country in a.get("affected_countries", [])]
        if country_articles:
            score = sum(a["risk_score"] for a in country_articles) / len(country_articles)
            country_breakdown[country] = {
                "score": round(score, 1),
                "level": get_risk_level(score),
                "article_count": len(country_articles),
            }
        else:
            country_breakdown[country] = {"score": 5, "level": "Low", "article_count": 0}

    return {
        "company": company_name,
        "industry": industry,
        "overall_risk_score": overall_score,
        "risk_level": risk_level,
        "supplier_countries": supplier_countries,
        "country_breakdown": country_breakdown,
        "top_risk_events": top_risks,
        "total_relevant_articles": len(relevant),
    }
