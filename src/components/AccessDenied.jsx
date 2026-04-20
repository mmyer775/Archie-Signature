export function AccessDenied({ onSignOut }) {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 300 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--text)', marginBottom: 8 }}>No Access</div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
          Your account isn't on the roster. Contact your manager to get added.
        </div>
        <button className="btn btn-ghost" onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  );
}
