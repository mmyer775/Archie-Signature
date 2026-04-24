import { ROLES } from '../config';

function roleLabel(role) {
  const map = { admin: 'Admin', captain: 'Captain', manager: 'Manager', a_player: 'A-Player', rep: 'Rep' };
  return map[role] || role;
}

export function Layout({ user, activeTab, tabs, onTabChange, onSignOut, adminSwitcher, children }) {
  const parts = (user?.name || '').split(' ');
  const displayName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-brand">arch<span>ie</span></div>
        <div className="app-header-office">{import.meta.env.VITE_OFFICE_NAME || 'Office'}</div>

        {/* Admin switcher — only renders for admins; returns null otherwise */}
        {adminSwitcher}

        <button className="app-header-user" onClick={onSignOut} title="Sign out">
          <span className="app-header-door">🚪</span>
          <span className="app-header-user-name">{displayName}</span>
          <span className="app-header-user-role">{roleLabel(user?.role)}</span>
        </button>
      </header>

      <main className="tab-content">{children}</main>

      <nav className="tab-bar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="tab-item-icon">{tab.icon}</span>
            <span className="tab-item-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
