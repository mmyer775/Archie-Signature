import { useState, useEffect } from 'react';
import { Layout }        from '../components/Layout';
import { APlayerHome }   from '../components/APlayerHome';
import { MyDay }         from '../components/MyDay';
import { OrdersView }    from '../components/OrdersView';
import { PlaybookView }  from '../components/PlaybookView';
import { StrugglesFeed } from '../components/StrugglesFeed';
import { A_PLAYER_TABS } from '../config';
import { fetchOrders, fetchDDData } from '../api/sheets';

const RATE_PER_LINE = 110;
const ACTIVE_DAYS   = 30;

// ── Helpers ───────────────────────────────────────────────────

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d) ? null : d;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

// A rep is "active" if they have at least one order in the last 30 days.
// Active reps with no current paycheck commissions are shown as $0
// instead of empty so managers can see who's active but not yet paid.
function isRepActive(orders, repName) {
  const cutoff = daysAgo(ACTIVE_DAYS);
  return orders.some(o => {
    if (o.repName.toLowerCase() !== repName.toLowerCase()) return false;
    const od = parseDate(o.orderDate);
    return od && od >= cutoff;
  });
}

function fmtMoney(n) {
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtShort(n) {
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function dateFmt(d) {
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
}

function thisWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function thisWeekEnd() {
  const sun = new Date(thisWeekStart());
  sun.setDate(sun.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return sun;
}

function groupByWeek(rows) {
  const byWeek = {};
  for (const r of rows) {
    const key = r.ddWeek || 'Unknown';
    if (!byWeek[key]) byWeek[key] = [];
    byWeek[key].push(r);
  }
  return Object.entries(byWeek).sort(([a], [b]) => {
    const da = parseDate(a), db = parseDate(b);
    if (da && db) return db - da;
    return b.localeCompare(a);
  });
}

function PayBadge({ label, color }) {
  return (
    <div style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 100,
      background: color + '20', border: `1px solid ${color}50`,
      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, color,
    }}>
      {label}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800,
      letterSpacing: '0.12em', textTransform: 'uppercase',
      color: 'var(--text-muted)', marginBottom: 8, paddingLeft: 2,
    }}>
      {children}
    </div>
  );
}

// ── Rep projected card (this Mon–Sun) ─────────────────────────

