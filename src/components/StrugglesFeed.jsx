// ============================================================
// StrugglesFeed — Phase 5
//
// Reads STRUGGLES sheet, surfaces flagged reps, sorts by
// frequency + recency. Visible to manager and a_player.
//
// A-player: sees team members only (not their own struggles)
// Manager:  sees everyone
// ============================================================

import { useState, useEffect } from 'react';
import { fetchStruggles } from '../api/sheets';

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const d    = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const TOPIC_COLORS = {
  'Objection Handling': '#C4748A',
  'Script / SARA':      '#7B5EA7',
  'Price Objection':    '#E8A0B0',
  'Activation / Order': '#7B8FCE',
  'Pay / Commission':   '#A0C4B8',
  'Chargeback':         '#E8C47A',
  'Cancellation':       '#C4748A',
  'Plans & Pricing':    '#B8A0D4',
  'General':            '#888',
};

function TopicBadge({ topic }) {
  const color = TOPIC_COLORS[topic] || '#888';
  return (
    <div style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 100,
      background: color + '20', border: `1px solid ${color}50`,
      fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, color,
    }}>
      {topic}
    </div>
  );
}

function FlagBadge() {
  return (
    <div style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 100,
      background: '#C4748A20', border: '1px solid #C4748A50',
      fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#C4748A',
    }}>
      ⚠️ Flagged
    </div>
  );
}

