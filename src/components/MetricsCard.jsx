// ============================================================
// MetricsCard — Activation & Churn metrics
// Used on RepHome, APlayerHome, ManagerHome, CaptainHome
//
// Rep breakdown is a collapsible section — tap the header to
// expand/collapse all reps, tap an individual row to see their
// detailed numbers. Act % and Churn % headers are sortable.
// ============================================================

import { useState, useEffect } from 'react';
import { fetchMetrics }        from '../api/sheets';

function pctColor(rate, type) {
  if (type === 'act')   return rate >= 80 ? '#A0C4B8' : rate >= 60 ? '#B8A0D4' : '#C4748A';
  if (type === 'churn') return rate <= 5  ? '#A0C4B8' : rate <= 15  ? '#B8A0D4' : '#C4748A';
  return '#B8A0D4';
}

function fmtPct(rate) {
  const n = Number(rate) || 0;
  return `${n.toFixed(1)}%`;
}

// ── useMetrics hook ──────────────────────────────────────────────────────
export function useMetrics(user) {
  const [office, setOffice]   = useState(null);
  const [reps, setReps]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.email) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const { office: off, reps: r } = await fetchMetrics(user.email);
        if (cancelled) return;
        setOffice(off || null);
        setReps(Array.isArray(r) ? r : []);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.email]);

  const myMetrics = reps.find(
    r => (r.repName || '').toLowerCase().trim() === (user?.name || '').toLowerCase().trim()
  ) || null;

  const teamNames = Array.isArray(user?.team)
    ? user.team.map(t => (typeof t === 'string' ? t : t.name)).filter(Boolean)
    : [];

  let teamMetrics = null;
  if (teamNames.length > 0) {
    const teamSet = new Set(teamNames.map(n => n.toLowerCase().trim()));
    const teamRows = reps.filter(r => teamSet.has((r.repName || '').toLowerCase().trim()));

    if (teamRows.length > 0) {
      const actCount    = teamRows.reduce((s, r) => s + (r.actCount    || 0), 0);
      const lineTotal   = teamRows.reduce((s, r) => s + (r.lineTotal   || 0), 0);
      const churnCount  = teamRows.reduce((s, r) => s + (r.churnCount  || 0), 0);
      const activeLines = teamRows.reduce((s, r) => s + (r.activeLines || 0), 0);

      teamMetrics = {
        actCount,
        lineTotal,
        actRate:     lineTotal   > 0 ? Math.round((actCount   / lineTotal)   * 1000) / 10 : 0,
        churnCount,
        activeLines,
        churnRate:   activeLines > 0 ? Math.round((churnCount / activeLines) * 1000) / 10 : 0,
      };
    }
  }

  return { office, reps, myMetrics, teamMetrics, loading, error };
}

// ── StatBox ──────────────────────────────────────────────────────────────
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

// ── StatPill for compact rep rows ────────────────────────────────────────
function StatPill({ label, value, color, sub }) {
  return (
    <div style={{
      background: 'var(--bg-raised)',
      border: `1px solid ${color}20`,
      borderRadius: 8,
      padding: '8px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 9,
        fontWeight: 700,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 15,
        color,
        lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{sub}</div>
      )}
    </div>
  );
}

// ── Collapsible Rep Row ──────────────────────────────────────────────────
function RepRow({ rep, highlight = false }) {
  const [expanded, setExpanded] = useState(false);

  const actColor   = pctColor(rep.actRate,   'act');
  const churnColor = pctColor(rep.churnRate, 'churn');

  return (
    <div style={{
      borderBottom: '1px solid var(--border)',
      padding: '0',
    }}>
      <button
        onClick={() => setExpanded(prev => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 0',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: highlight ? 800 : 600,
            fontSize: 13,
            color: highlight ? '#B8A0D4' : 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {rep.repName}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ textAlign: 'right', width: 44 }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 13,
                color: actColor,
                lineHeight: 1,
              }}>
                {fmtPct(rep.actRate)}
              </div>
            </div>
            <div style={{ textAlign: 'right', width: 44 }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 13,
                color: churnColor,
                lineHeight: 1,
              }}>
                {fmtPct(rep.churnRate)}
              </div>
            </div>
          </div>

          <div style={{
            color: 'var(--text-muted)',
            fontSize: 12,
            transition: 'transform 0.2s',
            transform: expanded ? 'rotate(90deg)' : 'none',
            width: 12,
            textAlign: 'center',
          }}>
            ›
          </div>
        </div>
      </button>

      {expanded && (
        <div style={{
          paddingBottom: 14,
          paddingTop: 4,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6,
        }}>
          <StatPill
            label="Activated"
            value={rep.actCount}
            sub={`of ${rep.lineTotal}`}
            color="#A0C4B8"
          />
          <StatPill
            label="Churned"
            value={rep.churnCount}
            sub={`of ${rep.activeLines}`}
            color={rep.churnCount > 0 ? '#C4748A' : 'var(--text-muted)'}
          />
          <StatPill
            label="Active (30d)"
            value={rep.activeLines}
            color="#7B8FCE"
          />
        </div>
      )}
    </div>
  );
}

