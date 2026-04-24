// ============================================================
// App — Root component (with Admin Switcher)
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth }            from './hooks/useAuth';
import { useAdminOverride }   from './hooks/useAdminOverride';
import { Login }              from './components/Login';
import { AccessDenied }       from './components/AccessDenied';
import { AdminSwitcher }      from './components/AdminSwitcher';
import { RepView }            from './views/RepView';
import { APlayerView }        from './views/APlayerView';
import { ManagerView }        from './views/ManagerView';
import { CaptainView }        from './views/CaptainView';
import { ROLES }              from './config';
import { fetchRosterForOffice } from './lib/sheets';

export default function App() {
  const { status, user: realUser, error, signIn, signOut, isLoading } = useAuth();
  const { override, setOverride, clearOverride, effectiveUser } = useAdminOverride(realUser);

  // ── Load reps for the current office (for the rep sub-picker) ─
  const [repsForOffice, setRepsForOffice] = useState([]);
  useEffect(() => {
    if (realUser?.role !== ROLES.ADMIN) return;
    const office = override?.office || realUser.office;
    if (!office) return;
    fetchRosterForOffice(office)
      .then(setRepsForOffice)
      .catch(err => console.warn('Could not load reps for', office, err));
  }, [realUser, override?.office]);

  // ── Wrap signOut so override is cleared too ───────────────────
  function handleSignOut() {
    clearOverride();
    signOut();
  }

  // ── Loading / login / denied ─────────────────────────────────
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
    return <AccessDenied onSignOut={handleSignOut} />;
  }

  // ── Authenticated → route by EFFECTIVE role ──────────────────
  if (status === 'authenticated' && effectiveUser) {
    const { role } = effectiveUser;

    // Build the switcher (rendered only for admins inside the component itself)
    const switcher = (
      <AdminSwitcher
        realUser={realUser}
        override={override}
        onChange={setOverride}
        repsForOffice={repsForOffice}
      />
    );

    // The KEY prop forces a remount when office/role/rep changes,
    // which triggers all data hooks to re-fetch fresh data.
    const viewKey = `${effectiveUser.office}-${effectiveUser.role}-${effectiveUser.name}`;

    if (role === ROLES.ADMIN || role === ROLES.MANAGER) {
      return <ManagerView key={viewKey} user={effectiveUser} onSignOut={handleSignOut} adminSwitcher={switcher} />;
    }
    if (role === ROLES.CAPTAIN) {
      return <CaptainView key={viewKey} user={effectiveUser} onSignOut={handleSignOut} adminSwitcher={switcher} />;
    }
    if (role === ROLES.A_PLAYER) {
      return <APlayerView key={viewKey} user={effectiveUser} onSignOut={handleSignOut} adminSwitcher={switcher} />;
    }
    if (role === ROLES.REP) {
      return <RepView key={viewKey} user={effectiveUser} onSignOut={handleSignOut} adminSwitcher={switcher} />;
    }
    return <AccessDenied onSignOut={handleSignOut} />;
  }

  return null;
}