function ProjectedCard({ orders, repName, target = 10 }) {
  const weekStart = thisWeekStart();
  const weekEnd   = thisWeekEnd();

  const thisWeekOrders = orders.filter(o => {
    if (repName && o.repName.toLowerCase() !== repName.toLowerCase()) return false;
    const status = (o.status || '').toLowerCase();
    if (status.includes('cancel') || status.includes('disconnect')) return false;
    const d = parseDate(o.activeDate) || parseDate(o.orderDate);
    return d && d >= weekStart && d <= weekEnd;
  });

  const lines = thisWeekOrders.reduce((s, o) => s + (Number(o.lines) || 1), 0);
  const pay   = lines * RATE_PER_LINE;
  const pct   = Math.min(Math.round((lines / target) * 100), 100);
  const color = pct >= 100 ? '#A0C4B8' : pct >= 60 ? '#B8A0D4' : '#C4748A';

  const now     = new Date();
  const weekMs  = weekEnd - weekStart;
  const weekPct = Math.round((Math.min(Math.max(now - weekStart, 0), weekMs) / weekMs) * 100);

  return (
    <div style={{ padding: '10px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 22, color: '#B8A0D4' }}>
          {fmtShort(pay)}
        </div>
        <PayBadge label="In Progress" color="#B8A0D4" />
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
        {lines} line{lines !== 1 ? 's' : ''} · {dateFmt(weekStart)}–{dateFmt(weekEnd)}
      </div>
      {/* week progress */}
      <div style={{ height: 3, borderRadius: 100, background: 'var(--bg-raised)', overflow: 'hidden', marginBottom: 3 }}>
        <div style={{ height: '100%', borderRadius: 100, width: `${weekPct}%`, background: 'linear-gradient(90deg,#B8A0D480,#B8A0D4)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 8 }}>
        <span>MON</span><span>SUN</span>
      </div>
      {/* line target progress */}
      <div style={{ height: 4, borderRadius: 100, background: 'var(--bg-raised)', overflow: 'hidden', marginBottom: 4 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${color}99,${color})`, borderRadius: 100 }} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lines} / {target} line target · {pct}%</div>
    </div>
  );
}

// ── Single rep collapsible block ──────────────────────────────

function RepPayBlock({ repName, ddRows, orders, isMe = false, isActive = false, currentDDWeek = null }) {
  const [open, setOpen] = useState(isMe); // "My" card starts open

  const weeks = groupByWeek(ddRows);

  // Find the rep's rows for the OFFICE'S current DD week, not their own
  // most recent week. This way reps with $0 this week show $0, not last
  // week's paycheck.
  const currentWeekEntry = currentDDWeek
    ? weeks.find(([week]) => week === currentDDWeek)
    : weeks[0];

  const currentRows = currentWeekEntry ? currentWeekEntry[1] : [];
  const hasCurrent  = currentRows.length > 0;

  // History = all weeks except the current one
  const history = weeks
    .filter(([week]) => week !== (currentDDWeek || currentWeekEntry?.[0]))
    .slice(0, 4);

  // Active reps with no data this week → show as $0
  // Inactive reps with no data ever → show empty state
  const showZero = !hasCurrent && isActive;

  const currentAmt     = hasCurrent ? currentRows.reduce((s, r) => s + r.amount, 0) / 2 : 0;
  const currentWeekKey = currentDDWeek || currentWeekEntry?.[0];
  const currentLines   = hasCurrent
    ? currentRows.filter(r => r.clDescription === 'Port Line - OOF').length
    : 0;

  const initials = repName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const accentColor = isMe ? '#A0C4B8' : '#7B8FCE';

  return (
    <div style={{
      borderBottom: '1px solid var(--border)',
      paddingBottom: open ? 16 : 0,
      marginBottom: open ? 4 : 0,
    }}>
      {/* Header row — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0',
          textAlign: 'left',
        }}
      >
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: accentColor + '20', border: `1px solid ${accentColor}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12, color: accentColor,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>
            {isMe ? `${repName} (me)` : repName}
          </div>
          {(hasCurrent || showZero) && currentWeekKey && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
              DD Week {currentWeekKey}{currentLines > 0 ? ` · ${currentLines} line${currentLines !== 1 ? 's' : ''}` : ''}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: accentColor }}>
            {fmtMoney(currentAmt)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</div>
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div style={{ paddingLeft: 44 }}>

          {/* Current paycheck */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Current Paycheck</div>
            {hasCurrent ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, color: accentColor }}>
                    {fmtMoney(currentAmt)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    DD Week {currentWeekKey}{currentLines > 0 ? ` · ${currentLines} line${currentLines !== 1 ? 's' : ''}` : ''}
                  </div>
                  {isMe && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                      * subject to tax repayment and other Helen related debts
                    </div>
                  )}
                </div>
                <PayBadge label="Paid" color={accentColor} />
              </div>
            ) : showZero ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, color: 'var(--text-muted)' }}>
                    $0.00
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    DD Week {currentDDWeek || '—'} · no commissions
                  </div>
                </div>
                <PayBadge label="$0" color="#6B5F80" />
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No data yet</div>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>History</div>
              {history.map(([week, rows]) => {
                const amt       = rows.reduce((s, r) => s + r.amount, 0) / 2;
                const lineCount = rows.filter(r => r.clDescription === 'Port Line - OOF').length;
                const color     = amt >= 1500 ? '#A0C4B8' : amt >= 800 ? '#B8A0D4' : '#C4748A';
                return (
                  <div key={week} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{week}</div>
                      {lineCount > 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lineCount} line{lineCount !== 1 ? 's' : ''}</div>}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, color }}>{fmtMoney(amt)}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Projected */}
          <div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>This Week · Projected</div>
            <ProjectedCard orders={orders} repName={repName} />
          </div>

        </div>
      )}
    </div>
  );
}

// ── A-Player Paycheck View ────────────────────────────────────

