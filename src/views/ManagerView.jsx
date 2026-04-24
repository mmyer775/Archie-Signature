import { useState, useEffect } from 'react';
import { Layout }        from '../components/Layout';
import { ManagerHome }   from '../components/ManagerHome';
import { OrdersView }    from '../components/OrdersView';
import { PaycheckView }  from '../components/PaycheckView';
import { MANAGER_TABS }  from '../config';
import { StrugglesFeed } from '../components/StrugglesFeed';
import { ReportsView }   from '../components/ReportsView';
import { RosterManager } from '../components/RosterManager';
import { fetchNumbers }  from '../api/sheets';

// ── Office Dashboard ──────────────────────────────────────────

function OfficeDashboard({ user }) {
  const [numbers,  setNumbers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const today = new Date().toLocaleDateString('en-US');

  useEffect(() => {
    async function load() {
      if (!user?.email) return;
      try {
        setLoading(true);
        const rows = await fetchNumbers(user.email);
        setNumbers(rows);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.email]);

  // Today's rows only
  const todayRows = numbers.filter(n => n.date === today);

  // Office totals
  const totals = todayRows.reduce((acc, n) => ({
    houses:      acc.houses      + (n.houses      || 0),
    talkTos:     acc.talkTos     + (n.talkTos     || 0),
    quickQuotes: acc.quickQuotes + (n.quickQuotes  || 0),
    saras:       acc.saras       + (n.saras        || 0),
    sales:       acc.sales       + (n.closedSales  || 0),
  }), { houses: 0, talkTos: 0, quickQuotes: 0, saras: 0, sales: 0 });

  const closeRate = totals.saras > 0
    ? Math.round((totals.sales / totals.saras) * 100)
    : 0;

  // Sort reps by sales desc
  const sorted = [...todayRows].sort((a, b) => (b.closedSales || 0) - (a.closedSales || 0));

  return (
    <div className="fade-up">
      <div className="section-header">
        <div>
          <div className="section-title">Office Today</div>
          <div className="section-subtitle">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
        </div>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, padding: '4px 10px', borderRadius: 100, background: '#A0C4B815', border: '1px solid #A0C4B840', color: '#A0C4B8' }}>
          {todayRows.length} rep{todayRows.length !== 1 ? 's' : ''} in
        </div>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 16px', opacity: 0.6 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text)' }}>Loading...</div>
        </div>
      )}

      {!loading && error && (
        <div className="card" style={{ borderColor: '#C4748A50' }}>
          <div style={{ color: '#C4748A', fontSize: 13 }}>⚠️ {error}</div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Office stat grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            {[
              ['Houses',     totals.houses,      '#C4748A'],
              ["Talk-to's",  totals.talkTos,     '#7B8FCE'],
              ['Quick Quotes', totals.quickQuotes, '#B8A0D4'],
              ['SARAs',      totals.saras,        '#E8A0B0'],
              ['Sales',      totals.sales,        '#A0C4B8'],
              ['Close Rate', `${closeRate}%`,     closeRate >= 30 ? '#A0C4B8' : closeRate >= 15 ? '#E8C87A' : '#C4748A'],
            ].map(([label, value, color]) => (
              <div key={label} className="card" style={{ textAlign: 'center', padding: '14px 8px', margin: 0, borderColor: color + '40' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Rep breakdown */}
          {todayRows.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '24px 16px', opacity: 0.6 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>No numbers logged yet today</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Reps appear here once they submit their daily numbers.</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                Rep Breakdown
              </div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 44px 44px 44px 44px', gap: 4, padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-overlay)' }}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rep</div>
                  {['Doors', 'TT', 'QQ', 'SARA', 'Sale'].map(h => (
                    <div key={h} style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>{h}</div>
                  ))}
                </div>
                {sorted.map((n, i) => {
                  const cr = n.saras ? Math.round(((n.closedSales || 0) / n.saras) * 100) : 0;
                  const hasSale = (n.closedSales || 0) > 0;
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 44px 44px 44px 44px 44px', gap: 4, padding: '10px 14px', borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 'none', background: hasSale ? '#A0C4B808' : 'transparent' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.repName.split(' ')[0]}
                        {hasSale && <span style={{ marginLeft: 4, fontSize: 10 }}>🔥</span>}
                      </div>
                      <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#C4748A' }}>{n.houses || 0}</div>
                      <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#7B8FCE' }}>{n.talkTos || 0}</div>
                      <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#B8A0D4' }}>{n.quickQuotes || 0}</div>
                      <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#E8A0B0' }}>{n.saras || 0}</div>
                      <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 13, color: hasSale ? '#A0C4B8' : 'var(--text-muted)' }}>{n.closedSales || 0}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

export function ManagerView({ user, onSignOut, adminSwitcher }) {
  const [tab, setTab] = useState('home');

  return (
    <Layout
      user={user}
      activeTab={tab}
      tabs={MANAGER_TABS}
      onTabChange={setTab}
      onSignOut={onSignOut}
      adminSwitcher={adminSwitcher}
    >
      {tab === 'home'      && <ManagerHome user={user} />}
      {tab === 'dashboard' && <OfficeDashboard user={user} />}
      {tab === 'orders'    && <OrdersView user={user} />}
      {tab === 'paycheck'  && <PaycheckView user={user} />}
      {tab === 'struggles' && <StrugglesFeed user={user} />}
      {tab === 'reports'   && <ReportsView user={user} />}
      {tab === 'roster'    && <RosterManager user={user} />}
    </Layout>
  );
}
