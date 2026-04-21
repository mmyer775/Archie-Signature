import { useState }                from 'react';
import { MetricsCard, useMetrics } from './MetricsCard';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

// Tier coloring for weekly order counts
// 0–3: baseline blue, no glow
// 4:   cyan neon
// 5–7: green neon
// 8:   yellow neon
// 9+:  hot pink neon
function orderTierStyle(orders) {
  const n = Number(orders) || 0;
  if (n >= 9)  return { color: '#FF00E5', textShadow: '0 0 8px #FF00E5, 0 0 2px #FF00E5' };
  if (n === 8) return { color: '#FFEA00', textShadow: '0 0 8px #FFEA00, 0 0 2px #FFEA00' };
  if (n >= 5)  return { color: '#39FF14', textShadow: '0 0 8px #39FF14, 0 0 2px #39FF14' };
  if (n === 4) return { color: '#00F0FF', textShadow: '0 0 8px #00F0FF, 0 0 2px #00F0FF' };
  return { color: '#7B8FCE', textShadow: 'none' };
}

function WeeklyLeaderboard({ team }) {
  const sorted  = [...team].sort((a, b) => (b.weekLines || 0) - (a.weekLines || 0));
  const topLines = sorted[0]?.weekLines || 1;

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14, color: 'var(--text)' }}>Weekly Leaderboard</div>
        <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mon – Today</div>
      </div>
      {sorted.map((rep, i) => {
        const medal   = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
        const pct     = topLines > 0 ? Math.round(((rep.weekLines || 0) / topLines) * 100) : 0;
        const orderSx = orderTierStyle(rep.weekOrders);
        return (
          <div key={rep.id || i} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 20, textAlign: 'center', fontSize: medal ? 14 : 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
                {medal || `#${i + 1}`}
              </div>
              <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>{rep.name}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15, color: '#A0C4B8', lineHeight: 1 }}>{rep.weekLines || 0}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>lines</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15, lineHeight: 1, ...orderSx }}>{rep.weekOrders || 0}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>orders</div>
                </div>
              </div>
            </div>
            <div style={{ marginLeft: 28, height: 4, background: 'var(--bg-overlay)', borderRadius: 100, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: i === 0 ? '#A0C4B8' : i === 1 ? '#7B8FCE' : i === 2 ? '#B8A0D4' : 'var(--border-mid)', borderRadius: 100, transition: 'width 0.4s ease' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function APlayerHome({ user }) {
  const firstName = (user?.name || 'A-Player').split(' ')[0];
  const team      = Array.isArray(user?.team) && user.team.length > 0 ? user.team : [];
  const [tab, setTab] = useState('team');

  const teamRepNames = team.map(r => r.name).filter(Boolean);
  const { teamMetrics, loading: metricsLoading } = useMetrics(user, teamRepNames);

  const submitted    = team.filter(r => r.submitted);
  const notSubmitted = team.filter(r => !r.submitted);
  const totalSales   = team.reduce((a, r) => a + (r.sales  || 0), 0);
  const totalHouses  = team.reduce((a, r) => a + (r.houses || 0), 0);
  const subRate      = team.length > 0 ? Math.round((submitted.length / team.length) * 100) : 0;
  const sorted       = [...team].sort((a, b) => (b.sales || 0) - (a.sales || 0));

  // ── Weekly total (team-wide lines) ──────────────────────────
  const weekLinesTotal = team.reduce((a, r) => a + (r.weekLines || 0), 0);

  return (
    <div className="fade-up">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: 'linear-gradient(135deg,#7B8FCE,#B8A0D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: '#EDE8F5', flexShrink: 0 }}>
            {firstName[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: '#B8A0D4', fontWeight: 700 }}>{greeting()}, A-Player</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 30, color: 'var(--text)', lineHeight: 1.1 }}>{firstName}.</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: 64 }}>Your team's output is a direct reflection of your leadership.</div>
      </div>

      {/* Daily stat grid */}
      <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Today</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
        {[
          ['Sales',     totalSales,  '#A0C4B8'],
          ['Houses',    totalHouses, '#C4748A'],
          ['Submitted', `${submitted.length}/${team.length}`, subRate === 100 ? '#A0C4B8' : '#B8A0D4'],
          ['Not In',    notSubmitted.length, notSubmitted.length === 0 ? '#A0C4B8' : '#C4748A'],
        ].map(([label, value, color]) => (
          <div key={label} className="card" style={{ textAlign: 'center', padding: '12px 8px', margin: 0, borderColor: color + '40' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Weekly total (team-wide lines) */}
      {team.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>This Week</div>
          <div style={{ marginBottom: 16 }}>
            <div className="card" style={{ textAlign: 'center', padding: '14px 8px', margin: 0, borderColor: '#A0C4B840' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color: '#A0C4B8', lineHeight: 1 }}>{weekLinesTotal}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, marginTop: 4 }}>Lines This Week</div>
            </div>
          </div>
        </>
      )}

      {/* Weekly leaderboard */}
      {team.length > 0 && <WeeklyLeaderboard team={team} />}

      {/* Team metrics */}
      {!metricsLoading && teamMetrics && (
        <MetricsCard metrics={teamMetrics} label="Team Activation & Churn" />
      )}

      {/* Empty state */}
      {team.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '24px 16px', opacity: 0.6 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>No team members loaded</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Make sure reps are assigned to you in the ROSTER sheet (col E)</div>
        </div>
      )}

      {/* Tab bar */}
      {team.length > 0 && (
        <>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Daily Detail</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 4 }}>
            {[['team', 'My Team'], ['alerts', `Alerts${notSubmitted.length > 0 ? ` (${notSubmitted.length})` : ''}`]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: '9px 6px', background: tab === key ? 'var(--bg-overlay)' : 'none', border: 'none', borderRadius: 9, color: tab === key ? 'var(--text)' : 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Daily team list */}
          {tab === 'team' && sorted.map((rep, i) => {
            const cr    = rep.saras ? Math.round(((rep.sales || 0) / rep.saras) * 100) : 0;
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
            return (
              <div key={rep.id || i} className="card" style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 10, borderColor: rep.submitted ? 'var(--border)' : '#C4748A30' }}>
                <div style={{ width: 28, display: 'flex', justifyContent: 'center' }}>
                  {medal ? <span style={{ fontSize: 20 }}>{medal}</span> : <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--text-muted)' }}>#{i + 1}</span>}
                </div>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--bg-overlay)', border: '1px solid var(--border-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {(rep.name || '?')[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{rep.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {rep.submitted
                      ? <><span style={{ color: '#C4748A' }}>{rep.houses}</span> doors · <span style={{ color: '#A0C4B8' }}>{rep.sales}</span> sales · <span style={{ color: '#B8A0D4' }}>{cr}%</span> close</>
                      : <span style={{ color: '#C4748AAA', fontStyle: 'italic' }}>hasn't submitted today</span>
                    }
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, color: '#E8A0B0' }}>🔥 {rep.streak || 0}d</div>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: rep.submitted ? '#A0C4B8' : '#C4748A' }} />
                </div>
              </div>
            );
          })}

          {/* Alerts */}
          {tab === 'alerts' && (
            <div>
              {notSubmitted.length === 0
                ? <div className="card empty-state"><div style={{ fontSize: 32, marginBottom: 8 }}>✅</div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: '#A0C4B8', fontSize: 15 }}>All reps submitted today.</div></div>
                : notSubmitted.map((rep, i) => (
                    <div key={rep.id || i} className="card" style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: '#C4748A20', border: '1px solid #C4748A40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: '#C4748A', flexShrink: 0 }}>
                        {(rep.name || '?')[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{rep.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rep.streak > 0 ? `🔥 ${rep.streak}-day streak at risk` : 'No active streak'}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, color: '#C4748A', background: '#C4748A15', border: '1px solid #C4748A30', padding: '4px 8px', borderRadius: 100 }}>Not in</div>
                    </div>
                  ))
              }
            </div>
          )}
        </>
      )}
    </div>
  );
}
