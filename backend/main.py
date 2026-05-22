"""
Supply Chain Risk Radar — FastAPI Backend
Real-time supply chain risk monitoring using NewsAPI + Groq AI
"""

from __future__ import annotations
import json
import time
from pathlib import Path
from typing import Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from news_fetcher import load_cached_news, fetch_supply_chain_news
from risk_analyzer import (
    analyze_batch,
    calculate_country_risk_scores,
    calculate_industry_risk_scores,
    analyze_company_risk,
    get_risk_level,
)
from config import COUNTRY_REGIONS, INDUSTRY_SUPPLIERS

# ── Cache ──────────────────────────────────────────────────────────────────
ANALYSIS_CACHE_FILE = Path(__file__).parent / "data" / "analysis_cache.json"
_cache = {"analyzed_articles": [], "country_risk": {}, "industry_risk": {}, "last_updated": None}


def load_analysis_cache():
    global _cache
    if ANALYSIS_CACHE_FILE.exists():
        try:
            with open(ANALYSIS_CACHE_FILE) as f:
                _cache = json.load(f)
            print(f"Loaded analysis cache: {len(_cache['analyzed_articles'])} articles")
        except Exception as e:
            print(f"Cache load error: {e}")


def save_analysis_cache():
    ANALYSIS_CACHE_FILE.parent.mkdir(exist_ok=True)
    with open(ANALYSIS_CACHE_FILE, "w") as f:
        json.dump(_cache, f, indent=2)


def refresh_data():
    """Fetch fresh news and analyze it."""
    global _cache
    print("Refreshing supply chain risk data...")
    articles = fetch_supply_chain_news()
    analyzed = analyze_batch(articles, max_articles=20)
    country_risk = calculate_country_risk_scores(analyzed)
    industry_risk = calculate_industry_risk_scores(analyzed)
    _cache = {
        "analyzed_articles": analyzed,
        "country_risk": country_risk,
        "industry_risk": industry_risk,
        "last_updated": datetime.now().isoformat(),
    }
    save_analysis_cache()
    print(f"Refresh complete: {len(analyzed)} risk events analyzed")


# Load cache on startup
load_analysis_cache()
if not _cache["analyzed_articles"]:
    print("No cache found, running initial data fetch...")
    refresh_data()

# ── App ────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Supply Chain Risk Radar API",
    description="Real-time global supply chain risk monitoring powered by AI",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Schemas ────────────────────────────────────────────────────────────────
class CompanyRiskRequest(BaseModel):
    company_name: str
    industry: str


# ── Routes ────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "message": "Supply Chain Risk Radar API is running.",
        "docs": "/docs",
        "endpoints": ["/health", "/risk/global", "/risk/countries", "/risk/industries", "/risk/company", "/risk/events", "/refresh"],
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "last_updated": _cache.get("last_updated"),
        "total_risk_events": len(_cache.get("analyzed_articles", [])),
        "countries_monitored": len(COUNTRY_REGIONS),
        "industries_monitored": len(INDUSTRY_SUPPLIERS),
    }


@app.get("/risk/global")
def global_risk():
    """Get overall global supply chain risk summary."""
    articles = _cache.get("analyzed_articles", [])
    if not articles:
        return {"global_score": 0, "risk_level": "Low", "total_events": 0}

    scores = [a["risk_score"] for a in articles]
    global_score = round(sum(scores) / len(scores), 1)

    risk_type_counts = {}
    for a in articles:
        rt = a.get("risk_type", "Other")
        risk_type_counts[rt] = risk_type_counts.get(rt, 0) + 1

    return {
        "global_score": global_score,
        "risk_level": get_risk_level(global_score),
        "total_events": len(articles),
        "critical_events": len([a for a in articles if a["risk_score"] >= 76]),
        "high_events": len([a for a in articles if 51 <= a["risk_score"] < 76]),
        "medium_events": len([a for a in articles if 26 <= a["risk_score"] < 51]),
        "low_events": len([a for a in articles if a["risk_score"] < 26]),
        "risk_type_breakdown": risk_type_counts,
        "last_updated": _cache.get("last_updated"),
        "top_risk_event": articles[0] if articles else None,
    }


@app.get("/risk/countries")
def country_risk():
    """Get risk scores for all monitored countries."""
    return {
        "countries": _cache.get("country_risk", {}),
        "last_updated": _cache.get("last_updated"),
    }


@app.get("/risk/industries")
def industry_risk():
    """Get risk scores for all monitored industries."""
    return {
        "industries": _cache.get("industry_risk", {}),
        "last_updated": _cache.get("last_updated"),
    }


@app.get("/risk/events")
def risk_events(limit: int = 20, min_score: int = 0, risk_type: Optional[str] = None):
    """Get latest risk events with optional filters."""
    articles = _cache.get("analyzed_articles", [])

    if min_score > 0:
        articles = [a for a in articles if a["risk_score"] >= min_score]

    if risk_type:
        articles = [a for a in articles if a.get("risk_type") == risk_type]

    return {
        "events": articles[:limit],
        "total": len(articles),
        "last_updated": _cache.get("last_updated"),
    }


@app.post("/risk/company")
def company_risk(req: CompanyRiskRequest):
    """Analyze supply chain risk for a specific company."""
    if req.industry not in INDUSTRY_SUPPLIERS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown industry. Choose from: {list(INDUSTRY_SUPPLIERS.keys())}"
        )

    articles = _cache.get("analyzed_articles", [])
    result = analyze_company_risk(req.company_name, req.industry, articles)
    return result


@app.get("/refresh")
def trigger_refresh(background_tasks: BackgroundTasks):
    """Trigger a manual data refresh."""
    background_tasks.add_task(refresh_data)
    return {"message": "Data refresh started in background. Check /health for status."}


@app.get("/industries/list")
def list_industries():
    return {"industries": list(INDUSTRY_SUPPLIERS.keys())}
