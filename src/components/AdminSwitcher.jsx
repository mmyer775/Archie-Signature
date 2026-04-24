// ============================================================
// AdminSwitcher — Admin-only office picker
//
// Cleaner redesign:
//   - Single office dropdown (no role column — admins always view as manager)
//   - Purple theme matching Archie's design system
//   - Compact and minimal
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { ROLES } from '../config';

// ── Office list — all 8 offices ────────────────────────────────
const OFFICES = [
  { name: 'Signature'           },
  { name: 'Ascension'           },
  { name: 'Coastal Connections' },
  { name: 'Vendex'              },
  { name: 'Takeoff'             },
  { name: 'First Class'         },
  { name: 'Berhane Management'  },
  { name: 'Envision'            },
];

export function AdminSwitcher({ realUser, override, onChange }) {
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
  const isOverridden  = !!override && override.office !== realUser.office;

  function pickOffice(office) {
    // Always override to manager role so admin views office as manager
    onChange({
      office: office.name,
      role:   ROLES.MANAGER,
    });
    setOpen(false);
  }

  function reset() {
    onChange(null);
    setOpen(false);
  }

  return (
    <div ref={ref} className="admin-switcher">
      <button
        className={`admin-switcher-pill ${isOverridden ? 'overridden' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <span className="admin-switcher-label">{currentOffice}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" style={{ marginLeft: 2, opacity: 0.7 }}>
          <path d="M2 4 L5 7 L8 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="admin-switcher-panel">
          <div className="admin-switcher-header">Switch Office</div>

          <div className="admin-switcher-list">
            {OFFICES.map(office => (
              <button
                key={office.name}
                className={`admin-switcher-option ${currentOffice === office.name ? 'active' : ''}`}
                onClick={() => pickOffice(office)}
              >
                {office.name}
                {currentOffice === office.name && (
                  <span className="admin-switcher-check">✓</span>
                )}
              </button>
            ))}
          </div>

          {isOverridden && (
            <button className="admin-switcher-reset" onClick={reset}>
              ↺ Back to {realUser.office}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
