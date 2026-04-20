// ============================================================
// ARCHIE CONFIG
// ============================================================

export const CONFIG = {
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  officeName:     import.meta.env.VITE_OFFICE_NAME || 'Office',
  officeLegalName: import.meta.env.VITE_OFFICE_LEGAL_NAME,
  anthropicKey:   import.meta.env.VITE_ANTHROPIC_API_KEY,
  sheets: {
    roster:    import.meta.env.VITE_ROSTER_SHEET_ID,
    orders:    import.meta.env.VITE_ORDERS_SHEET_ID,
    paycheck:  import.meta.env.VITE_PAYCHECK_SHEET_ID,
    numbers:   import.meta.env.VITE_NUMBERS_SHEET_ID,
    struggles: import.meta.env.VITE_STRUGGLES_SHEET_ID,
    metrics:   import.meta.env.VITE_METRICS_SHEET_ID,
    master:    import.meta.env.VITE_MASTER_TRACKER_ID,
    
  },
};

export const ROLES = {
  ADMIN:    'admin',
  CAPTAIN:  'captain',
  MANAGER:  'manager',
  A_PLAYER: 'a_player',
  REP:      'rep',
};

export const REP_TABS = [
  { id: 'home',      label: 'Home',     icon: '🏠' },
  { id: 'orders',    label: 'Orders',   icon: '📦' },
  { id: 'paycheck',  label: 'Pay',      icon: '💰' },
  { id: 'myday',     label: 'My Day',   icon: '📊' },
  { id: 'archie',    label: 'Archie',   icon: '🤖' },
  { id: 'knowledge', label: 'Playbook', icon: '📚' },
];

export const A_PLAYER_TABS = [
  { id: 'home',     label: 'Home',   icon: '🏠' },
  { id: 'orders',   label: 'Orders', icon: '📦' },
  { id: 'paycheck', label: 'Pay',    icon: '💰' },
  { id: 'struggles', label: 'Struggles', icon: '💬' },
  { id: 'myday',    label: 'My Day', icon: '📊' },
  { id: 'archie',   label: 'Archie', icon: '🤖' },
];

export const MANAGER_TABS = [
  { id: 'home',      label: 'Home',      icon: '🏠' },
  { id: 'dashboard', label: 'Office',    icon: '📊' },
  { id: 'orders',    label: 'Orders',    icon: '📦' },
  { id: 'paycheck',  label: 'Pay',       icon: '💰' },
  { id: 'struggles', label: 'Struggles', icon: '💬' },
  { id: 'reports',   label: 'Reports',   icon: '📧' },
  { id: 'roster',    label: 'Roster',    icon: '👥' },
];

export const CAPTAIN_TABS = [
  { id: 'home',    label: 'Overview', icon: '🏠' },
  { id: 'reports', label: 'Reports',  icon: '📧' },
];