// ── Sortable column header ───────────────────────────────────────────────
function SortHeader({ label, active, direction, onClick, width }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        margin: 0,
        width,
        textAlign: 'right',
        cursor: 'pointer',
        color: active ? '#B8A0D4' : 'var(--text-muted)',
        fontFamily: 'var(--font-display)',
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 2,
      }}
    >
      {label}
      {active && (
        <span style={{ fontSize: 9, opacity: 0.8 }}>
          {direction === 'desc' ? '▼' : '▲'}
        </span>
      )}
    </button>
  );
}

// ── Main MetricsCard export ──────────────────────────────────────────────
export function MetricsCard({ metrics, label, reps = [], showRepBreakdown = false, myName = null }) {
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [sortKey, setSortKey]             = useState('actRate');
  const [sortDir, setSortDir]             = useState('desc');

  if (!metrics) return null;

  const actColor   = pctColor(metrics.actRate,   'act');
  const churnColor = pctColor(metrics.churnRate, 'churn');

  // Sort reps based on current sort state
  const sortedReps = [...reps].sort((a, b) => {
    const av = Number(a[sortKey]) || 0;
    const bv = Number(b[sortKey]) || 0;
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  function toggleSort(key) {
    if (sortKey === key) {
      // Flip direction
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '14px 14px 12px',
      marginBottom: 12,
    }}>
      {label && (
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 11,
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}>
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
          label="Activations (30d)"
          value={metrics.activeLines}
          sub={null}
          color="#7B8FCE"
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <div style={{ flex: 1, height: 4, background: 'var(--bg-overlay)', borderRadius: 100, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(metrics.actRate, 100)}%`, background: actColor, borderRadius: 100, transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ flex: 1, height: 4, background: 'var(--bg-overlay)', borderRadius: 100, overflow: 'hidden' }}>
  <div style={{ height: '100%', width: `${Math.min((metrics.churnRate / 10) * 100, 100)}%`, background: churnColor, borderRadius: 100, transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* Collapsible per-rep breakdown */}
      {showRepBreakdown && reps.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {/* Section header — tap to expand/collapse */}
          <button
            onClick={() => setBreakdownOpen(prev => !prev)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0',
              background: 'transparent',
              border: 'none',
              borderBottom: breakdownOpen ? '1px solid var(--border)' : 'none',
              cursor: 'pointer',
              color: 'inherit',
              fontFamily: 'inherit',
            }}
          >
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 10,
              color: 'var(--text-muted)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              By Rep ({reps.length})
            </div>
            <div style={{
              color: 'var(--text-muted)',
              fontSize: 12,
              transition: 'transform 0.2s',
              transform: breakdownOpen ? 'rotate(90deg)' : 'none',
            }}>
              ›
            </div>
          </button>

          {breakdownOpen && (
            <>
              {/* Sortable column headers */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 10,
                padding: '8px 0 6px',
                borderBottom: '1px solid var(--border)',
              }}>
                <SortHeader
                  label="Act"
                  active={sortKey === 'actRate'}
                  direction={sortDir}
                  onClick={() => toggleSort('actRate')}
                  width={44}
                />
                <SortHeader
                  label="Churn"
                  active={sortKey === 'churnRate'}
                  direction={sortDir}
                  onClick={() => toggleSort('churnRate')}
                  width={44}
                />
                <div style={{ width: 12 }} />
              </div>

              {/* Rep rows */}
              {sortedReps.map(rep => (
                <RepRow
                  key={rep.repName}
                  rep={rep}
                  highlight={myName && rep.repName.toLowerCase() === myName.toLowerCase()}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
