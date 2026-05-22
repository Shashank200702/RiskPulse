import { useState, useEffect } from "react";
import "./Landing.css";

const STATS = [
  { num: "19", label: "Countries Monitored" },
  { num: "9", label: "Industries Tracked" },
  { num: "Daily", label: "Data Refresh" },
  { num: "AI", label: "Powered Analysis" },
];

const THREATS = [
  { country: "🇸🇦 Saudi Arabia", level: "CRITICAL", event: "Hormuz strait tensions threatening oil supply routes" },
  { country: "🇧🇷 Brazil", level: "CRITICAL", event: "Fertilizer prices surge 44% amid Iran war" },
  { country: "🇩🇪 Germany", level: "HIGH", event: "Labor strikes disrupting automotive manufacturing" },
  { country: "🇮🇳 India", level: "HIGH", event: "Geopolitical tensions impacting semiconductor supply" },
];

const INDUSTRIES = [
  { name: "Food & Agriculture", score: 80, level: "CRITICAL" },
  { name: "Oil & Gas", score: 65, level: "HIGH" },
  { name: "Shipping & Logistics", score: 63, level: "HIGH" },
  { name: "Semiconductors", score: 44, level: "MEDIUM" },
];

const LEVEL_COLORS = {
  CRITICAL: "#dc2626",
  HIGH: "#ea580c",
  MEDIUM: "#d97706",
  LOW: "#059669",
};

function CountUp({ target, suffix = "" }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (isNaN(target)) return;
    let start = Date.now(), dur = 1500;
    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * e));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target]);
  return <>{isNaN(target) ? target : val}{suffix}</>;
}

export default function Landing({ onEnter }) {
  const [visible, setVisible] = useState(false);
  const [threatIdx, setThreatIdx] = useState(0);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
    const iv = setInterval(() => setThreatIdx(i => (i + 1) % THREATS.length), 3000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className={`landing ${visible ? "visible" : ""}`}>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-eyebrow">
            <span className="lp-live-dot" />
            Live threat monitoring · Updated daily
          </div>

          <h1 className="lp-title">
            The next supply chain<br />
            crisis is <em>already</em><br />
            happening.
          </h1>

          <p className="lp-subtitle">
            Are you watching?
          </p>

          <p className="lp-desc">
            RiskPulse monitors global news, geopolitical events, and natural
            disasters in real time — then tells you exactly which industries
            and supplier countries are under threat <strong>today</strong>.
          </p>

          <div className="lp-actions">
            <button className="lp-cta" onClick={onEnter}>
              Enter Dashboard →
            </button>
            <span className="lp-hint">No login required · Free · Live data</span>
          </div>

          {/* Live threat ticker */}
          <div className="lp-threat-box">
            <div className="lp-threat-header">
              <span className="lp-tb-live">LIVE THREATS</span>
              <span className="lp-tb-count">{THREATS.length} active now</span>
            </div>
            {THREATS.map((t, i) => (
              <div key={i} className={`lp-threat-row ${threatIdx === i ? "active" : ""}`}>
                <span className="lp-tr-country">{t.country}</span>
                <span className="lp-tr-level" style={{ color: LEVEL_COLORS[t.level] }}>{t.level}</span>
                <span className="lp-tr-event">{t.event}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="lp-hero-right">
          <div className="lp-risk-display">
            <div className="lp-rd-label">GLOBAL RISK SCORE</div>
            <div className="lp-rd-score">
              <span className="lp-rd-num">56</span>
              <span className="lp-rd-unit">/100</span>
            </div>
            <div className="lp-rd-level">HIGH RISK</div>
            <div className="lp-rd-bars">
              {INDUSTRIES.map((ind, i) => (
                <div key={i} className="lp-rd-bar-row">
                  <span className="lp-rd-bar-name">{ind.name}</span>
                  <div className="lp-rd-bar-track">
                    <div className="lp-rd-bar-fill"
                      style={{ width: `${ind.score}%`, background: LEVEL_COLORS[ind.level] }} />
                  </div>
                  <span className="lp-rd-bar-score" style={{ color: LEVEL_COLORS[ind.level] }}>{ind.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── DARK STATS BAND ── */}
      <section className="lp-stats">
        {STATS.map((s, i) => (
          <div key={i} className="lp-stat">
            <div className="lp-stat-num">
              <CountUp target={parseInt(s.num) || s.num} />
            </div>
            <div className="lp-stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── WHAT HAPPENED ── */}
      <section className="lp-story">
        <div className="lp-story-inner">
          <div className="lp-section-eyebrow">Why this matters</div>
          <h2 className="lp-section-title">
            COVID showed us how fragile<br />global supply chains really are.
          </h2>
          <div className="lp-story-grid">
            <div className="lp-story-card">
              <div className="lp-sc-icon">🏭</div>
              <div className="lp-sc-title">Apple couldn't make iPhones</div>
              <p className="lp-sc-body">A single factory shutdown in China halted production of the world's most valuable product. Nobody saw it coming.</p>
            </div>
            <div className="lp-story-card">
              <div className="lp-sc-icon">🚗</div>
              <div className="lp-sc-title">Car companies stopped making cars</div>
              <p className="lp-sc-body">A chip shortage that started in Taiwan cascaded into empty dealerships worldwide. Millions in revenue lost per day.</p>
            </div>
            <div className="lp-story-card">
              <div className="lp-sc-icon">⚓</div>
              <div className="lp-sc-title">Ports backed up for months</div>
              <p className="lp-sc-body">One ship stuck in the Suez Canal disrupted $9.6 billion worth of trade every day it was blocked.</p>
            </div>
          </div>
          <div className="lp-story-bottom">
            <div className="lp-story-quote">
              "The companies that survived were the ones monitoring risk signals before the crisis hit."
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lp-how">
        <div className="lp-how-inner">
          <div className="lp-section-eyebrow">How it works</div>
          <h2 className="lp-section-title">Three steps. Real intelligence.</h2>
          <div className="lp-how-steps">
            <div className="lp-step">
              <div className="lp-step-num">01</div>
              <div className="lp-step-title">We scan global news daily</div>
              <p className="lp-step-body">NewsAPI pulls hundreds of articles from Reuters, Bloomberg, LiveMint, and more — filtered for supply chain relevance.</p>
            </div>
            <div className="lp-step-arrow">→</div>
            <div className="lp-step">
              <div className="lp-step-num">02</div>
              <div className="lp-step-title">AI scores every threat</div>
              <p className="lp-step-body">Groq AI reads each article and assigns a risk score 0–100, identifies affected countries, industries, and the business impact.</p>
            </div>
            <div className="lp-step-arrow">→</div>
            <div className="lp-step">
              <div className="lp-step-num">03</div>
              <div className="lp-step-title">You see it on a live map</div>
              <p className="lp-step-body">Every country turns green, yellow, orange, or red. Type any company name to see exactly which of their suppliers are at risk today.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-final-cta">
        <div className="lp-fc-inner">
          <div className="lp-fc-badge">⚠ 2 Critical threats active right now</div>
          <h2 className="lp-fc-title">Don't be the last to know.</h2>
          <p className="lp-fc-sub">See exactly what's threatening global supply chains today.</p>
          <button className="lp-cta lp-cta-large" onClick={onEnter}>
            Open Risk Dashboard →
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <span className="lp-footer-brand">⬡ RiskPulse</span>
        <span>Shashank Mugali</span>
      </footer>

    </div>
  );
}
