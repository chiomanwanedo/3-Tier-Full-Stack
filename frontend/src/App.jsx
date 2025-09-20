// frontend/src/App.jsx
import React, { useEffect, useState } from "react";
import api, { getApiBase } from "./services/api";
import ClusterMap from "./components/ClusterMap"; // ← added

function AppStyles() {
  return (
    <style>{`
      :root{
        --bg:#0b0d12;        /* canvas */
        --card:#12151c;      /* surfaces */
        --muted:#9aa3b2;     /* secondary text */
        --text:#e6edf3;      /* primary text */
        --border:#1e2633;    /* subtle borders */
        --accent:#4cc38a;    /* green accent */
        --danger:#f05d5e;    /* errors */
      }
      html,body,#root{height:100%}
      body{background:var(--bg); color:var(--text); margin:0}
      .wrap{max-width:1100px; margin:0 auto; padding:32px 20px}
      header{display:flex; gap:12px; align-items:baseline; flex-wrap:wrap}
      header small{color:var(--muted)}
      code{background:rgba(255,255,255,.04); padding:.15em .4em; border-radius:6px}
      .card{background:var(--card); border:1px solid var(--border); border-radius:14px; padding:16px}
      .btn{
        appearance:none; border:1px solid var(--border); background:transparent;
        color:var(--text); padding:8px 14px; border-radius:10px; cursor:pointer;
        transition:transform .08s ease, background .2s ease, border-color .2s ease;
      }
      .btn:hover{ background:rgba(255,255,255,.03); border-color:#2a3445 }
      .btn:disabled{ opacity:.6; cursor:not-allowed }
      .section{margin-top:22px}
      .section h2{margin:0 0 12px 0; font-size:18px}
      .row{display:flex; gap:12px; align-items:center; margin-bottom:12px; flex-wrap:wrap}
      .spacer{flex:1}
      .error{color:var(--danger); font-weight:600}
      .muted{color:var(--muted)}
      pre{background:#0b0f16; border:1px solid var(--border); border-radius:12px; padding:12px; margin:0; overflow:auto}
      /* grid */
      .grid{display:grid; gap:14px; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr))}
      .cg{
        display:grid; gap:10px; border:1px solid var(--border); background:linear-gradient(180deg,#11161f, #0d131b);
        border-radius:14px; padding:14px; transition:transform .08s ease, border-color .2s ease, box-shadow .2s ease;
      }
      .cg:hover{ transform:translateY(-1px); border-color:#2a3445; box-shadow:0 6px 24px rgba(0,0,0,.25) }
      .cg__top{ display:flex; justify-content:space-between; align-items:start; gap:10px }
      .title{ font-weight:700; line-height:1.2 }
      .price{
        font-weight:700; background:rgba(76,195,138,.12); border:1px solid rgba(76,195,138,.35);
        color:var(--accent); padding:4px 8px; border-radius:999px; font-size:.92rem;
      }
      .loc{color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
      /* notes list */
      .notes li{margin:6px 0}
      /* small screens tweaks */
      @media (max-width:560px){
        .wrap{padding:24px 14px}
      }
    `}</style>
  );
}

/** Simple section wrapper */
function Section({ title, children }) {
  return (
    <section className="section card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export default function App() {
  // ping
  const [pingData, setPingData] = useState(null);
  const [pingLoading, setPingLoading] = useState(false);
  const [pingError, setPingError] = useState(null);

  // campgrounds
  const [campgrounds, setCampgrounds] = useState([]);
  const [total, setTotal] = useState(0);
  const [campsLoading, setCampsLoading] = useState(false);
  const [campsError, setCampsError] = useState(null);

  const doPing = async () => {
    setPingLoading(true);
    setPingError(null);
    try {
      const res = await api.ping();
      setPingData(res);
    } catch (e) {
      setPingData(null);
      setPingError(e?.message || String(e));
    } finally {
      setPingLoading(false);
    }
  };

  const loadCampgrounds = async () => {
    setCampsLoading(true);
    setCampsError(null);
    try {
      // server shape: { ok, count, campgrounds: [...] }
      const res = await api.campgrounds.list();
      const list = Array.isArray(res?.campgrounds) ? res.campgrounds : [];
      const count =
        typeof res?.count === "number" ? res.count : (list?.length ?? 0);

      setCampgrounds(list);
      setTotal(count);
    } catch (e) {
      setCampgrounds([]);
      setTotal(0);
      setCampsError(e?.message || String(e));
    } finally {
      setCampsLoading(false);
    }
  };

  useEffect(() => {
    doPing();
    loadCampgrounds();
  }, []);

  return (
    <div className="wrap">
      <AppStyles />

      <header>
        <h1 style={{ margin: 0 }}>YelpCamp Frontend</h1>
        <small className="muted">
          Backend via <code>/api</code> (proxied)
        </small>
      </header>

      <Section title="Backend ping">
        <div className="row">
          <button className="btn" onClick={doPing} disabled={pingLoading}>
            {pingLoading ? "Loading…" : "Retry /api/ping"}
          </button>
          <span className="muted">
            Endpoint: <code>/api/ping</code>
          </span>
          <div className="spacer" />
          <span className="muted">
            API_BASE: <code>{getApiBase()}</code>
          </span>
        </div>

        {pingError && (
          <div className="error" style={{ marginBottom: 8 }}>
            <strong>Error:</strong> {pingError}
          </div>
        )}

        {pingData ? (
          <pre>{JSON.stringify(pingData, null, 2)}</pre>
        ) : !pingLoading && !pingError ? (
          <div className="muted">No data yet.</div>
        ) : null}
      </Section>

      {/* New Map section */}
      <Section title="Map">
        {campsLoading ? (
          <div className="muted">Loading map…</div>
        ) : campgrounds.length === 0 ? (
          <div className="muted">No campgrounds to display.</div>
        ) : (
          <ClusterMap campgrounds={campgrounds} />
        )}
      </Section>

      <Section title="Campgrounds">
        <div className="row">
          <button className="btn" onClick={loadCampgrounds} disabled={campsLoading}>
            {campsLoading ? "Loading…" : "Reload /api/campgrounds"}
          </button>
          <span className="muted">
            Endpoint: <code>/api/campgrounds</code>
          </span>
          <div className="spacer" />
          <span>
            Total: <strong>{total}</strong>
          </span>
        </div>

        {campsError && (
          <div className="error" style={{ marginBottom: 8 }}>
            <strong>Error:</strong> {campsError}
          </div>
        )}

        {campgrounds.length === 0 && !campsLoading ? (
          <div className="muted">No campgrounds found.</div>
        ) : (
          <div className="grid">
            {campgrounds.map((c) => (
              <article className="cg" key={c._id}>
                <div className="cg__top">
                  <div className="title">{c.title || c.name || "Untitled Campground"}</div>
                  {typeof c.price === "number" && <span className="price">${c.price}</span>}
                </div>
                {c.location && (
                  <div className="loc" title={c.location}>
                    {c.location}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </Section>

      <Section title="Notes">
        <ul className="notes">
          <li>
            The frontend calls a <strong>relative</strong> URL (<code>/api</code>), so Vite
            (dev) or Nginx (prod) proxies it to the backend.
          </li>
          <li>
            For development (HMR), run <code>npm run dev</code> and open{" "}
            <code>http://localhost:5173</code>.
          </li>
          <li>
            For production (Docker/Nginx), open <code>http://localhost:8082</code> after
            rebuilding the frontend image.
          </li>
        </ul>
      </Section>
    </div>
  );
}
