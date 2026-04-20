import { useState } from 'react';
import { Layout }      from '../components/Layout';
import { CaptainHome } from '../components/CaptainHome';
import { CAPTAIN_TABS } from '../config';

export function CaptainView({ user, onSignOut }) {
  const [tab, setTab] = useState('home');

  return (
    <Layout user={user} activeTab={tab} tabs={CAPTAIN_TABS} onTabChange={setTab} onSignOut={onSignOut}>
      {tab === 'home'    && <CaptainHome user={user} />}
      {tab === 'reports' && <ReportsPlaceholder />}
    </Layout>
  );
}

function ReportsPlaceholder() {
  return (
    <div className="fade-up">
      <div className="section-header"><div><div className="section-title">Reports</div><div className="section-subtitle">Cross-office summaries</div></div></div>
      <div className="card" style={{ opacity: 0.6 }}>
        <div className="card-title">Automated Reports</div>
        {[['🌆','End of Day Summary','All offices, nightly'],['📅','Weekly Cross-Office','Every Sunday night'],['💰','Payout Summary','Per pay period']].map(([icon, label, sub], i, arr) => (
          <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: 24 }}>{icon}</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12, opacity: 0.5 }} disabled>Configure</button>
            </div>
          </div>
        ))}
      </div>
      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Report configuration in Phase 5</p>
    </div>
  );
}
