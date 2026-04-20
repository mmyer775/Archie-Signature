import { useState } from 'react';

const MOCK_OFFICES = [
  { id: 1, name: 'Edge / Signature', manager: 'Jordan P.', sales: 18, target: 20, houses: 820,  deposit: 14200, reps: 8  },
  { id: 2, name: 'Romansphere',      manager: 'Casey M.',  sales: 14, target: 20, houses: 610,  deposit: 11050, reps: 6  },
  { id: 3, name: 'Ascension',        manager: 'Taylor R.', sales: 22, target: 20, houses: 990,  deposit: 17400, reps: 10 },
  { id: 4, name: 'Vendex',           manager: 'Avery S.',  sales: 9,  target: 20, houses: 430,  deposit: 7100,  reps: 5  },
];

const COLORS = ['#C4748A','#7B8FCE','#A0C4B8','#B8A0D4','#E8C87A','#E8A0B0'];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function fmt(n) { return n >= 1000 ? `$${(n/1000).toFixed(1)}k` : `$${n}`; }

export function CaptainHome({ user }) {
  const firstName = (user?.name || 'Captain').split(' ')[0];
  const offices   = user?.offices ?? MOCK_OFFICES;
  const [tab, setTab] = useState('overview');

  const totalSales   = offices.reduce((a, o) => a + o.sales,   0);
  const totalHouses  = offices.reduce((a, o) => a + o.houses,  0);
  const totalDeposit = offices.reduce((a, o) => a + o.deposit, 0);
  const totalReps    = offices.reduce((a, o) => a + o.reps,    0);
  const onTarget     = offices.filter(o => o.sales >= o.target).length;
  const maxSales     = Math.max(...offices.map(o => o.sales), 1);

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: 'linear-gradient(135deg,#E8C87A,#C4748A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: '#1A0A00', flexShrink: 0 }}>{firstName[0].toUpperCase()}</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: '#E8C87A', fontWeight: 700 }}>{greeting()}, Captain</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 30, color: 'var(--text)', lineHeight: 1.1 }}>{firstName}.</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: 64 }}>{offices.length} offices · {totalReps} reps · one standard.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 16 }}>
        {[['Total Sales', totalSales, '#A0C4B8', `across ${offices.length} offices`], ['Houses Today', totalHouses.toLocaleString(), '#C4748A', 'doors knocked'], ['Direct Deposit', fmt(totalDeposit), '#E8C87A', 'total this period'], ['On Target', `${onTarget}/${offices.length}`, onTarget === offices.length ? '#A0C4B8' : '#B8A0D4', 'offices at goal']].map(([label, value, color, sub]) => (
          <div key={label} className="card" style={{ margin: 0, borderColor: color + '40', padding: '14px 12px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 26, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--text)', fontWeight: 700, marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 4 }}>
        {[['overview','Overview'],['deposit','Payouts'],['metrics','Metrics']].map(([key, label]) => (
          <button key={key} style={{ flex: 1, padding: '9px 6px', background: tab === key ? 'var(--bg-overlay)' : 'none', border: 'none', borderRadius: 9, color: tab === key ? 'var(--text)' : 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {tab === 'overview' && offices.map((o, i) => {
        const color = COLORS[i % COLORS.length];
        const pct   = Math.min(100, Math.round((o.sales / o.target) * 100));
        const onTgt = o.sales >= o.target;
        return (
          <div key={o.id} className="card" style={{ margin: '0 0 10px', borderLeft: `3px solid ${color}`, borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>{o.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{o.manager} · {o.reps} reps</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: onTgt ? '#A0C4B8' : color }}>{o.sales}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>/ {o.target} target</div>
              </div>
            </div>
            <div style={{ height: 6, background: 'var(--bg-overlay)', borderRadius: 100, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', borderRadius: 100, width: `${pct}%`, background: onTgt ? '#A0C4B8' : color, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>{pct}% to target</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>{o.houses.toLocaleString()} doors</div>
            </div>
          </div>
        );
      })}

      {tab === 'deposit' && (
        <div>
          <div className="card" style={{ marginBottom: 12, background: 'var(--bg-overlay)', borderColor: '#E8C87A40', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--text-muted)' }}>Total Direct Deposit</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: '#E8C87A' }}>{fmt(totalDeposit)}</div>
          </div>
          {offices.map((o, i) => {
            const color = COLORS[i % COLORS.length];
            const pct   = Math.round((o.deposit / totalDeposit) * 100);
            return (
              <div key={o.id} className="card" style={{ margin: '0 0 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{o.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{o.reps} reps</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: '#E8C87A' }}>{fmt(o.deposit)}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{pct}% of total</div>
                  </div>
                </div>
                <div style={{ height: 4, background: 'var(--bg-overlay)', borderRadius: 100, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 100, width: `${pct}%`, background: color }} />
                </div>
              </div>
            );
          })}
          <div className="card" style={{ opacity: 0.5, textAlign: 'center', padding: '20px 16px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Tableau Integration — Phase 3</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Connect your Tableau dashboard or Google Sheet for live payout data.</div>
          </div>
        </div>
      )}

      {tab === 'metrics' && (
        <div>
          <div className="card">
            <div className="card-title">Sales by Office</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80, marginBottom: 10 }}>
              {offices.map((o, i) => {
                const color = COLORS[i % COLORS.length];
                const pct   = Math.round((o.sales / maxSales) * 100);
                return (
                  <div key={o.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 800, color }}>{o.sales}</div>
                    <div style={{ width: '100%', height: 50, background: 'var(--bg-overlay)', borderRadius: 6, overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{ width: '100%', height: `${pct}%`, background: color, borderRadius: '6px 6px 0 0', transition: 'height 0.4s ease' }} />
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{o.name.split(' ')[0]}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="card">
            <div className="card-title">Per-Rep Averages</div>
            {offices.map((o, i) => {
              const color   = COLORS[i % COLORS.length];
              const perRep  = o.reps ? (o.sales / o.reps).toFixed(1) : '0';
              const perRepH = o.reps ? Math.round(o.houses / o.reps) : 0;
              return (
                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < offices.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color }}>{o.name.split(' ')[0]}</div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15, color: '#A0C4B8' }}>{perRep}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>sales/rep</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15, color: '#C4748A' }}>{perRepH}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>houses/rep</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
