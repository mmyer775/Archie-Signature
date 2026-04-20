// ============================================================
// MetricsCard — Activation & Churn metrics
// Used on RepHome, APlayerHome, ManagerHome
// ============================================================

import { useState, useEffect } from 'react';
import { fetchMetrics }        from '../api/sheets';

function pctColor(rate, type) {
  if (type === 'act')   return rate >= 80 ? '#A0C4B8' : rate >= 60 ? '#B8A0D4' : '#C4748A';
  if (type === 'churn') return rate <= 5  ? '#A0C4B8' : rate <= 15  ? '#B8A0D4' : '#C4748A';
  return '#B8A0D4';
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
  const churnColor = pctColor(metrics.churnRate,  'churn');

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
          value={`${metrics.actRate}%`}
          sub={`${metrics.actCount} / ${metrics.lineTotal} lines`}
          color={actColor}
        />
        <StatBox
          label="Churn Rate"
          value={`${metrics.churnRate}%`}
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

      {/* Mini status line */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <div style={{ flex: 1, height: 4, background: 'var(--bg-overlay)', borderRadius: 100, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(metrics.actRate, 100)}%`, background: actColor, borderRadius: 100, transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ flex: 1, height: 4, background: 'var(--bg-overlay)', borderRadius: 100, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(metrics.churnRate, 100)}%`, background: churnColor, borderRadius: 100, transition: 'width 0.5s ease' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <div style={{ flex: 1, fontSize: 10, color: 'var(--text-muted)' }}>activation</div>
        <div style={{ flex: 1, fontSize: 10, color: 'var(--text-muted)' }}>churn</div>
      </div>
    </div>
  );
}

// Hook — fetches metrics and returns { office, reps, myMetrics, loading, error }
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

  const teamMetrics = teamReps.length > 0 ? {
    actCount:    teamReps.reduce((s, r) => s + r.actCount,    0),
    lineTotal:   teamReps.reduce((s, r) => s + r.lineTotal,   0),
    actRate:     Math.round(teamReps.reduce((s, r) => s + r.actCount, 0) / Math.max(teamReps.reduce((s, r) => s + r.lineTotal, 0), 1) * 100),
    churnCount:  teamReps.reduce((s, r) => s + r.churnCount,  0),
    activeLines: teamReps.reduce((s, r) => s + r.activeLines, 0),
    churnRate:   Math.round(teamReps.reduce((s, r) => s + r.churnCount, 0) / Math.max(teamReps.reduce((s, r) => s + r.activeLines, 0) + teamReps.reduce((s, r) => s + r.churnCount, 0), 1) * 100),
  } : null;

  return { office, reps, myMetrics, teamMetrics, loading, error };
}
