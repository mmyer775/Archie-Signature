import { useAuth }       from './hooks/useAuth';
import { Login }         from './components/Login';
import { AccessDenied }  from './components/AccessDenied';
import { RepView }       from './views/RepView';
import { APlayerView }   from './views/APlayerView';
import { ManagerView }   from './views/ManagerView';
import { CaptainView }   from './views/CaptainView';
import { ROLES }         from './config';

export default function App() {
  const { status, user, error, signIn, signOut, isLoading } = useAuth();

  if (status === 'loading') {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Signing you in...</div>
      </div>
    );
  }

  if (status === 'idle' || status === 'error') {
    return <Login onSignIn={signIn} isLoading={isLoading} error={error} />;
  }

  if (status === 'denied') {
    return <AccessDenied onSignOut={signOut} />;
  }

  if (status === 'authenticated' && user) {
    const { role } = user;
    if (role === ROLES.ADMIN || role === ROLES.MANAGER) return <ManagerView  user={user} onSignOut={signOut} />;
    if (role === ROLES.CAPTAIN)                          return <CaptainView  user={user} onSignOut={signOut} />;
    if (role === ROLES.A_PLAYER)                         return <APlayerView  user={user} onSignOut={signOut} />;
    if (role === ROLES.REP)                              return <RepView      user={user} onSignOut={signOut} />;
    return <AccessDenied onSignOut={signOut} />;
  }

  return null;
}
