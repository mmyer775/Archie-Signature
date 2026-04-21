// ============================================================
// MetricsCard — Activation & Churn metrics
// Used on RepHome, APlayerHome, ManagerHome
// ============================================================

import { useState, useEffect } from 'react';
import { fetchMetrics }        from '../api/sheets';

// App color palette
const C_GREEN  = '#A0C4B8';  // good
const C_YELLOW = '#E8C87A';  // caution
const C_ORANGE = '#E8A0B0';  // warning (app's warm salmon)
const C_RED    = '#C4748A';  // bad
const C_PURPLE = '#B8A0D4';  // neutral/mid

function pctColor(rate, type) {
  if (type === 'act') {
    // Activation: higher = better
    return rate >= 80 ? C_GREEN : rate >= 60 ? C_PURPLE : C_RED;
  }
  if (type === 'churn') {
    // Churn: lower = better
    // 0–2.5%   green
    // 2.6–3.5% yellow
    // 3.6–4.5% orange
    // 4.6+%    red
    if (rate <= 2.5) return C_GREEN;
    if (rate <= 3.5) return C_YELLOW;
    if (rate <= 4.5) return C_ORANGE;
    return C_RED;
  }
  return C_PURPLE;
}

// Format a percentage to 1 decimal place (e.g. 4.2%)
function fmtPct(rate) {
  const n = Number(rate) || 0;
  return `${n.toFixed(1)}%`;
}

// Churn progress bar is scaled to a 10% ceiling instead of 100%
// so small numbers are still visually meaningful.
const CHURN_BAR_MAX = 10;
function churnBarPct(rate) {
  const n = Number(rate) || 0;
  return Math.min((n / CHURN_BAR_MAX) * 100, 100);
}

function StatBox({ label, value, sub, color }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '12px 8px', background: 'var(--bg-raised)', borderRadius: 10, border: `1px solid ${color}30` }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>
      )}
    </div>
  );
}

// Single card — pass in the metrics object directly
export function MetricsCard({ metrics, label }) {
  if (!metrics) return null;

  const actColor   = pctColor(metrics.actRate,   'act');
  const churnColor = pctColor(metrics.churnRate, 'churn');

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 14px 12px', marginBottom: 12 }}>
      {label && (
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
          {label}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <StatBox
          label="Act Rate"
          value={fmtPct(metrics.actRate)}
          sub={`${metrics.actCount} / ${metrics.lineTotal} lines`}
          color={actColor}
        />
        <StatBox
          label="Churn Rate"
          value={fmtPct(metrics.churnRate)}
          sub={`${metrics.churnCount} churned`}
          color={churnColor}
        />
        <StatBox
          label="Active Lines"
          value={metrics.activeLines}
          sub={null}
          color="#7B8FCE"
        />
      </div>

      {/* Mini status bars */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <div style={{ flex: 1, height: 4, background: 'var(--bg-overlay)', borderRadius: 100, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(metrics.actRate, 100)}%`, background: actColor, borderRadius: 100, transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ flex: 1, height: 4, background: 'var(--bg-overlay)', borderRadius: 100, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${churnBarPct(metrics.churnRate)}%`, background: churnColor, borderRadius: 100, transition: 'width 0.5s ease' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <div style={{ flex: 1, fontSize: 10, color: 'var(--text-muted)' }}>activation</div>
        <div style={{ flex: 1, fontSize: 10, color: 'var(--text-muted)' }}>churn <span style={{ opacity: 0.6 }}>(scale: 10%)</span></div>
      </div>
    </div>
  );
}

// Hook — fetches metrics and returns { office, reps, myMetrics, teamMetrics, loading, error }
export function useMetrics(user, teamRepNames = null) {
  const [office,    setOffice]    = useState(null);
  const [reps,      setReps]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    async function load() {
      if (!user?.email) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await fetchMetrics(user.email);
        setOffice(data.office);
        setReps(data.reps);
      } catch (err) {
        console.warn('Metrics load error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.email]);

  // Rep's own row
  const myMetrics = reps.find(r =>
    r.repName.toLowerCase() === (user?.name || '').toLowerCase()
  ) || null;

  // Team cumulative (a_player — sum their reps)
  const teamReps = teamRepNames
    ? reps.filter(r => teamRepNames.map(n => n.toLowerCase()).includes(r.repName.toLowerCase()))
    : [];

  let teamMetrics = null;
  if (teamReps.length > 0) {
    const actCount    = teamReps.reduce((s, r) => s + r.actCount,    0);
    const lineTotal   = teamReps.reduce((s, r) => s + r.lineTotal,   0);
    const churnCount  = teamReps.reduce((s, r) => s + r.churnCount,  0);
    const activeLines = teamReps.reduce((s, r) => s + r.activeLines, 0);

    // Keep 1-decimal precision (don't round to whole numbers here)
    const actRate   = Math.round((actCount   / Math.max(lineTotal, 1))                * 1000) / 10;
    const churnRate = Math.round((churnCount / Math.max(activeLines + churnCount, 1)) * 1000) / 10;

    teamMetrics = {
      actCount,
      lineTotal,
      actRate,
      churnCount,
      activeLines,
      churnRate,
    };
  }

  return { office, reps, myMetrics, teamMetrics, loading, error };
}