function APlayerPaycheckView({ user }) {
  const [orders,  setOrders]  = useState([]);
  const [ddData,  setDDData]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // user.team is now an array of objects {id, name, ...} — extract names
  const teamNames = Array.isArray(user?.team)
    ? user.team.map(r => typeof r === 'object' ? r.name : r).filter(Boolean)
    : (user?.team || '').split(',').map(s => s.trim()).filter(Boolean);

  // All people to show: self + team
  const allNames = [user?.name, ...teamNames].filter(Boolean);

  useEffect(() => {
    async function load() {
      if (!user?.email) return;
      try {
        setLoading(true);
        setError(null);
        const [orderRows, ddRows] = await Promise.all([
          fetchOrders(user.email),
          fetchDDData(user.email),
        ]);
        setOrders(orderRows);
        setDDData(ddRows);
      } catch (err) {
        console.error('APlayerPaycheckView error:', err);
        setError(err.message || 'Could not load pay data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.email]);

  if (loading) return (
    <div className="fade-up">
      <div className="section-header"><div><div className="section-title">Pay</div><div className="section-subtitle">Loading...</div></div></div>
      {[1,2,3].map(i => <div key={i} className="card" style={{ height: 60, opacity: 0.3, marginBottom: 10 }} />)}
    </div>
  );

  if (error) return (
    <div className="fade-up">
      <div className="section-header"><div><div className="section-title">Pay</div><div className="section-subtitle">Error</div></div></div>
      <div className="card" style={{ borderColor: '#C4748A50' }}>
        <div style={{ color: '#C4748A', fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: 4 }}>Could not load pay data</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{error}</div>
      </div>
    </div>
  );

  const myName    = user?.name || '';
  const myDDRows  = ddData.filter(r => r.repName.toLowerCase() === myName.toLowerCase());
  const teamOnly  = teamNames.filter(n => n.toLowerCase() !== myName.toLowerCase());

  // Current DD week = most recent ddWeek across the ENTIRE office,
  // not per-rep. This way reps with $0 this week still show the
  // correct current week label instead of their last paid week.
  const currentDDWeek = (() => {
    const weeks = [...new Set(ddData.map(r => r.ddWeek).filter(Boolean))];
    weeks.sort((a, b) => {
      const da = parseDate(a), db = parseDate(b);
      if (da && db) return db - da;
      return b.localeCompare(a);
    });
    return weeks[0] || null;
  })();

  return (
    <div className="fade-up">
      <div className="section-header">
        <div>
          <div className="section-title">Pay</div>
          <div className="section-subtitle">Your earnings + team</div>
        </div>
      </div>

      {/* MY CARD */}
      <SectionLabel>My Pay</SectionLabel>
      <div className="card" style={{ marginBottom: 16, borderColor: '#A0C4B830' }}>
        <RepPayBlock
          repName={myName}
          ddRows={myDDRows}
          orders={orders}
          isMe={true}
          isActive={isRepActive(orders, myName)}
          currentDDWeek={currentDDWeek}
        />
      </div>

      {/* TEAM CARD */}
      {teamOnly.length > 0 && (
        <>
          <SectionLabel>Team</SectionLabel>
          <div className="card" style={{ marginBottom: 16 }}>
            {teamOnly.map((name, i) => {
              const repDD = ddData.filter(r => r.repName.toLowerCase() === name.toLowerCase());
              return (
                <RepPayBlock
                  key={name}
                  repName={name}
                  ddRows={repDD}
                  orders={orders}
                  isMe={false}
                  isActive={isRepActive(orders, name)}
                  currentDDWeek={currentDDWeek}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main APlayerView ──────────────────────────────────────────

export function APlayerView({ user, onSignOut }) {
  const [tab, setTab] = useState('home');

  return (
    <Layout user={user} activeTab={tab} tabs={A_PLAYER_TABS} onTabChange={setTab} onSignOut={onSignOut}>
      {tab === 'home'      && <APlayerHome user={user} />}
      {tab === 'orders'    && <OrdersView user={user} teamFilter={[user?.name, ...(Array.isArray(user?.team) ? user.team.map(r => r.name) : [])].filter(Boolean)} />}
      {tab === 'paycheck'  && <APlayerPaycheckView user={user} />}
      {tab === 'struggles' && <StrugglesFeed user={user} />}
      {tab === 'myday'     && <MyDay user={user} />}
      {tab === 'knowledge' && <PlaybookView user={user} />}
    </Layout>
  );
}
