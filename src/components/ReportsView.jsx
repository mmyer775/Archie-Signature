// ============================================================
// ReportsView — Manager reports tab
//
// Data sources: NUMBERS sheet + STRUGGLES sheet
// Modes: Daily / Weekly / Monthly
// Date picker: search any past day/week/month
// Email: manager pushes button to send when ready
// Rep conversations: click a rep to see their Archie chats
// ============================================================

import React, { useState, useEffect } from 'react';

// Inject spin keyframe once
if (typeof document !== 'undefined' && !document.getElementById('archie-spin')) {
  const s = document.createElement('style');
  s.id = 'archie-spin';
  s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(s);
}
import { fetchNumbers, fetchStruggles } from '../api/sheets';

// ── Date helpers ──────────────────────────────────────────────

function toDateStr(d) {
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
}
function startOfDay(d)   { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function startOfWeek(d)  { const x = new Date(d); const day = x.getDay(); x.setDate(x.getDate() - (day === 0 ? 6 : day - 1)); x.setHours(0,0,0,0); return x; }
function endOfWeek(d)    { const s = startOfWeek(d); const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23,59,59,999); return e; }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0); }
function endOfMonth(d)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }
function parseDate(str)  { if (!str) return null; const d = new Date(str); return isNaN(d) ? null : d; }
function isoToInput(d)   { return d.toISOString().slice(0, 10); }

function rate(num, den) {
  if (!den) return '—';
  return Math.round((num / den) * 100) + '%';
}

// ── Aggregation ───────────────────────────────────────────────

function aggregateNumbers(rows, from, to) {
  const filtered = rows.filter(r => { const d = parseDate(r.date); return d && d >= from && d <= to; });
  const byRep = {};
  for (const r of filtered) {
    if (!r.repName) continue;
    if (!byRep[r.repName]) byRep[r.repName] = { houses: 0, talkTos: 0, quickQuotes: 0, saras: 0, closedSales: 0 };
    const b = byRep[r.repName];
    b.houses += r.houses; b.talkTos += r.talkTos; b.quickQuotes += r.quickQuotes;
    b.saras += r.saras; b.closedSales += r.closedSales;
  }
  const reps = Object.entries(byRep).sort((a, b) => b[1].closedSales - a[1].closedSales);
  const totals = reps.reduce((t, [, r]) => ({
    houses: t.houses + r.houses, talkTos: t.talkTos + r.talkTos,
    quickQuotes: t.quickQuotes + r.quickQuotes, saras: t.saras + r.saras,
    closedSales: t.closedSales + r.closedSales,
  }), { houses: 0, talkTos: 0, quickQuotes: 0, saras: 0, closedSales: 0 });
  return { reps, totals };
}

function aggregateStruggles(rows, from, to) {
  const filtered = rows.filter(r => { const d = parseDate(r.date); return d && d >= from && d <= to; });
  const flagged = filtered.filter(s => s.flagged);
  const byTopic = {};
  for (const s of filtered) byTopic[s.topic] = (byTopic[s.topic] || 0) + 1;
  const topTopics = Object.entries(byTopic).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const byRep = {};
  for (const s of filtered) {
    if (!s.repName) continue;
    if (!byRep[s.repName]) byRep[s.repName] = { total: 0, flagged: 0, rows: [] };
    byRep[s.repName].total++;
    if (s.flagged) byRep[s.repName].flagged++;
    byRep[s.repName].rows.push(s);
  }
  return { total: filtered.length, flagged: flagged.length, topTopics, byRep };
}

// ── Conversation Modal ────────────────────────────────────────

const TOPIC_COLORS = {
  'Objection Handling': '#C4748A', 'Script / SARA': '#7B5EA7',
  'Price Objection': '#E8A0B0', 'Activation / Order': '#7B8FCE',
  'Pay / Commission': '#A0C4B8', 'Chargeback': '#E8C47A',
  'Cancellation': '#C4748A', 'Plans & Pricing': '#B8A0D4', 'General': '#888',
};

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

async function summarizeResponse(question, response, apiKey) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `A sales rep asked their AI coach: "${question}"

The coach responded (may be cut off): "${response}"

Summarize the coach's response in 2-3 concise sentences. Focus on the core advice given. No preamble.`
      }]
    })
  });
  const data = await res.json();
  return data?.content?.[0]?.text || response;
}

