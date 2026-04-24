// ============================================================
// AdminSwitcher — Admin-only top-right pill for impersonation
//
// Lets admins toggle between offices, roles, and specific reps
// without affecting their real ROSTER entry. The override is
// stored in sessionStorage and cleared on sign-out / refresh
// (per Mateo's preference: reset each session).
//
// HOW IT WORKS:
//   - Real user (admin) signs in normally → useAuth returns realUser
//   - AdminSwitcher writes override to sessionStorage('archie_admin_override')
//   - useAuth reads the override and returns an "effective user" to the app
//   - All views read from effective user, so changing office/role re-fetches
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { ROLES } from '../config';

// ── Office registry — keep in sync with Apps Script OFFICES sheet ──
const OFFICES = [
  { name: 'Signature',           legalName: 'Edge Concepts, Inc.' },
  { name: 'Ascension',           legalName: 'Ascension Wireless LLC' },
  { name: 'Coastal Connections', legalName: 'Coastal Connections LLC' },
  { name: 'Vendex',              legalName: 'Vendex LLC' },
  { name: 'Takeoff',             legalName: 'Takeoff Wireless LLC' },
  { name: 'First Class',         legalName: 'First Class Wireless LLC' },
  { name: 'Berhane Management',  legalName: 'Berhane Management LLC' },
  { name: 'Envision',            legalName: 'Envision LLC' },
];

// NOTE: legalName values above are placeholders — update with the real
// values from your master ROSTER. Only Signature's is confirmed
// ("Edge Concepts, Inc.") from your existing notes.

const ROLE_OPTIONS = [
  { value: ROLES.REP,      label: 'Rep' },
  { value: ROLES.A_PLAYER, label: 'A-Player' },
  { value: ROLES.MANAGER,  label: 'Manager' },
  { value: ROLES.CAPTAIN,  label: 'Captain' },
  { value: ROLES.ADMIN,    label: 'Admin' },
];

export function AdminSwitcher({ realUser, override, onChange, repsForOffice = [] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Only render for admins
  if (realUser?.role !== ROLES.ADMIN) return null;

  const currentOffice = override?.office || realUser.office;
  const currentRole   = override?.role   || realUser.role;
  const currentRep    = override?.repName || null;

  const isOverridden = !!override && (
    override.office !== realUser.office ||
    override.role   !== realUser.role   ||
    override.repName
  );

  function setOffice(office) {
    onChange({
      ...override,
      office:    office.name,
      legalName: office.legalName,
      repName:   null, // reset rep when office changes
    });
  }

  function setRole(role) {
    onChange({
      ...override,
      role,
      repName: role === ROLES.REP || role === ROLES.A_PLAYER ?
        (override?.repName || null) : null,
    });
  }

  function setRep(repName) {
    onChange({ ...override, repName });
  }

  function reset() {
    onChange(null);
    setOpen(false);
  }

  // Show rep sub-dropdown only when impersonating rep or a_player
  const showRepPicker = currentRole === ROLES.REP || currentRole === ROLES.A_PLAYER;

  return (
    <div ref={ref} className="admin-switcher">
      <button
        className={`admin-switcher-pill ${isOverridden ? 'overridden' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <span className="admin-switcher-dot" />
        <span className="admin-switcher-label">
          {currentOffice} · {ROLE_OPTIONS.find(r => r.value === currentRole)?.label}
          {currentRep && ` · ${currentRep.split(' ')[0]}`}
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" style={{ marginLeft: 4, opacity: 0.6 }}>
          <path d="M2 4 L5 7 L8 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="admin-switcher-panel">
          <div className="admin-switcher-header">Admin Controls</div>

          <div className="admin-switcher-grid">
            {/* ── Office column ──────────────────────────── */}
            <div className="admin-switcher-col">
              <div className="admin-switcher-coltitle">Office</div>
              {OFFICES.map(office => (
                <button
                  key={office.name}
                  className={`admin-switcher-option ${currentOffice === office.name ? 'active' : ''}`}
                  onClick={() => setOffice(office)}
                >
                  {office.name}
                </button>
              ))}
            </div>

            {/* ── Role column ────────────────────────────── */}
            <div className="admin-switcher-col">
              <div className="admin-switcher-coltitle">View As</div>
              {ROLE_OPTIONS.map(role => (
                <button
                  key={role.value}
                  className={`admin-switcher-option ${currentRole === role.value ? 'active' : ''}`}
                  onClick={() => setRole(role.value)}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Rep sub-picker (only for rep / a_player) ── */}
          {showRepPicker && (
            <div className="admin-switcher-rep-section">
              <div className="admin-switcher-coltitle">
                {currentRole === ROLES.A_PLAYER ? 'A-Player' : 'Rep'}
              </div>
              {repsForOffice.length === 0 ? (
                <div className="admin-switcher-empty">
                  Loading reps for {currentOffice}...
                </div>
              ) : (
                <select
                  className="admin-switcher-select"
                  value={currentRep || ''}
                  onChange={(e) => setRep(e.target.value || null)}
                >
                  <option value="">— Select {currentRole === ROLES.A_PLAYER ? 'A-Player' : 'Rep'} —</option>
                  {repsForOffice
                    .filter(r => currentRole === ROLES.A_PLAYER ? r.role === ROLES.A_PLAYER : r.role === ROLES.REP)
                    .map(rep => (
                      <option key={rep.email} value={rep.name}>{rep.name}</option>
                    ))}
                </select>
              )}
            </div>
          )}

          {/* ── Reset link ─────────────────────────────── */}
          {isOverridden && (
            <button className="admin-switcher-reset" onClick={reset}>
              ↺ Reset to my admin profile
            </button>
          )}
        </div>
      )}
    </div>
  );
}
