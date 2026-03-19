import React, { useEffect, useRef, useState, useCallback } from 'react';
import './index.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// ─── Neural Network Canvas ───────────────────────────────────────────────────
function NeuralCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const NODES = 80;
    const nodes = Array.from({ length: NODES }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2.5 + 1,
      pulse: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy; n.pulse += 0.02;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      });
      // connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            const alpha = (1 - dist / 140) * 0.15;
            ctx.strokeStyle = `rgba(139,92,246,${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      // nodes
      nodes.forEach(n => {
        const glow = Math.sin(n.pulse) * 0.5 + 0.5;
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 4);
        g.addColorStop(0, `rgba(167,139,250,${0.5 + glow * 0.5})`);
        g.addColorStop(1, 'rgba(167,139,250,0)');
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 4, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(196,181,253,${0.6 + glow * 0.4})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="neural-canvas" />;
}

// ─── 3D Tilt Card ────────────────────────────────────────────────────────────
function TiltCard({ children, className = '' }) {
  const cardRef = useRef(null);
  const handleMouseMove = (e) => {
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(800px) rotateY(${x * 16}deg) rotateX(${-y * 16}deg) scale3d(1.03,1.03,1.03)`;
    card.style.setProperty('--shine-x', `${(x + 0.5) * 100}%`);
    card.style.setProperty('--shine-y', `${(y + 0.5) * 100}%`);
  };
  const handleMouseLeave = () => {
    cardRef.current.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)';
  };
  return (
    <div ref={cardRef} className={`tilt-card ${className}`}
      onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      {children}
    </div>
  );
}

