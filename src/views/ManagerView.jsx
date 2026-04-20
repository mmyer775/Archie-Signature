import { useState }      from 'react';
import { Layout }        from '../components/Layout';
import { ManagerHome }   from '../components/ManagerHome';
import { OrdersView }    from '../components/OrdersView';
import { PaycheckView }  from '../components/PaycheckView';
import { MANAGER_TABS }  from '../config';
import { StrugglesFeed } from '../components/StrugglesFeed';
import { ReportsView }    from '../components/ReportsView';
import { RosterManager }  from '../components/RosterManager';

export function ManagerView({ user, onSignOut }) {
  const [tab, setTab] = useState('home');

  return (
    <Layout user={user} activeTab={tab} tabs={MANAGER_TABS} onTabChange={setTab} onSignOut={onSignOut}>
      {tab === 'home'      && <ManagerHome user={user} />}
      {tab === 'dashboard' && <DashboardPlaceholder />}
      {tab === 'orders'    && <OrdersView user={user} />}
      {tab === 'paycheck'  && <PaycheckView user={user} />}
      {tab === 'struggles' && <StrugglesFeed user={user} />}
      {tab === 'reports'   && <ReportsView user={user} />}
      {tab === 'roster'    && <RosterManager user={user} />}
    </Layout>
  );
}

function DashboardPlaceholder() {
  const stats = [['Houses','#C4748A'],["Talk-to's",'#7B8FCE'],['SARAs','#E8A0B0'],['Closed Sales','#A0C4B8']];
  return (
    <div className="fade-up">
      <div className="section-header">
        <div><div className="section-title">Office Today</div><div className="section-subtitle">{new Date().toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})}</div></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {stats.map(([label, color]) => (
          <div key={label} className="card" style={{ textAlign: 'center', padding: '20px 12px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color }}>—</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>
      <div className="card empty-state" style={{ opacity: 0.7 }}>
        <div className="empty-state-icon">📊</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: 8, color: 'var(--text)' }}>Live Dashboard — Phase 3 & 5</div>
        <div className="empty-state-text">Rep-by-rep breakdown, orders needing attention, and activation counts.</div>
      </div>
    </div>
  );
}

function RosterPlaceholder() {
  return (
    <div className="fade-up">
      <div className="section-header">
        <div><div className="section-title">Roster</div><div className="section-subtitle">Manage team access</div></div>
        <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 13, opacity: 0.5 }} disabled>+ Add Rep</button>
      </div>
      <div className="card">
        <div className="card-title">Roles</div>
        {[['manager','Full office view + reports'],['a_player','Own team view, no roster access'],['rep','Own data only']].map(([role, desc], i, arr) => (
          <div key={role} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', opacity: 0.6 }}>
            <span className="role-badge">{role.replace('_',' ')}</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{desc}</span>
          </div>
        ))}
      </div>
      <div className="card empty-state" style={{ opacity: 0.7 }}>
        <div className="empty-state-icon">👥</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: 8, color: 'var(--text)' }}>Roster Management — Phase 5</div>
        <div className="empty-state-text">Add and remove reps, change roles, set pay period dates.</div>
      </div>
    </div>
  );
}

function Placeholder({ icon, title, sub, phase, desc }) {
  return (
    <div className="fade-up">
      <div className="section-header"><div><div className="section-title">{title}</div><div className="section-subtitle">{sub}</div></div></div>
      <div className="card empty-state" style={{ opacity: 0.7 }}>
        <div className="empty-state-icon">{icon}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: 8, color: 'var(--text)' }}>{title} — {phase}</div>
        <div className="empty-state-text">{desc}</div>
      </div>
    </div>
  );
}
