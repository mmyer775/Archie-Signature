// ============================================================
// CONFIG (v2.0)
// Frontend no longer knows about individual sheet IDs.
// Everything flows through the Apps Script web app.
// ============================================================

export const CONFIG = {
  googleClientId:  import.meta.env.VITE_GOOGLE_CLIENT_ID,
  office: {
    name:      import.meta.env.VITE_OFFICE_NAME,
    legalName: import.meta.env.VITE_OFFICE_LEGAL_NAME,
  },
  appsScriptUrl:   import.meta.env.VITE_APPS_SCRIPT_URL,

  // Chat endpoint — points to Netlify function in prod, local proxy in dev
  chatEndpoint: '/api/chat',
};

// ── Config validation ────────────────────────────────────────
// Throws at app boot if required env vars are missing
export function validateConfig() {
  const missing = [];
  if (!CONFIG.googleClientId)  missing.push('VITE_GOOGLE_CLIENT_ID');
  if (!CONFIG.office.name)     missing.push('VITE_OFFICE_NAME');
  if (!CONFIG.appsScriptUrl)   missing.push('VITE_APPS_SCRIPT_URL');

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      `Check your .env file.`
    );
  }
}

// ── Roles ────────────────────────────────────────────────────
// Canonical role identifiers. Must match values in the ROSTER sheet.

export const ROLES = {
  REP:      'rep',
  A_PLAYER: 'a_player',
  MANAGER:  'manager',
  CAPTAIN:  'captain',
  ADMIN:    'admin',
};


// ── Tab definitions ──────────────────────────────────────────
// Shape: { id, label, icon }. Rendered by Layout.jsx.
// NOTE: `struggles` tab id is preserved for routing continuity;
// only the user-facing label and icon change.

export const REP_TABS = [
  { id: 'home',      label: 'Home',     icon: '🏠' },
  { id: 'orders',    label: 'Orders',   icon: '📦' },
  { id: 'paycheck',  label: 'Paycheck', icon: '💰' },
  { id: 'myday',     label: 'My Day',   icon: '📋' },
  { id: 'archie',    label: 'Archie',   icon: '🤖' },
  { id: 'knowledge', label: 'Playbook', icon: '📖' },
];

export const A_PLAYER_TABS = [
  { id: 'home',      label: 'Home',     icon: '🏠' },
  { id: 'orders',    label: 'Orders',   icon: '📦' },
  { id: 'paycheck',  label: 'Pay',      icon: '💰' },
  { id: 'struggles', label: 'Feedback', icon: '💬' },
  { id: 'myday',     label: 'My Day',   icon: '📋' },
  { id: 'archie',    label: 'Archie',   icon: '🤖' },
];

export const MANAGER_TABS = [
  { id: 'home',      label: 'Home',       icon: '🏠' },
  { id: 'dashboard', label: 'Dashboard',  icon: '📊' },
  { id: 'orders',    label: 'Orders',     icon: '📦' },
  { id: 'paycheck',  label: 'Pay',        icon: '💰' },
  { id: 'struggles', label: 'Feedback',   icon: '💬' },
  { id: 'reports',   label: 'Reports',    icon: '📈' },
  { id: 'roster',    label: 'Roster',     icon: '👥' },
];

export const CAPTAIN_TABS = [
  { id: 'home',    label: 'Home',    icon: '🏠' },
  { id: 'reports', label: 'Reports', icon: '📈' },
];