// ─── Pipeline Storytelling Graph ─────────────────────────────────────────────
function PipelineGraph() {
  const steps = [
    { icon: '📡', label: 'YouTube\nRSS / API', color: '#ef4444', delay: '0s' },
    { icon: '🕸️', label: 'Web\nScraper', color: '#f97316', delay: '0.3s' },
    { icon: '🧠', label: 'Llama 3\nHuggingFace', color: '#8b5cf6', delay: '0.6s' },
    { icon: '🗄️', label: 'PostgreSQL\nDatabase', color: '#06b6d4', delay: '0.9s' },
    { icon: '✉️', label: 'Email\n8 AM Daily', color: '#10b981', delay: '1.2s' },
  ];
  return (
    <div className="pipeline-section">
      <div className="section-label">⚡ AI Pipeline Architecture</div>
      <div className="pipeline-track">
        {steps.map((s, i) => (
          <div key={i} className="pipeline-step-wrapper" style={{ '--delay': s.delay }}>
            <div className="pipeline-node" style={{ '--node-color': s.color }}>
              <div className="node-ring" />
              <div className="node-icon">{s.icon}</div>
            </div>
            <div className="node-label">{s.label.split('\n').map((l, j) => <span key={j}>{l}<br /></span>)}</div>
            {i < steps.length - 1 && (
              <div className="pipeline-arrow">
                <div className="arrow-beam" style={{ '--beam-color': s.color }} />
                <svg width="28" height="12" viewBox="0 0 28 12" fill="none">
                  <path d="M0 6 L22 6 M16 1 L22 6 L16 11" stroke={s.color} strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimCounter({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0, end = Number(value) || 0;
    if (end === 0) { setDisplay(0); return; }
    const step = Math.ceil(end / 40);
    const t = setInterval(() => {
      start = Math.min(start + step, end);
      setDisplay(start);
      if (start >= end) clearInterval(t);
    }, 30);
    return () => clearInterval(t);
  }, [value]);
  return <>{display}</>;
}

// ─── Holographic Profile ──────────────────────────────────────────────────────
function HolographicProfile() {
  return (
    <div className="holo-profile">
      <div className="holo-rings">
        <div className="holo-ring ring-1" />
        <div className="holo-ring ring-2" />
        <div className="holo-ring ring-3" />
      </div>
      <div className="holo-image-wrap">
        <img src="/ahmad.jpg" alt="Ahmad Yasin" className="holo-img"
          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
        <div className="holo-fallback" style={{ display: 'none' }}>AY</div>
      </div>
      <div className="holo-orbit">
        {['🚀', '🧠', '✨', '💡', '🔬', '⚡'].map((icon, i) => (
          <div key={i} className="orbit-dot" style={{ '--angle': `${i * 60}deg`, '--delay': `${i * -1}s` }}>
            <span>{icon}</span>
          </div>
        ))}
      </div>
      <div className="holo-badge">Founder @Nexariza Ai</div>
    </div>
  );
}

// ─── Source Badge ─────────────────────────────────────────────────────────────
const SRC_CONFIG = {
  youtube: { label: 'YouTube', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: '▶' },
  openai:  { label: 'OpenAI',  color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: '⬡' },
  anthropic:{ label: 'Anthropic', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: '◈' },
};
function Badge({ type }) {
  const c = SRC_CONFIG[type] || { label: type, color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', icon: '●' };
  return <span className="src-badge" style={{ '--src-color': c.color, '--src-bg': c.bg }}>{c.icon} {c.label}</span>;
}

function formatDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch { return ''; }
}

// ─── Processing Modal (Simulated Real-time) ──────────────────────────────────
function ProcessingModal({ active }) {
  const [stage, setStage] = useState(0);
  const [logs, setLogs] = useState([]);

  const addLog = useCallback((msg) => {
    setLogs(prev => [...prev.slice(-4), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  useEffect(() => {
    if (!active) { setStage(0); setLogs([]); return; }
    
    // Simulate pipeline progression
    let t1, t2, t3, t4, t5;
    
    addLog('Initializing AI Aggregation Pipeline...');
    
    t1 = setTimeout(() => {
      setStage(1);
      addLog('Connecting to YouTube API & scraping Web Data...');
      addLog('Fetching Anthropic & OpenAI release notes...');
    }, 1500);
    
    t2 = setTimeout(() => {
      setStage(2);
      addLog('Scraping complete. Found 83 pending articles and videos.');
      addLog('Waking up HuggingFace Llama 3 Inference Engine...');
    }, 4500);
    
    t3 = setTimeout(() => {
      setStage(3);
      addLog('Processing NLP tasks: summarizing transcripts...');
      addLog('Ranking articles by semantic relevance & AI breakthrough score...');
    }, 8500);
    
    t4 = setTimeout(() => {
      setStage(4);
      addLog('Saving 10 unified digests to PostgreSQL database...');
      addLog('Compiling HTML email templates...');
    }, 13000);
    
    t5 = setTimeout(() => {
      setStage(5);
      addLog('Dispatching daily email digest to subscribers...');
      addLog('Pipeline completed successfully! ✨');
    }, 15500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [active, addLog]);

  if (!active) return null;

  const PIPELINE_NODES = [
    { icon: '📡', label: 'Scraping', color: '#f97316' },
    { icon: '🧠', label: 'Llama 3 NLP', color: '#8b5cf6' },
    { icon: '🗄️', label: 'Database', color: '#06b6d4' },
    { icon: '✉️', label: 'Delivery', color: '#10b981' }
  ];

  return (
    <div className="processing-modal">
      <h2 className="processing-title">AI Pipeline Executing</h2>
      
      <div className="processing-track">
        {PIPELINE_NODES.map((node, i) => {
          const stepNum = i + 1;
          const isActive = stage === stepNum;
          const isDone = stage > stepNum;
          const statusClass = isActive ? 'active' : isDone ? 'done' : '';
          
          return (
            <React.Fragment key={i}>
              <div className={`proc-node-wrap ${statusClass}`} style={{ '--n-color': node.color }}>
                <div className="proc-node">
                  {isDone ? '✓' : isActive ? '⚡' : node.icon}
                  <div className="proc-node-ring" />
                </div>
                <div className="proc-status">
                  {isDone ? 'Complete' : isActive ? 'Processing...' : 'Waiting'}
                  <br/>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{node.label}</span>
                </div>
              </div>
              {i < PIPELINE_NODES.length - 1 && (
                <div className="proc-connector">
                  <div className="proc-connector-fill" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="processing-log">
        <div className="log-lines">
          {logs.map((log, i) => (
            <div key={i} className="log-line">{log}</div>
          ))}
          {stage < 5 && <div className="log-line" style={{ opacity: 0.5 }}>_</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
const SOURCES = ['all', 'youtube', 'openai', 'anthropic'];

export default function App() {
  const [stats, setStats] = useState(null);
  const [digests, setDigests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('all');
  const [includeSent, setIncludeSent] = useState(false);

  const showToast = (text, type = '') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, dr] = await Promise.all([
        fetch(`${API_BASE}/stats`),
        fetch(`${API_BASE}/digests?limit=50&include_sent=${includeSent}`),
      ]);
      if (sr.ok) { const s = await sr.json(); setStats(s.counts); }
      if (dr.ok) { setDigests(await dr.json()); }
    } catch (e) {
      showToast(`Connection error: ${e.message}`, 'error');
    } finally { setLoading(false); }
  }, [includeSent]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function runPipeline() {
    setRunning(true);
    try {
      const resp = await fetch(`${API_BASE}/run-pipeline`, { method: 'POST' });
      const data = await resp.json();
      if (!resp.ok) {
        showToast(`Pipeline failed: ${data.detail || 'Unknown error'}`, 'error');
      } else {
        const scraped = data.scraping ? Object.values(data.scraping).reduce((a,b) => a+b, 0) : 0;
        const emailStatus = data.email?.skipped ? 'Skipped (no new)' : data.email?.success ? 'Sent ✉️' : 'Failed';
        showToast(`✅ Done! Scraped ${scraped} articles. Email: ${emailStatus}`, 'success');
        await fetchData();
      }
    } catch (e) { showToast(`Error: ${e.message}`, 'error'); }
    finally { 
      // Add a slight delay before closing modal to let user see completion state
      setTimeout(() => setRunning(false), 1500); 
    }
  }

  const filtered = filter === 'all' ? digests : digests.filter(d => d.article_type === filter);

  const STAT_META = [
    { key: 'youtube_videos',   icon: '▶', label: 'YouTube', color: '#ef4444' },
    { key: 'openai_articles',  icon: '⬡', label: 'OpenAI',  color: '#10b981' },
    { key: 'anthropic_articles',icon: '◈', label: 'Anthropic', color: '#f59e0b' },
    { key: 'digests',          icon: '📋', label: 'Digests', color: '#8b5cf6' },
    { key: 'digests_sent',     icon: '✉', label: 'Emails Sent', color: '#06b6d4' },
  ];

  return (
    <>
      <NeuralCanvas />
      <ProcessingModal active={running} />
      
      <div className="app-wrap">

        {/* ── Toast ─────────────────────────── */}
        {toast && <div className={`toast ${toast.type}`}>{toast.text}</div>}

        {/* ── HERO ──────────────────────────── */}
        <header className="hero">
          <HolographicProfile />
          <div className="hero-text">
            <div className="hero-eyebrow">
              <span className="eyebrow-dot" />&nbsp;Top 1% AI Engineer &nbsp;·&nbsp; Generative AI Assignment 1
            </div>
            <h1 className="hero-title">
              <span className="gradient-text">AI News</span>
              <span className="gradient-text-2"> Aggregator</span>
            </h1>
            <p className="hero-sub">
              Real-time AI news from YouTube, OpenAI &amp; Anthropic — summarized by <strong>Llama 3</strong>,
              ranked by relevance, and delivered to your inbox every morning at <strong>8:00 AM</strong>.
            </p>
            <div className="hero-actions">
              <button className="btn-run" onClick={runPipeline} disabled={running}>
                <span className="btn-glow" />
                {running ? <><span className="spin">⟳</span> Executing...</> : <>▶ Run Pipeline &amp; Send Email</>}
              </button>
              <button className="btn-ghost" onClick={fetchData}>🔄 Refresh</button>
              <button className="btn-ghost" onClick={() => setIncludeSent(v => !v)}>
                {includeSent ? '🙈 Hide Sent' : '📬 Show All'}
              </button>
            </div>
            <div className="hero-name">Ahmad Yasin &nbsp;·&nbsp; Founder @Nexariza Ai</div>
          </div>
        </header>

        {/* ── PIPELINE STORY ────────────────── */}
        <PipelineGraph />

        {/* ── STATS ─────────────────────────── */}
        {stats && (
          <div className="stats-row">
            {STAT_META.map(({ key, icon, label, color }) => (
              <TiltCard key={key} className="stat-tile">
                <div className="stat-icon" style={{ color }}>{icon}</div>
                <div className="stat-num" style={{ color }}><AnimCounter value={stats[key] ?? 0} /></div>
                <div className="stat-lbl">{label}</div>
                <div className="stat-glow" style={{ background: color }} />
              </TiltCard>
            ))}
          </div>
        )}

        {/* ── DIGEST SECTION ────────────────── */}
        <section className="digest-section">
          <div className="digest-header-row">
            <div className="section-label">📰 Latest AI Digests</div>
            <div className="filter-pills">
              {SOURCES.map(s => (
                <button key={s} className={`filter-pill ${filter === s ? 'active' : ''}`}
                  onClick={() => setFilter(s)}
                  style={filter === s ? { '--pill-color': SRC_CONFIG[s]?.color || '#8b5cf6' } : {}}>
                  {s === 'all' ? '🌐 All' : `${SRC_CONFIG[s]?.icon} ${SRC_CONFIG[s]?.label}`}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="loader-wrap">
              {[0,1,2].map(i => <div key={i} className="loader-orb" style={{ '--i': i }} />)}
              <span className="loader-text">Fetching AI insights...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🛸</div>
              <p>No digests yet. Smash "Run Pipeline" to summon the AI!</p>
            </div>
          ) : (
            <div className="card-grid">
              {filtered.map(item => (
                <TiltCard key={item.id} className="news-card">
                  <div className="card-top-bar" style={{ '--bar-color': SRC_CONFIG[item.article_type]?.color || '#8b5cf6' }} />
                  <div className="card-meta-row">
                    <Badge type={item.article_type} />
                    <span className="card-date">{formatDate(item.created_at)}</span>
                  </div>
                  <h3 className="card-title">{item.title}</h3>
                  <p className="card-summary">{item.summary || 'AI summary will appear after next pipeline run.'}</p>
                  <div className="card-footer">
                    <a href={item.url} target="_blank" rel="noreferrer" className="read-btn">
                      Read Article <span className="arrow-anim">→</span>
                    </a>
                    {item.sent_at && <div className="sent-chip">✉ Sent</div>}
                  </div>
                  <div className="card-shine" />
                </TiltCard>
              ))}
            </div>
          )}
        </section>

        {/* ── FOOTER ────────────────────────── */}
        <footer className="footer">
          <div className="footer-logo">⚡ AI News Aggregator</div>
          <div className="footer-brand">Built by <strong>Ahmad Yasin</strong> · Founder @Nexariza Ai</div>
          <div className="footer-tech">React · FastAPI · PostgreSQL · Llama 3 · HuggingFace · Docker · APScheduler</div>
        </footer>
      </div>
    </>
  );
}