function ConversationRow({ s, i, total }) {
  const [open,    setOpen]    = React.useState(false);
  const [summary, setSummary] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const topicColor = TOPIC_COLORS[s.topic] || '#888';

  const handleOpen = async () => {
    const nowOpen = !open;
    setOpen(nowOpen);
    if (nowOpen && !summary && s.archieResponse) {
      setLoading(true);
      try {
        const result = await summarizeResponse(s.question || '', s.archieResponse, null);
        setSummary(result);
      } catch (e) {
        setSummary(s.archieResponse); // fallback to raw
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={{
      borderBottom: i < total - 1 ? '1px solid var(--border)' : 'none',
      background: s.flagged ? '#C4748A06' : 'transparent',
    }}>
      {/* Always visible — click to expand */}
      <div onClick={handleOpen} style={{ padding: '12px 20px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: s.question ? 6 : 0 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-block', padding: '2px 8px', borderRadius: 100,
              background: topicColor + '20', border: `1px solid ${topicColor}50`,
              fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, color: topicColor,
            }}>
              {s.topic}
            </div>
            {s.flagged && (
              <div style={{
                display: 'inline-block', padding: '2px 8px', borderRadius: 100,
                background: '#C4748A20', border: '1px solid #C4748A50',
                fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#C4748A',
              }}>⚠️ Flagged</div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(s.date)}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', opacity: 0.6 }}>{open ? '▲' : '▼'}</span>
          </div>
        </div>
        {s.question && (
          <div style={{
            fontSize: 13, color: 'var(--text)', lineHeight: 1.4,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            opacity: 0.8,
          }}>
            {s.question}
          </div>
        )}
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ padding: '0 20px 14px' }}>
          {s.question && (
            <div style={{
              fontSize: 13, color: 'var(--text)', lineHeight: 1.5,
              padding: '8px 12px', background: 'var(--bg-overlay)',
              borderRadius: 'var(--radius-sm)', marginBottom: 8,
              borderLeft: '3px solid var(--border)',
            }}>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>Rep asked</span>
              {s.question}
            </div>
          )}
          {s.archieResponse && (
            <div style={{
              fontSize: 13, color: 'var(--text)', lineHeight: 1.5,
              padding: '8px 12px', background: '#7B5EA710',
              borderRadius: 'var(--radius-sm)',
              borderLeft: '3px solid #7B5EA750',
              minHeight: 48,
            }}>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800, color: '#B8A0D4', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>
                Archie {!loading && summary ? '· summarized' : ''}
              </span>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 12 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%',
                    border: '2px solid #B8A0D430', borderTopColor: '#B8A0D4',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Summarizing...
                </div>
              ) : (
                summary || s.archieResponse
              )}
            </div>
          )}
          {s.timesSeen > 1 && (
            <div style={{ fontSize: 11, color: '#C4748A', fontFamily: 'var(--font-display)', fontWeight: 700, marginTop: 6 }}>
              Seen {s.timesSeen}× total
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ConversationModal({ repName, rows, onClose }) {
  const sorted = [...rows].sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(92vw, 520px)', maxHeight: '80vh',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', zIndex: 1001,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, color: 'var(--text)' }}>{repName}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {rows.length} conversation{rows.length !== 1 ? 's' : ''} · {rows.filter(r => r.flagged).length} flagged · tap to expand
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)',
            background: 'var(--bg-overlay)', color: 'var(--text-muted)',
            fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {sorted.map((s, i) => (
            <ConversationRow key={i} s={s} i={i} total={sorted.length} />
          ))}
        </div>
      </div>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────

function StatGrid({ totals }) {
  const stats = [
    { label: 'Houses',       val: totals.houses,      color: '#C4748A' },
    { label: "Talk-to's",    val: totals.talkTos,     color: '#7B8FCE' },
    { label: 'Quick Quotes', val: totals.quickQuotes, color: '#E8C87A' },
    { label: 'SARAs',        val: totals.saras,       color: '#B8A0D4' },
    { label: 'Closed Sales', val: totals.closedSales, color: '#A0C4B8' },
    { label: 'Close Rate',   val: rate(totals.closedSales, totals.saras), color: '#A0C4B8' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
      {stats.map(({ label, val, color }) => (
        <div key={label} className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color }}>{val}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 700, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

function RepTable({ reps }) {
  if (!reps.length) return (
    <div className="card" style={{ textAlign: 'center', padding: '24px 16px', opacity: 0.6, marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No numbers submitted for this period.</div>
    </div>
  );
  return (
    <div className="card" style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 40px 40px 40px 40px 40px',
        gap: 4, padding: '8px 14px', borderBottom: '1px solid var(--border)',
        fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800,
        color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        <div>Rep</div>
        <div style={{ textAlign: 'center' }}>🚪</div>
        <div style={{ textAlign: 'center' }}>🗣</div>
        <div style={{ textAlign: 'center' }}>📋</div>
        <div style={{ textAlign: 'center' }}>✅</div>
        <div style={{ textAlign: 'center' }}>%</div>
      </div>
      {reps.map(([repName, r], i) => {
        const closeRate = r.saras ? Math.round((r.closedSales / r.saras) * 100) : 0;
        const color = closeRate >= 50 ? '#A0C4B8' : closeRate >= 25 ? '#E8C87A' : '#C4748A';
        return (
          <div key={repName} style={{
            display: 'grid', gridTemplateColumns: '1fr 40px 40px 40px 40px 40px',
            gap: 4, padding: '10px 14px',
            borderBottom: i < reps.length - 1 ? '1px solid var(--border)' : 'none',
            alignItems: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {repName.split(' ')[0]}
            </div>
            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>{r.houses}</div>
            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>{r.talkTos}</div>
            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>{r.saras}</div>
            <div style={{ textAlign: 'center', fontSize: 13, color: '#A0C4B8', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{r.closedSales}</div>
            <div style={{ textAlign: 'center', fontSize: 12, color, fontFamily: 'var(--font-display)', fontWeight: 800 }}>{closeRate}%</div>
          </div>
        );
      })}
    </div>
  );
}

function StrugglesSummary({ data, onRepClick }) {
  if (!data.total) return (
    <div className="card" style={{ opacity: 0.6, textAlign: 'center', padding: '20px 16px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No Archie conversations this period.</div>
    </div>
  );
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>
          {data.total} conversations
        </div>
        {data.flagged > 0 && (
          <div style={{ fontSize: 12, color: '#C4748A', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            ⚠️ {data.flagged} flagged
          </div>
        )}
      </div>

      {/* Top topics */}
      {data.topTopics.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Top Topics</div>
          {data.topTopics.map(([topic, count]) => {
            const maxCount = data.topTopics[0][1];
            const pct = Math.round((count / maxCount) * 100);
            return (
              <div key={topic} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: 'var(--text)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{topic}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{count}×</span>
                </div>
                <div style={{ height: 3, borderRadius: 100, background: 'var(--bg-raised)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: '#B8A0D4', borderRadius: 100 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* By rep — clickable */}
      {Object.keys(data.byRep).length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>By Rep</div>
          {Object.entries(data.byRep).sort((a, b) => b[1].total - a[1].total).map(([rep, d]) => (
            <div
              key={rep}
              onClick={() => onRepClick(rep, d.rows)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 10px', borderRadius: 'var(--radius-sm)',
                marginBottom: 4, cursor: 'pointer',
                background: 'var(--bg-overlay)',
                border: '1px solid transparent',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#7B8FCE50'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#7B8FCE20', border: '1px solid #7B8FCE40',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 10, color: '#7B8FCE',
                }}>
                  {rep.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                  {rep.split(' ')[0]}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>{d.total} total</span>
                {d.flagged > 0 && (
                  <span style={{ color: '#C4748A', fontFamily: 'var(--font-display)', fontWeight: 700 }}>⚠️ {d.flagged}</span>
                )}
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>›</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Email builder ─────────────────────────────────────────────

function buildEmailBody({ mode, rangeLabel, totals, reps, struggles }) {
  const repLines = reps.map(([name, r]) => {
    const cr = r.saras ? Math.round((r.closedSales / r.saras) * 100) : 0;
    return `  ${name}: ${r.houses} doors · ${r.talkTos} talk-tos · ${r.saras} SARAs · ${r.closedSales} sales (${cr}% close)`;
  }).join('\n');
  const topicLines = struggles.topTopics.map(([t, c]) => `  ${t}: ${c}×`).join('\n');
  return `ARCHIE ${mode.toUpperCase()} REPORT — ${rangeLabel}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OFFICE TOTALS
  Houses:       ${totals.houses}
  Talk-to's:    ${totals.talkTos}
  Quick Quotes: ${totals.quickQuotes}
  SARAs:        ${totals.saras}
  Closed Sales: ${totals.closedSales}
  Close Rate:   ${rate(totals.closedSales, totals.saras)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REP BREAKDOWN
${repLines || '  No data submitted.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ARCHIE CONVERSATIONS
  Total: ${struggles.total}
  Flagged: ${struggles.flagged}
${topicLines ? '\nTop Topics:\n' + topicLines : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sent from Archie · ${new Date().toLocaleString()}`;
}

// ── Main component ────────────────────────────────────────────

export function ReportsView({ user }) {
  const [mode,      setMode]      = useState('daily');
  const [refDate,   setRefDate]   = useState(isoToInput(new Date()));
  const [numbers,   setNumbers]   = useState([]);
  const [struggles, setStruggles] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [sending,   setSending]   = useState(false);
  const [sentMsg,   setSentMsg]   = useState('');
  const [modal,     setModal]     = useState(null); // { repName, rows }

  useEffect(() => {
    async function load() {
      if (!user?.email) return;
      try {
        setLoading(true); setError(null);
        const [numRows, strRows] = await Promise.all([
          fetchNumbers(user.email),
          fetchStruggles(user.email),
        ]);
        setNumbers(numRows);
        setStruggles(strRows);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.email]);

  const ref = new Date(refDate + 'T12:00:00');
  let from, to, rangeLabel;
  if (mode === 'daily') {
    from = startOfDay(ref); to = new Date(from); to.setHours(23,59,59,999);
    rangeLabel = toDateStr(from);
  } else if (mode === 'weekly') {
    from = startOfWeek(ref); to = endOfWeek(ref);
    rangeLabel = `${toDateStr(from)} – ${toDateStr(to)}`;
  } else {
    from = startOfMonth(ref); to = endOfMonth(ref);
    rangeLabel = ref.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  const numData = aggregateNumbers(numbers, from, to);
  const strData = aggregateStruggles(struggles, from, to);

  const handleEmail = async () => {
    setSending(true); setSentMsg('');
    try {
      const body = buildEmailBody({ mode, rangeLabel, totals: numData.totals, reps: numData.reps, struggles: strData });
      const subject = encodeURIComponent(`Archie ${mode} report — ${rangeLabel}`);
      window.open(`mailto:?subject=${subject}&body=${encodeURIComponent(body)}`);
      setSentMsg('Email client opened ✓');
    } catch (e) {
      setSentMsg('Could not open email client.');
    } finally {
      setSending(false);
      setTimeout(() => setSentMsg(''), 4000);
    }
  };

  return (
    <div className="fade-up">
      {/* Conversation modal */}
      {modal && (
        <ConversationModal
          repName={modal.repName}
          rows={modal.rows}
          onClose={() => setModal(null)}
        />
      )}

      <div className="section-header">
        <div>
          <div className="section-title">Reports</div>
          <div className="section-subtitle">{rangeLabel}</div>
        </div>
        <button
          onClick={handleEmail}
          disabled={sending}
          style={{
            padding: '8px 14px', borderRadius: 'var(--radius-sm)',
            background: '#7B8FCE20', border: '1px solid #7B8FCE50',
            color: '#7B8FCE', fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 12, cursor: 'pointer', opacity: sending ? 0.6 : 1,
          }}
        >
          {sending ? 'Opening...' : '📧 Email Report'}
        </button>
      </div>

      {sentMsg && (
        <div style={{ marginBottom: 12, padding: '8px 14px', background: '#A0C4B820', border: '1px solid #A0C4B850', borderRadius: 'var(--radius-sm)', fontSize: 12, color: '#A0C4B8', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
          {sentMsg}
        </div>
      )}

      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {[['daily','Day'],['weekly','Week'],['monthly','Month']].map(([val, label]) => (
          <button key={val} onClick={() => setMode(val)} style={{
            flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)',
            border: `1px solid ${mode === val ? '#7B8FCE' : 'var(--border)'}`,
            background: mode === val ? '#7B8FCE20' : 'transparent',
            color: mode === val ? '#7B8FCE' : 'var(--text-muted)',
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>

      {/* Date picker */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="date" value={refDate}
          onChange={e => setRefDate(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)', background: 'var(--bg-card)',
            color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-display)',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, paddingLeft: 2 }}>
          {mode === 'daily' ? 'Showing data for this day' : mode === 'weekly' ? `Week: ${rangeLabel}` : `Month: ${rangeLabel}`}
        </div>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 16px' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text)' }}>Loading report data...</div>
        </div>
      )}

      {!loading && error && (
        <div className="card" style={{ borderColor: '#C4748A60' }}>
          <div style={{ color: '#C4748A', fontSize: 13 }}>⚠️ {error}</div>
        </div>
      )}

      {!loading && !error && (
        <>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, paddingLeft: 2 }}>
            Field Numbers
          </div>
          <StatGrid totals={numData.totals} />
          <RepTable reps={numData.reps} />

          <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, paddingLeft: 2 }}>
            Archie Conversations
          </div>
          <StrugglesSummary
            data={strData}
            onRepClick={(repName, rows) => setModal({ repName, rows })}
          />
        </>
      )}
    </div>
  );
}
