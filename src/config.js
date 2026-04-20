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