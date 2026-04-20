import { useState, useRef, useEffect } from 'react';
import { CONFIG } from '../config';
import { fetchNumbers, submitNumbers } from '../api/sheets';

const METRICS = [
  { key: 'houses',      label: 'Houses',       icon: '🚪', target: 100, color: '#C4748A' },
  { key: 'talkTos',     label: "Talk-to's",    icon: '🗣️', target: 40,  color: '#7B8FCE' },
  { key: 'quickQuotes', label: 'Quick Quotes', icon: '⚡', target: 15,  color: '#B8A0D4' },
  { key: 'saras',       label: 'SARAs',        icon: '📋', target: 8,   color: '#E8A0B0' },
  { key: 'closedSales', label: 'Closed Sales', icon: '✅', target: 2,   color: '#A0C4B8' },
];

const FUNNEL = [
  { label: 'Contact Rate', sub: "talk-to's per house", target: 40, numerator: 'talkTos',     denominator: 'houses'      },
  { label: 'Quote Rate',   sub: 'quotes per talk-to',  target: 33, numerator: 'quickQuotes', denominator: 'talkTos'     },
  { label: 'SARA Rate',    sub: 'SARAs per quote',      target: 50, numerator: 'saras',       denominator: 'quickQuotes' },
  { label: 'Close Rate',   sub: 'sales per SARA',       target: 50, numerator: 'closedSales', denominator: 'saras'       },
];

function todayStr() {
  return new Date().toLocaleDateString('en-US');
}

function buildPrompt(counts, user) {
  const r = (n, d) => d ? Math.round((n / d) * 100) : 0;
  const name = (user?.name || 'Rep').split(' ')[0];
  const hour = new Date().getHours();
  const timeOfDay = hour < 17 ? 'afternoon check-in' : 'end of day';
  return `You are Archie, an elite AT&T field sales coach. Give ${name} a sharp, direct ${timeOfDay} breakdown. Be specific, call out what's strong and what needs work. If it's an afternoon check-in, tell them what they need to hit by end of day. Under 150 words. No fluff.

Numbers so far: ${counts.houses} houses / ${counts.talkTos} talk-to's / ${counts.quickQuotes} quotes / ${counts.saras} SARAs / ${counts.closedSales} sales
Daily targets: 100 / 40 / 15 / 8 / 2
Conversion rates: Contact ${r(counts.talkTos, counts.houses)}% (target 40%) · Quote ${r(counts.quickQuotes, counts.talkTos)}% (target 33%) · SARA ${r(counts.saras, counts.quickQuotes)}% (target 50%) · Close ${r(counts.closedSales, counts.saras)}% (target 50%)`;
}

