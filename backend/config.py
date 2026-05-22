import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env from project root
load_dotenv(Path(__file__).parent.parent / ".env")

NEWS_API_KEY = os.getenv("NEWS_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Supply chain related search queries
RISK_QUERIES = [
    "supply chain disruption",
    "factory shutdown manufacturing",
    "port strike logistics",
    "semiconductor shortage chips",
    "trade war tariffs sanctions",
    "natural disaster flood earthquake factory",
    "shipping delay freight",
    "raw material shortage",
    "energy crisis manufacturing",
    "geopolitical risk trade",
]

# Major supply chain countries and their regions
COUNTRY_REGIONS = {
    "China": {"lat": 35.86, "lng": 104.19, "region": "Asia Pacific"},
    "Taiwan": {"lat": 23.69, "lng": 120.96, "region": "Asia Pacific"},
    "South Korea": {"lat": 35.90, "lng": 127.76, "region": "Asia Pacific"},
    "Japan": {"lat": 36.20, "lng": 138.25, "region": "Asia Pacific"},
    "India": {"lat": 20.59, "lng": 78.96, "region": "Asia Pacific"},
    "Vietnam": {"lat": 14.05, "lng": 108.27, "region": "Asia Pacific"},
    "Malaysia": {"lat": 4.21, "lng": 101.97, "region": "Asia Pacific"},
    "Thailand": {"lat": 15.87, "lng": 100.99, "region": "Asia Pacific"},
    "United States": {"lat": 37.09, "lng": -95.71, "region": "North America"},
    "Mexico": {"lat": 23.63, "lng": -102.55, "region": "North America"},
    "Canada": {"lat": 56.13, "lng": -106.34, "region": "North America"},
    "Germany": {"lat": 51.16, "lng": 10.45, "region": "Europe"},
    "Netherlands": {"lat": 52.13, "lng": 5.29, "region": "Europe"},
    "United Kingdom": {"lat": 55.37, "lng": -3.43, "region": "Europe"},
    "France": {"lat": 46.22, "lng": 2.21, "region": "Europe"},
    "Brazil": {"lat": -14.23, "lng": -51.92, "region": "South America"},
    "Australia": {"lat": -25.27, "lng": 133.77, "region": "Oceania"},
    "Saudi Arabia": {"lat": 23.88, "lng": 45.07, "region": "Middle East"},
    "UAE": {"lat": 23.42, "lng": 53.84, "region": "Middle East"},
}

# Industry to supplier country mapping
INDUSTRY_SUPPLIERS = {
    "Semiconductors": ["Taiwan", "South Korea", "China", "Japan", "United States"],
    "Automotive": ["Germany", "Japan", "South Korea", "China", "Mexico"],
    "Pharmaceuticals": ["India", "China", "United States", "Germany"],
    "Electronics": ["China", "Taiwan", "South Korea", "Vietnam", "Malaysia"],
    "Oil & Gas": ["Saudi Arabia", "UAE", "United States", "Canada"],
    "Food & Agriculture": ["Brazil", "United States", "China", "India", "Australia"],
    "Steel & Metals": ["China", "India", "Japan", "South Korea", "Germany"],
    "Textiles & Apparel": ["China", "Vietnam", "Bangladesh", "India", "Thailand"],
    "Shipping & Logistics": ["Netherlands", "United States", "China", "Singapore"],
}
