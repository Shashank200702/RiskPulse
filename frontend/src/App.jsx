import { useState, useEffect, useRef } from "react";
import Landing from "./Landing";
import axios from "axios";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, AreaChart, Area, CartesianGrid
} from "recharts";
import "leaflet/dist/leaflet.css";
import "./App.css";

const API = "https://shashankmugali-riskpulse-api.hf.space";

const RISK_COLORS = { Low: "#059669", Medium: "#d97706", High: "#ea580c", Critical: "#dc2626" };
const RISK_LIGHT = { Low: "#d1fae5", Medium: "#fef3c7", High: "#ffedd5", Critical: "#fee2e2" };
const RISK_BORDER = { Low: "#6ee7b7", Medium: "#fcd34d", High: "#fdba74", Critical: "#fca5a5" };

function getRiskColor(level) { return RISK_COLORS[level] || "#059669"; }
function getRiskLight(level) { return RISK_LIGHT[level] || "#d1fae5"; }

// ── Animated number ────────────────────────────────────────────────────────
function AnimNum({ value, decimals = 0 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let start = Date.now(), dur = 1000, end = parseFloat(value);
    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setV(parseFloat((end * e).toFixed(decimals)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{v}</>;
}

// ── Arc gauge ──────────────────────────────────────────────────────────────
function ArcGauge({ score, level }) {
  const color = getRiskColor(level);
  const r = 70, circ = Math.PI * r;
  const dash = Math.min(score / 100, 1) * circ;
  return (
    <div className="arc-wrap">
      <svg viewBox="0 0 160 100" className="arc-svg">
        <defs>
          <linearGradient id={`arcGrad-${level}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <path d="M 10 90 A 70 70 0 0 1 150 90" fill="none" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round" />
        <path d="M 10 90 A 70 70 0 0 1 150 90" fill="none"
          stroke={`url(#arcGrad-${level})`} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 2px 6px ${color}66)` }} />
        <text x="80" y="78" textAnchor="middle" fill="#0f172a" fontSize="26" fontWeight="900" fontFamily="Inter,sans-serif">
          {Math.round(score)}
        </text>
        <text x="80" y="94" textAnchor="middle" fill={color} fontSize="9" fontWeight="700" fontFamily="Inter,sans-serif" letterSpacing="2">
          {level?.toUpperCase()} RISK
        </text>
      </svg>
    </div>
  );
}

// ── Risk pill ──────────────────────────────────────────────────────────────
function RiskPill({ level }) {
  return (
    <span className="risk-pill" style={{
      background: getRiskLight(level),
      color: getRiskColor(level),
      border: `1px solid ${RISK_BORDER[level]}`
    }}>
      <span className="rp-dot" style={{ background: getRiskColor(level) }} />
      {level}
    </span>
  );
}

// ── Live ticker ────────────────────────────────────────────────────────────
function LiveTicker({ events }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!events.length) return;
    const iv = setInterval(() => setIdx(i => (i + 1) % events.length), 4500);
    return () => clearInterval(iv);
  }, [events.length]);
  if (!events.length) return null;
  const e = events[idx];
  return (
    <div className="ticker">
      <div className="ticker-inner">
        <span className="ticker-live">LIVE</span>
        <span className="ticker-dot" style={{ background: getRiskColor(e.risk_level) }} />
        <span className="ticker-text">{e.title}</span>
        <RiskPill level={e.risk_level} />
        <span className="ticker-source">{e.source}</span>
      </div>
    </div>
  );
}

// ── Horizontal bar (custom modern) ─────────────────────────────────────────
function ModernHBar({ data, valueKey, labelKey, color, max }) {
  const maxVal = max || Math.max(...data.map(d => d[valueKey]));
  return (
    <div className="mhbar-list">
      {data.map((d, i) => {
        const pct = (d[valueKey] / maxVal) * 100;
        const col = d.level ? getRiskColor(d.level) : color;
        return (
          <div key={i} className="mhbar-row">
            <div className="mhbar-label" title={d[labelKey]}>{d[labelKey]}</div>
            <div className="mhbar-track">
              <div className="mhbar-fill" style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${col}cc, ${col})`,
                boxShadow: `0 0 10px ${col}44`,
                transitionDelay: `${i * 50}ms`
              }} />
              <div className="mhbar-value">{d[valueKey]}{typeof d[valueKey] === 'number' && d[valueKey] < 200 ? '' : ''}</div>
            </div>
            {d.level && <RiskPill level={d.level} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Event card ─────────────────────────────────────────────────────────────
function EventCard({ event, index }) {
  const [open, setOpen] = useState(false);
  const color = getRiskColor(event.risk_level);
  return (
    <div className="ev-card" style={{ "--ecolor": color, animationDelay: `${index * 50}ms` }}>
      <div className="ev-accent" style={{ background: `linear-gradient(180deg, ${color}20, transparent)` }} />
      <div className="ev-top">
        <div className="ev-meta">
          <RiskPill level={event.risk_level} />
          <span className="ev-score" style={{ color }}>{event.risk_score}/100</span>
          <span className="ev-type-tag">{event.risk_type}</span>
        </div>
        <span className="ev-src">{event.source}</span>
      </div>
      <h3 className="ev-title">{event.title}</h3>
      <p className="ev-summary">{event.summary}</p>
      {open && (
        <div className="ev-body">
          <div className="ev-impact">
            <span className="ev-impact-label">Business Impact</span>
            <p>{event.impact}</p>
          </div>
          <div className="ev-tags">
            {event.affected_countries?.map(c => <span key={c} className="ev-ctag">{c}</span>)}
            {event.affected_industries?.map(i => <span key={i} className="ev-itag">{i}</span>)}
          </div>
          {event.url && <a href={event.url} target="_blank" rel="noreferrer" className="ev-readmore">Read full article ↗</a>}
        </div>
      )}
      <button className="ev-toggle" onClick={() => setOpen(!open)}>
        {open ? "Show less ▲" : "Full analysis ▼"}
      </button>
    </div>
  );
}

// ── Company Analyzer ───────────────────────────────────────────────────────
function CompanyAnalyzer() {
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("Semiconductors");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const industries = ["Semiconductors","Automotive","Pharmaceuticals","Electronics","Oil & Gas","Food & Agriculture","Steel & Metals","Textiles & Apparel","Shipping & Logistics"];

  const analyze = async () => {
    if (!company.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/risk/company`, { company_name: company, industry });
      setResult(res.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const radarData = result ? Object.entries(result.country_breakdown || {}).slice(0,6).map(([k,v]) => ({
    country: k.split(" ")[0], score: v.score
  })) : [];

  const countryBarData = result ? Object.entries(result.country_breakdown || {}).map(([k,v]) => ({
    name: k, score: v.score, level: v.level
  })) : [];

  return (
    <div className="ca-wrap">
      <div className="ca-form">
        <div className="ca-input-wrap">
          <span className="ca-input-icon">🏭</span>
          <input className="ca-input"
            placeholder="Enter any company — Apple, Tesla, Samsung, Pfizer…"
            value={company} onChange={e => setCompany(e.target.value)}
            onKeyDown={e => e.key === "Enter" && analyze()} />
        </div>
        <select className="ca-select" value={industry} onChange={e => setIndustry(e.target.value)}>
          {industries.map(i => <option key={i}>{i}</option>)}
        </select>
        <button className="ca-btn" onClick={analyze} disabled={loading}>
          {loading ? <><span className="ca-spinner" />Analyzing…</> : "Analyze Risk →"}
        </button>
      </div>

      {result && (
        <div className="ca-result">
          <div className="ca-res-header">
            <div>
              <div className="ca-company">{result.company}</div>
              <div className="ca-meta">{result.industry} · {result.total_relevant_articles} active risk events</div>
            </div>
            <ArcGauge score={result.overall_risk_score} level={result.risk_level} />
          </div>

          <div className="ca-res-grid">
            <div className="ca-section">
              <div className="ca-section-title">Supplier Country Risk Breakdown</div>
              <ModernHBar data={countryBarData} valueKey="score" labelKey="name" max={100} />
            </div>
            {radarData.length > 0 && (
              <div className="ca-section">
                <div className="ca-section-title">Risk Radar View</div>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="country" tick={{ fill: "#64748b", fontSize: 11, fontFamily: "Inter" }} />
                    <Radar dataKey="score" stroke={getRiskColor(result.risk_level)}
                      fill={getRiskColor(result.risk_level)} fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {result.top_risk_events?.length > 0 && (
            <div>
              <div className="ca-section-title">Active Threats Affecting {result.company}</div>
              <div className="ca-threats">
                {result.top_risk_events.slice(0,3).map((e,i) => (
                  <div key={i} className="ca-threat" style={{ borderLeft: `3px solid ${getRiskColor(e.risk_level)}` }}>
                    <RiskPill level={e.risk_level} />
                    <span className="ca-threat-title">{e.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Custom tooltip for bar chart ───────────────────────────────────────────
const CustomBarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="custom-tooltip">
      <div className="ct-title">{d.full || d.name}</div>
      <div className="ct-score" style={{ color: getRiskColor(d.level) }}>Risk Score: {d.score}</div>
      <RiskPill level={d.level} />
    </div>
  );
};

// ── Main ───────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("landing");
  const [globalData, setGlobalData] = useState(null);
  const [countryData, setCountryData] = useState({});
  const [industryData, setIndustryData] = useState({});
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [filterLevel, setFilterLevel] = useState("All");
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [g, c, ind, ev] = await Promise.all([
        axios.get(`${API}/risk/global`),
        axios.get(`${API}/risk/countries`),
        axios.get(`${API}/risk/industries`),
        axios.get(`${API}/risk/events?limit=30`),
      ]);
      setGlobalData(g.data);
      setCountryData(c.data.countries || {});
      setIndustryData(ind.data.industries || {});
      setEvents(ev.data.events || []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await axios.get(`${API}/refresh`);
    setTimeout(async () => { await fetchAll(); setRefreshing(false); }, 30000);
  };

  const filteredEvents = filterLevel === "All" ? events : events.filter(e => e.risk_level === filterLevel);

  const industryChartData = Object.entries(industryData)
    .map(([name, data]) => ({ name: name.replace(" & ","/").split(" ").slice(0,2).join(" "), full: name, score: data.score, level: data.level }))
    .sort((a,b) => b.score - a.score);

  const topCountries = Object.entries(countryData)
    .filter(([,d]) => d.article_count > 0)
    .sort(([,a],[,b]) => b.score - a.score)
    .slice(0,5)
    .map(([name, data]) => ({ name, score: data.score, level: data.level }));

  const riskTypeData = Object.entries(globalData?.risk_type_breakdown || {})
    .map(([name, count]) => ({ name, count }))
    .sort((a,b) => b.count - a.count);

  if (page === "landing") {
    return <Landing onEnter={() => setPage("dashboard")} />;
  }

  return (
    <div className="app">

      {/* ── NAV ── */}
      <nav className="nav">
        <div className="nav-brand">
          <div className="nav-logo-wrap">
            <div className="nav-logo-ring" />
            <span className="nav-logo-icon">⬡</span>
          </div>
          <div className="nav-brand-text">
            <div className="nav-name">RiskPulse</div>
            <div className="nav-sub">Global Supply Chain Intelligence</div>
          </div>
          {globalData && (
            <div className="nav-risk-chip" style={{ background: getRiskLight(globalData.risk_level), color: getRiskColor(globalData.risk_level), borderColor: RISK_BORDER[globalData.risk_level] }}>
              <span className="nrc-pulse" style={{ background: getRiskColor(globalData.risk_level) }} />
              Global Risk {globalData.global_score} — {globalData.risk_level}
            </div>
          )}
        </div>

        <div className="nav-tabs">
          {[
            { id: "dashboard", label: "Dashboard", icon: "▦" },
            { id: "events", label: "Risk Events", icon: "◈" },
            { id: "analyzer", label: "Company Analyzer", icon: "◉" },
          ].map(p => (
            <button key={p.id} className={`nav-tab ${page === p.id ? "active" : ""}`} onClick={() => setPage(p.id)}>
              <span>{p.icon}</span>{p.label}
            </button>
          ))}
        </div>

        <div className="nav-actions">
          {lastUpdated && <span className="nav-updated">Updated {lastUpdated}</span>}
          <button className="nav-refresh-btn" onClick={handleRefresh} disabled={refreshing}>
            <span className={refreshing ? "spinning" : ""}>⟳</span>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </nav>

      {/* ── TICKER ── */}
      <LiveTicker events={events.filter(e => ["Critical","High"].includes(e.risk_level))} />

      {loading ? (
        <div className="loading-state">
          <div className="ls-spinner" />
          <div className="ls-title">Scanning global signals…</div>
          <div className="ls-sub">NewsAPI · Groq AI · Real-time</div>
        </div>
      ) : (
        <main className="content">

          {/* ── DASHBOARD ── */}
          {page === "dashboard" && (
            <div className="dashboard">

              {/* Top row — 4 metric cards */}
              <div className="metrics-row">

                {/* Global score */}
                <div className="metric-card score-card">
                  <div className="mc-eyebrow">Global Risk Score</div>
                  {globalData && <ArcGauge score={globalData.global_score} level={globalData.risk_level} />}
                  <div className="mc-sub">{globalData?.total_events} events · {globalData?.countries_monitored} countries</div>
                </div>

                {/* Severity breakdown */}
                <div className="metric-card">
                  <div className="mc-eyebrow">Event Severity</div>
                  <div className="sev-list">
                    {[
                      { l: "Critical", c: globalData?.critical_events || 0 },
                      { l: "High", c: globalData?.high_events || 0 },
                      { l: "Medium", c: globalData?.medium_events || 0 },
                      { l: "Low", c: globalData?.low_events || 0 },
                    ].map(r => (
                      <div key={r.l} className="sev-item">
                        <div className="sev-top">
                          <RiskPill level={r.l} />
                          <span className="sev-num" style={{ color: getRiskColor(r.l) }}>{r.c}</span>
                        </div>
                        <div className="sev-bar-track">
                          <div className="sev-bar-fill" style={{
                            width: `${(r.c / (globalData?.total_events || 1)) * 100}%`,
                            background: `linear-gradient(90deg, ${getRiskColor(r.l)}88, ${getRiskColor(r.l)})`,
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hottest countries */}
                <div className="metric-card">
                  <div className="mc-eyebrow">Hottest Regions</div>
                  <ModernHBar data={topCountries} valueKey="score" labelKey="name" max={100} />
                </div>

                {/* Top threat */}
                <div className="metric-card threat-card">
                  <div className="mc-eyebrow">Top Active Threat</div>
                  {globalData?.top_risk_event && (
                    <div className="threat-body">
                      <RiskPill level={globalData.top_risk_event.risk_level} />
                      <h3 className="threat-title">{globalData.top_risk_event.title}</h3>
                      <p className="threat-summary">{globalData.top_risk_event.summary}</p>
                      <div className="threat-type">{globalData.top_risk_event.risk_type}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Map */}
              <div className="section-card map-card">
                <div className="sc-header">
                  <div className="sc-title">🌍 Global Risk Heat Map</div>
                  <div className="map-legend">
                    {Object.entries(RISK_COLORS).map(([l, c]) => (
                      <div key={l} className="ml-item">
                        <div className="ml-dot" style={{ background: c }} />{l}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="map-box">
                  <MapContainer center={[20,10]} zoom={2} className="the-map" scrollWheelZoom={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; <a href="https://carto.com/">CARTO</a>' />
                    {Object.entries(countryData).map(([country, data]) => (
                      <CircleMarker key={country}
                        center={[data.lat, data.lng]}
                        radius={data.article_count > 0 ? Math.min(10 + data.score / 7, 26) : 5}
                        fillColor={getRiskColor(data.level)}
                        color={getRiskColor(data.level)}
                        weight={2} opacity={0.9} fillOpacity={0.7}
                        eventHandlers={{ click: () => setSelectedCountry({ country, ...data }) }}>
                        <Tooltip>
                          <strong>{country}</strong><br />
                          Risk: {data.score} — {data.level}<br />
                          Events: {data.article_count}
                        </Tooltip>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                </div>
                {selectedCountry && (
                  <div className="country-detail" style={{ borderColor: getRiskColor(selectedCountry.level) }}>
                    <div className="cd-top">
                      <strong>{selectedCountry.country}</strong>
                      <RiskPill level={selectedCountry.level} />
                      <button className="cd-close" onClick={() => setSelectedCountry(null)}>✕</button>
                    </div>
                    <div className="cd-stats">
                      <div className="cd-stat"><span className="cd-val" style={{ color: getRiskColor(selectedCountry.level) }}>{selectedCountry.score}</span><span className="cd-lbl">Risk Score</span></div>
                      <div className="cd-stat"><span className="cd-val">{selectedCountry.article_count}</span><span className="cd-lbl">Events</span></div>
                      <div className="cd-stat"><span className="cd-val">{selectedCountry.region}</span><span className="cd-lbl">Region</span></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom row */}
              <div className="bottom-row">
                {/* Industry risk - modern horizontal bars */}
                <div className="section-card flex2">
                  <div className="sc-header">
                    <div className="sc-title">🏭 Industry Risk Scores</div>
                    <span className="sc-badge">Sorted by risk</span>
                  </div>
                  <ModernHBar
                    data={industryChartData}
                    valueKey="score"
                    labelKey="full"
                    max={100}
                  />
                </div>

                {/* Risk type breakdown */}
                <div className="section-card flex1">
                  <div className="sc-header">
                    <div className="sc-title">Risk by Type</div>
                  </div>
                  <div className="type-list">
                    {riskTypeData.map((d, i) => (
                      <div key={i} className="type-row">
                        <span className="type-name">{d.name}</span>
                        <div className="type-bar-track">
                          <div className="type-bar-fill" style={{
                            width: `${(d.count / (globalData?.total_events || 1)) * 100}%`,
                            background: `linear-gradient(90deg, #1e3a5f88, #1e3a5f)`
                          }} />
                        </div>
                        <span className="type-count">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── EVENTS ── */}
          {page === "events" && (
            <div className="events-page">
              <div className="ep-top">
                <div>
                  <h2 className="ep-title">Live Risk Events</h2>
                  <p className="ep-sub">{filteredEvents.length} events · Refreshed {lastUpdated}</p>
                </div>
                <div className="ep-filters">
                  {["All","Critical","High","Medium","Low"].map(l => (
                    <button key={l} className={`epf-btn ${filterLevel === l ? "active" : ""}`}
                      style={filterLevel === l ? { background: getRiskColor(l==="All"?"Medium":l), color:"white", borderColor:"transparent" } : {}}
                      onClick={() => setFilterLevel(l)}>
                      {l !== "All" && <span className="epf-dot" style={{ background: filterLevel === l ? "white" : getRiskColor(l) }} />}
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ev-list">
                {filteredEvents.map((e,i) => <EventCard key={i} event={e} index={i} />)}
                {!filteredEvents.length && <div className="ev-empty">No events for this filter.</div>}
              </div>
            </div>
          )}

          {/* ── ANALYZER ── */}
          {page === "analyzer" && (
            <div className="analyzer-page">
              <h2 className="ap-title">Company Risk Analyzer</h2>
              <p className="ap-sub">Enter any company and its primary industry to get a live supply chain risk assessment based on today's global events.</p>
              <CompanyAnalyzer />
            </div>
          )}

        </main>
      )}

      <footer className="footer">
        <span className="footer-logo">⬡ RiskPulse</span>
        <span className="footer-name">Shashank Mugali</span>
      </footer>
    </div>
  );
}