export function MyDay({ user }) {
  const [counts, setCounts]               = useState({ houses: 0, talkTos: 0, quickQuotes: 0, saras: 0, closedSales: 0 });
  const [loadingToday, setLoadingToday]   = useState(true);
  const [saving, setSaving]               = useState(false);
  const [justSaved, setJustSaved]         = useState(false);
  const [archieMsg, setArchieMsg]         = useState('');
  const [archieLoading, setArchieLoading] = useState(false);
  const [sheetError, setSheetError]       = useState(null);
  const archieRef = useRef(null);
  const fetchedRef = useRef(false);

  const userEmail = user?.email;

  // Load today's existing numbers on mount
  useEffect(() => {
    if (fetchedRef.current) return;
    if (!userEmail) { setLoadingToday(false); return; }
    fetchedRef.current = true;

    fetchNumbers(userEmail, user?.name)
      .then(rows => {
        const today = rows.find(r => r.date === todayStr());
        if (today) {
          setCounts({
            houses:      today.houses,
            talkTos:     today.talkTos,
            quickQuotes: today.quickQuotes,
            saras:       today.saras,
            closedSales: today.closedSales,
          });
        }
        setLoadingToday(false);
      })
      .catch(err => {
        console.error('MyDay load error:', err);
        setLoadingToday(false);
      });
  }, []);

  useEffect(() => { if (archieMsg) archieRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [archieMsg]);

  const inc = key => setCounts(p => ({ ...p, [key]: p[key] + 1 }));
  const dec = key => setCounts(p => ({ ...p, [key]: Math.max(0, p[key] - 1) }));
  const rate = (nk, dk) => { const d = counts[dk]; return d ? Math.round((counts[nk] / d) * 100) : 0; };

  async function handleSubmit() {
    if (!userEmail) {
      setSheetError('Not signed in.');
      return;
    }

    setSaving(true);
    setArchieMsg('');
    setSheetError(null);
    setJustSaved(false);

    try {
      await submitNumbers(userEmail, {
        repName:     user?.name || '',
        email:       user?.email || '',
        date:        todayStr(),
        houses:      counts.houses,
        talkTos:     counts.talkTos,
        quickQuotes: counts.quickQuotes,
        saras:       counts.saras,
        closedSales: counts.closedSales,
      });

      setJustSaved(true);

      // Archie breakdown — goes through /api/chat (Netlify function in prod, Vite proxy in dev)
      setArchieLoading(true);
      try {
        const res = await fetch(CONFIG.chatEndpoint, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model:      'claude-sonnet-4-5',
            max_tokens: 400,
            messages:   [{ role: 'user', content: buildPrompt(counts, user) }],
          }),
        });
        const data = await res.json();
        setArchieMsg(data?.content?.[0]?.text || 'Numbers saved. Keep pushing.');
      } catch (chatErr) {
        console.warn('Archie breakdown failed:', chatErr);
        setArchieMsg('Numbers saved. Keep pushing.');
      }

    } catch (e) {
      console.error('MyDay submit error:', e);
      setSheetError('Could not save numbers. Try again.');
    } finally {
      setSaving(false);
      setArchieLoading(false);
    }
  }

  if (loadingToday) return (
    <div className="fade-up" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
      Loading today's numbers...
    </div>
  );

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, color: 'var(--text)' }}>My Day</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          {justSaved && <span style={{ marginLeft: 8, color: '#A0C4B8', fontWeight: 600 }}>· saved ✓</span>}
        </div>
      </div>

      {sheetError && (
        <div style={{ padding: 10, background: '#C4748A15', border: '1px solid #C4748A40', borderRadius: 8, color: '#C4748A', fontSize: 13, marginBottom: 12 }}>
          {sheetError}
        </div>
      )}

      {METRICS.map(m => {
        const val = counts[m.key];
        const pct = Math.min(100, Math.round((val / m.target) * 100));
        const hit = val >= m.target;
        return (
          <div key={m.key} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${m.color}`, borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>{m.icon}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{m.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, minWidth: 36, textAlign: 'right', color: hit ? m.color : 'var(--text-muted)' }}>{pct}%</span>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-raised)', borderRadius: 10, border: '1px solid var(--border-mid)', overflow: 'hidden' }}>
                  <button onClick={() => dec(m.key)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, fontWeight: 700, width: 38, height: 38, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, minWidth: 34, textAlign: 'center', color: hit ? m.color : 'var(--text)' }}>{val}</span>
                  <button onClick={() => inc(m.key)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 20, fontWeight: 700, width: 38, height: 38, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
              </div>
            </div>
            <div style={{ height: 4, background: 'var(--bg-raised)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: m.color, opacity: hit ? 1 : 0.7, transition: 'width 0.2s ease' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{val} / {m.target} daily target</div>
          </div>
        );
      })}

      {/* Conversion funnel */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 14 }}>· CONVERSION FUNNEL ·</div>
        {FUNNEL.map(row => {
          const r = rate(row.numerator, row.denominator);
          const d = counts[row.denominator];
          const ok = r >= row.target;
          return (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--bg-raised)' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text-mid)' }}>{row.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{counts[row.numerator]} of {d} {row.sub.split(' per ')[1]}s</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, minWidth: 48, textAlign: 'right', color: d === 0 ? 'var(--text-muted)' : ok ? '#A0C4B8' : '#C4748A' }}>
                  {d === 0 ? `target ${row.target}%` : `${r}%`}
                </span>
                <div style={{ width: 60, height: 3, background: 'var(--bg-raised)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 2, width: `${Math.min(100, r)}%`, background: d === 0 ? 'var(--bg-overlay)' : ok ? '#A0C4B8' : '#C4748A', transition: 'width 0.3s ease' }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg,#7B5EA7,#4A3480)', color: '#EDE8F5', border: 'none', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, cursor: 'pointer', marginBottom: 12, boxShadow: '0 4px 20px rgba(123,94,167,0.35)', opacity: saving ? 0.7 : 1 }}
        onClick={handleSubmit}
        disabled={saving}
      >
        {saving ? 'Saving...' : justSaved ? 'Update Numbers' : 'Submit Numbers'}
      </button>

      {justSaved && !archieLoading && !archieMsg && (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Numbers logged — update anytime before 1am.</p>
      )}

      {(archieLoading || archieMsg) && (
        <div ref={archieRef} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#C97B3A,#F7C94F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>⚡</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>Archie's Breakdown</div>
          </div>
          {archieLoading
            ? <div style={{ display: 'flex', gap: 5, alignItems: 'center', height: 20 }}>
                {[0,1,2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block', animation: 'blink 1.2s infinite', animationDelay: `${i*160}ms` }} />)}
              </div>
            : <div style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{archieMsg}</div>
          }
        </div>
      )}

      <style>{`@keyframes blink { 0%,80%,100%{opacity:0;transform:scale(.7)} 40%{opacity:1;transform:scale(1)} }`}</style>
    </div>
  );
}
