// ============================================================
// useAdminOverride — Manages admin impersonation state
//
// Returns:
//   - override: { office, legalName, role, repName } | null
//   - setOverride: (next) => void
//   - effectiveUser: real user OR a synthesized user reflecting the override
//
// Cleared on sign-out (parent calls clearOverride()).
// Does NOT persist across sessions (per requirement).
// ============================================================

import { useState, useCallback, useMemo } from 'react';
import { ROLES } from '../config';

const OVERRIDE_KEY = 'archie_admin_override';

export function useAdminOverride(realUser) {
  // Initial state — read from sessionStorage in case of a same-session
  // page reload (NOT persisted across sign-out, which clears storage)
  const [override, setOverrideState] = useState(() => {
    if (realUser?.role !== ROLES.ADMIN) return null;
    try {
      const saved = sessionStorage.getItem(OVERRIDE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setOverride = useCallback((next) => {
    setOverrideState(next);
    if (next) {
      sessionStorage.setItem(OVERRIDE_KEY, JSON.stringify(next));
    } else {
      sessionStorage.removeItem(OVERRIDE_KEY);
    }
  }, []);

  const clearOverride = useCallback(() => {
    setOverrideState(null);
    sessionStorage.removeItem(OVERRIDE_KEY);
  }, []);

  // ── Build effective user ─────────────────────────────────────
  // If no override or not an admin: return realUser unchanged.
  // Otherwise, synthesize a user reflecting the override.
  const effectiveUser = useMemo(() => {
    if (!realUser) return null;
    if (realUser.role !== ROLES.ADMIN || !override) return realUser;

    // Start from real user, apply overrides
    const synthesized = {
      ...realUser,
      // Office override
      office:    override.office    || realUser.office,
      legalName: override.legalName || realUser.legalName,
      // Role override
      role:      override.role      || realUser.role,
      // Flag so views/components can detect impersonation
      _isImpersonating: true,
      _realRole:        realUser.role,
      _realOffice:      realUser.office,
    };

    // If impersonating a specific rep, swap name + email
    if (override.repName) {
      synthesized.name           = override.repName;
      synthesized._impersonating = override.repName;
      // Note: we keep realUser.email so any logging shows the real admin
      // performed the action. The rep's name drives data fetches.
    }

    return synthesized;
  }, [realUser, override]);

  return { override, setOverride, clearOverride, effectiveUser };
}
