import json, re, hashlib
from groq import Groq
from config import GROQ_API_KEY, COUNTRY_REGIONS, INDUSTRY_SUPPLIERS

client = Groq(api_key=GROQ_API_KEY)


def analyze_article_risk(article: dict) -> dict:
    text = f"Title: {article.get('title', '')}\nDescription: {article.get('description', '')}"
    prompt = f"""You are a supply chain risk analyst. Analyze this news article and return a JSON response.

Article:
{text}

Return ONLY a valid JSON object with these exact fields:
{{
  "risk_score": <integer 0-100>,
  "risk_level": "<Low|Medium|High|Critical>",
  "affected_countries": [<list of country names from: China, Taiwan, South Korea, Japan, India, Vietnam, Malaysia, Thailand, United States, Mexico, Canada, Germany, Netherlands, United Kingdom, France, Brazil, Australia, Saudi Arabia, UAE>],
  "affected_industries": [<list from: Semiconductors, Automotive, Pharmaceuticals, Electronics, Oil & Gas, Food & Agriculture, Steel & Metals, Textiles & Apparel, Shipping & Logistics>],
  "risk_type": "<Natural Disaster|Geopolitical|Labor Strike|Trade Policy|Logistics|Shortage|Pandemic|Other>",
  "summary": "<one sentence summary of the risk>",
  "impact": "<one sentence on business impact>"
}}

Risk score guide: 0-25=Low, 26-50=Medium, 51-75=High, 76-100=Critical
If not supply chain related, return risk_score of 0."""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1, max_tokens=400,
        )
        content = response.choices[0].message.content.strip()
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

    return {
        "risk_score": 0, "risk_level": "Low", "affected_countries": [],
        "affected_industries": [], "risk_type": "Other",
        "summary": article.get("title", ""), "impact": "Unable to analyze",
        "title": article.get("title", ""), "url": article.get("url", ""),
        "source": article.get("source", ""), "published_at": article.get("published_at", ""),
    }


def analyze_batch(articles: list, max_articles: int = 20) -> list:
    results = []
    for i, article in enumerate(articles[:max_articles]):
        print(f"Analyzing article {i+1}/{min(len(articles), max_articles)}: {article['title'][:50]}...")
        result = analyze_article_risk(article)
        if result["risk_score"] > 0:
            results.append(result)
    results.sort(key=lambda x: x["risk_score"], reverse=True)
    return results


def calculate_country_risk_scores(analyzed_articles: list) -> dict:
    country_scores = {c: [] for c in COUNTRY_REGIONS.keys()}
    for article in analyzed_articles:
        for country in article.get("affected_countries", []):
            if country in country_scores:
                country_scores[country].append(article["risk_score"])

    country_risk = {}
    for country, scores in country_scores.items():
        if scores:
            avg = sum(scores) / len(scores)
            mx = max(scores)
            final = (avg * 0.4) + (mx * 0.6)
        else:
            final = 5
        country_risk[country] = {
            "score": round(final, 1), "level": get_risk_level(final),
            "article_count": len(scores),
            "lat": COUNTRY_REGIONS[country]["lat"],
            "lng": COUNTRY_REGIONS[country]["lng"],
            "region": COUNTRY_REGIONS[country]["region"],
        }
    return country_risk


def calculate_industry_risk_scores(analyzed_articles: list) -> dict:
    industry_scores = {ind: [] for ind in INDUSTRY_SUPPLIERS.keys()}
    for article in analyzed_articles:
        for industry in article.get("affected_industries", []):
            if industry in industry_scores:
                industry_scores[industry].append(article["risk_score"])

    industry_risk = {}
    for industry, scores in industry_scores.items():
        avg = sum(scores) / len(scores) if scores else 5
        industry_risk[industry] = {
            "score": round(avg, 1), "level": get_risk_level(avg),
            "article_count": len(scores),
            "key_suppliers": INDUSTRY_SUPPLIERS[industry],
        }
    return industry_risk


def get_risk_level(score: float) -> str:
    if score >= 76: return "Critical"
    if score >= 51: return "High"
    if score >= 26: return "Medium"
    return "Low"


def analyze_company_risk(company_name: str, industry: str, analyzed_articles: list) -> dict:
    """Analyze risk for a specific company with company-specific score variation."""
    supplier_countries = INDUSTRY_SUPPLIERS.get(industry, [])

    # Find relevant articles
    relevant = []
    for article in analyzed_articles:
        country_match = any(c in article.get("affected_countries", []) for c in supplier_countries)
        industry_match = industry in article.get("affected_industries", [])
        if country_match or industry_match:
            relevant.append(article)

    # Company-specific seed for score variation (different company = different score)
    seed = int(hashlib.md5(company_name.lower().encode()).hexdigest()[:8], 16) % 100

    if not relevant:
        overall_score = 10 + (seed % 15)
        risk_level = get_risk_level(overall_score)
        top_risks = []
    else:
        scores = [a["risk_score"] for a in relevant]
        base_score = sum(scores) / len(scores)
        # Add ±12 point company-specific variation
        variation = (seed % 25) - 12
        overall_score = round(max(5, min(95, base_score + variation)), 1)
        risk_level = get_risk_level(overall_score)
        top_risks = relevant[:5]

    # Country breakdown with company+country specific variation
    country_breakdown = {}
    for country in supplier_countries:
        country_articles = [a for a in relevant if country in a.get("affected_countries", [])]
        country_seed = int(hashlib.md5(f"{company_name.lower()}{country}".encode()).hexdigest()[:8], 16) % 100
        country_variation = (country_seed % 21) - 10  # -10 to +10

        if country_articles:
            base = sum(a["risk_score"] for a in country_articles) / len(country_articles)
            score = round(max(5, min(95, base + country_variation)), 1)
        else:
            score = round(max(5, min(30, 5 + (country_seed % 20))), 1)

        country_breakdown[country] = {
            "score": score,
            "level": get_risk_level(score),
            "article_count": len(country_articles),
        }

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
