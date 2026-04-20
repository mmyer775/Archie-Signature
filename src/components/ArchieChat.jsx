// ============================================================
// ArchieChat.jsx — Anthropic API call update
//
// This is the ONLY part of ArchieChat.jsx that needs to change.
// Find the section where you currently call the Anthropic API
// (via /api/chat proxy or direct) and replace it with this pattern.
//
// The key changes:
//   1. Call /api/chat (Netlify function)
//   2. No API key in the frontend
//   3. Send the same body format as before — function passes it through
// ============================================================

// ── BEFORE (what you probably have now) ────────────────────────────
/*
const response = await fetch('/api/chat', {
  method:  'POST',
  headers: {
    'Content-Type':      'application/json',
    'x-api-key':         import.meta.env.VITE_ANTHROPIC_API_KEY,  // ← exposed
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model:      'claude-sonnet-4-5',
    max_tokens: 1024,
    system:     systemPrompt,
    messages:   conversationHistory,
  }),
});
*/


// ── AFTER (what it should be) ──────────────────────────────────────

import { CONFIG } from '../config';

async function callArchie(systemPrompt, conversationHistory) {
  const response = await fetch(CONFIG.chatEndpoint, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    // ↑ No x-api-key, no anthropic-version — the Netlify function adds those
    body: JSON.stringify({
      model:      'claude-sonnet-4-5',
      max_tokens: 1024,
      system:     systemPrompt,
      messages:   conversationHistory,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Archie API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}


// ── vite.config.js — dev proxy update ─────────────────────────────
// If you have a dev proxy for /api/chat that currently points to
// https://api.anthropic.com, you have two options:
//
// Option 1 (recommended): Use Netlify CLI for local dev
//   - Install: npm install -g netlify-cli
//   - Run: netlify dev (instead of npm run dev)
//   - This runs Vite + Netlify functions together, so /api/chat
//     hits your real function locally with the local env
//   - Put ANTHROPIC_API_KEY in a .env.local at the repo root (gitignored)
//
// Option 2: Keep Vite's dev proxy, pointing to Anthropic
//   - Works for local dev but bypasses the function
//   - In vite.config.js, keep:
//       server: {
//         proxy: {
//           '/api/chat': {
//             target: 'https://api.anthropic.com',
//             changeOrigin: true,
//             rewrite: path => path.replace(/^\/api\/chat/, '/v1/messages'),
//             configure: (proxy) => {
//               proxy.on('proxyReq', (proxyReq) => {
//                 proxyReq.setHeader('x-api-key', process.env.ANTHROPIC_API_KEY);
//                 proxyReq.setHeader('anthropic-version', '2023-06-01');
//               });
//             },
//           },
//         },
//       }
//   - Put ANTHROPIC_API_KEY (no VITE_) in .env.local
//
// Either way: remove VITE_ANTHROPIC_API_KEY from .env — it should no
// longer exist anywhere the frontend can see.