function RepCard({ repName, struggles }) {
  const [open, setOpen] = useState(false);

  const flagged   = struggles.filter(s => s.flagged);
  const latest    = struggles[0];
  const topTopics = [...struggles.reduce((map, s) => {
    map.set(s.topic, (map.get(s.topic) || 0) + 1);
    return map;
  }, new Map())].sort((a, b) => b[1] - a[1]).slice(0, 3);

  const initials = repName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const hasFlagged = flagged.length > 0;

  return (
    <div style={{
      border: `1px solid ${hasFlagged ? '#C4748A40' : 'var(--border)'}`,
      borderRadius: 'var(--radius)',
      marginBottom: 10,
      background: hasFlagged ? '#C4748A08' : 'var(--bg-card)',
      overflow: 'hidden',
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', cursor: 'pointer',
        }}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: hasFlagged
            ? 'linear-gradient(135deg,#C4748A,#E8A0B0)'
            : 'linear-gradient(135deg,#7B5EA7,#B8A0D4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14, color: '#EDE8F5',
        }}>{initials}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 15, color: 'var(--text)', marginBottom: 3,
          }}>{repName}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {hasFlagged && <FlagBadge />}
            {topTopics.map(([topic, count]) => (
              <div key={topic} style={{
                fontSize: 11, color: 'var(--text-muted)',
                fontFamily: 'var(--font-display)', fontWeight: 700,
              }}>
                {topic} ×{count}
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 900,
            fontSize: 20, color: hasFlagged ? '#C4748A' : 'var(--text)',
          }}>{struggles.length}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {timeAgo(latest?.date)}
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>
          {open ? '▲' : '▼'}
        </div>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {struggles.slice(0, 5).map((s, i) => (
            <div key={i} style={{
              padding: '12px 16px',
              borderBottom: i < Math.min(struggles.length, 5) - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <TopicBadge topic={s.topic} />
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {s.flagged && <FlagBadge />}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(s.date)}</span>
                </div>
              </div>
              {s.question && (
                <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 4, lineHeight: 1.5 }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Q: </span>{s.question}
                </div>
              )}
              {s.timesSeen > 1 && (
                <div style={{ fontSize: 11, color: '#C4748A', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                  Seen {s.timesSeen}× total
                </div>
              )}
            </div>
          ))}
          {struggles.length > 5 && (
            <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              +{struggles.length - 5} more entries
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function StrugglesFeed({ user }) {
  const [struggles,  setStruggles]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [filter,     setFilter]     = useState('all');
  const [sortBy,     setSortBy]     = useState('frequency');

  useEffect(() => {
    async function load() {
      if (!user?.email) return;
      try {
        setLoading(true);
        const rows = await fetchStruggles(user.email);
        setStruggles(rows);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.email]);

  // A-player: only show team members, not themselves
  const isAPlayer = user?.role === 'a_player';
  const teamNames = isAPlayer
  ? (Array.isArray(user?.team)
      ? user.team.map(r => typeof r === 'object' ? r.name : r)
      : (user?.team || '').split(',').map(s => s.trim())
    ).filter(Boolean).map(n => n.toLowerCase())
  : null;

  // Group by rep
  const byRep = struggles.reduce((map, s) => {
    if (!s.repName) return map;
    if (isAPlayer) {
      const repLower = s.repName.toLowerCase();
      // Skip own struggles
      if (repLower === (user?.name || '').toLowerCase()) return map;
      // Only show team members
      if (teamNames && teamNames.length > 0 && !teamNames.includes(repLower)) return map;
    }
    if (!map[s.repName]) map[s.repName] = [];
    map[s.repName].push(s);
    return map;
  }, {});

  Object.values(byRep).forEach(arr =>
    arr.sort((a, b) => new Date(b.date) - new Date(a.date))
  );

  let repEntries = Object.entries(byRep);
  if (filter === 'flagged') {
    repEntries = repEntries.filter(([, arr]) => arr.some(s => s.flagged));
  }

  if (sortBy === 'frequency') {
    repEntries.sort((a, b) => b[1].length - a[1].length);
  } else {
    repEntries.sort((a, b) => new Date(b[1][0]?.date) - new Date(a[1][0]?.date));
  }

  const totalFlagged = Object.values(byRep).flat().filter(s => s.flagged).length;
  const totalReps    = Object.keys(byRep).length;

  return (
    <div className="fade-up">
      <div className="section-header">
        <div>
          <div className="section-title">Struggles</div>
          <div className="section-subtitle">
            {isAPlayer ? 'Your team\' s Archie conversations' : 'What reps are asking Archie'}
          </div>
        </div>
        {totalFlagged > 0 && (
          <div style={{
            fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700,
            padding: '4px 10px', borderRadius: 100,
            background: '#C4748A15', border: '1px solid #C4748A40', color: '#C4748A',
          }}>
            ⚠️ {totalFlagged} flagged
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[
          ['Total', Object.values(byRep).flat().length, 'var(--text)'],
          ['Reps', totalReps, '#B8A0D4'],
          ['Flagged', totalFlagged, '#C4748A'],
        ].map(([label, val, color]) => (
          <div key={label} className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color }}>{val}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 700, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[['all', 'All'], ['flagged', '⚠️ Flagged only']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            style={{
              padding: '5px 12px', borderRadius: 100, fontSize: 12,
              fontFamily: 'var(--font-display)', fontWeight: 700, cursor: 'pointer',
              border: `1px solid ${filter === val ? '#C4748A' : 'var(--border)'}`,
              background: filter === val ? '#C4748A20' : 'transparent',
              color: filter === val ? '#C4748A' : 'var(--text-muted)',
            }}
          >{label}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {[['frequency', '# count'], ['recent', 'recent']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setSortBy(val)}
              style={{
                padding: '5px 10px', borderRadius: 100, fontSize: 11,
                fontFamily: 'var(--font-display)', fontWeight: 700, cursor: 'pointer',
                border: `1px solid ${sortBy === val ? '#B8A0D4' : 'var(--border)'}`,
                background: sortBy === val ? '#B8A0D420' : 'transparent',
                color: sortBy === val ? '#B8A0D4' : 'var(--text-muted)',
              }}
            >{label}</button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 16px' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>💬</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text)' }}>Loading struggles...</div>
        </div>
      )}

      {!loading && error && (
        <div className="card" style={{ borderColor: '#C4748A60' }}>
          <div style={{ color: '#C4748A', fontSize: 13 }}>⚠️ {error}</div>
        </div>
      )}

      {!loading && !error && repEntries.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 16px', opacity: 0.7 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
            {filter === 'flagged' ? 'No flagged struggles' : 'No struggles logged yet'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {filter === 'flagged'
              ? 'No rep has hit the same topic 3+ times this week.'
              : isAPlayer
                ? 'Struggles appear here once your team starts using Archie.'
                : 'Struggles appear here once reps start using Archie.'}
          </div>
        </div>
      )}

      {!loading && !error && repEntries.map(([repName, repStruggles]) => (
        <RepCard key={repName} repName={repName} struggles={repStruggles} />
      ))}
    </div>
  );
}
