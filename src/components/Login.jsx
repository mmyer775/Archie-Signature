export function Login({ onSignIn, isLoading, error }) {
  return (
    <div style={s.screen}>
      <div style={s.card}>
        <div style={s.logo}>arch<span style={{ color: 'var(--primary)' }}>ie</span></div>
        <div style={s.tagline}>Your field sales operating system</div>

        {error && <div style={s.error}>{error}</div>}

        <button style={{ ...s.googleBtn, opacity: isLoading ? 0.7 : 1 }} onClick={() => onSignIn()} disabled={isLoading}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
          </svg>
          {isLoading ? 'Signing in...' : 'Sign in with Google'}
        </button>

        <div style={s.note}>Access is by invitation only.</div>
      </div>
    </div>
  );
}

const s = {
  screen:    { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: 24 },
  card:      { width: '100%', maxWidth: 340, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 32, textAlign: 'center' },
  logo:      { fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 36, color: 'var(--text)', marginBottom: 8 },
  tagline:   { fontSize: 14, color: 'var(--text-muted)', marginBottom: 32, lineHeight: 1.5 },
  error:     { background: '#C4748A15', border: '1px solid #C4748A40', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: '#C4748A', marginBottom: 16 },
  googleBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 20px', background: 'var(--bg-raised)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text)', cursor: 'pointer', transition: 'all 0.15s', marginBottom: 16 },
  note:      { fontSize: 12, color: 'var(--text-muted)' },
};
