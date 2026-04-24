// ============================================================
// MetricsCard — Activation & Churn metrics
// Used on RepHome, APlayerHome, ManagerHome, CaptainHome
//
// Rep breakdown is collapsible — tap a rep row to expand
// their detailed numbers.
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
      {/* Collapsed header — always visible */}
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
            color: highlight ? 'var(--primary)' : 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {rep.repName}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Quick peek: act rate and churn rate */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 13,
                color: actColor,
                lineHeight: 1,
              }}>
                {fmtPct(rep.actRate)}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>act</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 13,
                color: churnColor,
                lineHeight: 1,
              }}>
                {fmtPct(rep.churnRate)}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>churn</div>
            </div>
          </div>

          {/* Chevron */}
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

      {/* Expanded details */}
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

// ── Main MetricsCard export ──────────────────────────────────────────────
export function MetricsCard({ metrics, label, reps = [], showRepBreakdown = false, myName = null }) {
  if (!metrics) return null;

  const actColor   = pctColor(metrics.actRate,   'act');
  const churnColor = pctColor(metrics.churnRate, 'churn');

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

      {/* Top-level 3 stat boxes */}
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

      {/* Mini progress bars */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <div style={{ flex: 1, height: 4, background: 'var(--bg-overlay)', borderRadius: 100, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(metrics.actRate, 100)}%`, background: actColor, borderRadius: 100, transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ flex: 1, height: 4, background: 'var(--bg-overlay)', borderRadius: 100, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(metrics.churnRate, 100)}%`, background: churnColor, borderRadius: 100, transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* Per-rep collapsible breakdown */}
      {showRepBreakdown && reps.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 10,
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 4,
            paddingBottom: 6,
            borderBottom: '1px solid var(--border)',
          }}>
            By Rep ({reps.length})
          </div>
          {reps.map(rep => (
            <RepRow
              key={rep.repName}
              rep={rep}
              highlight={myName && rep.repName.toLowerCase() === myName.toLowerCase()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
