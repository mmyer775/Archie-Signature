// ============================================================
// Netlify Function: /api/chat
// Proxies Anthropic API calls so the API key stays server-side.
//
// DEPLOYMENT:
//   1. Place this file at: netlify/functions/chat.js (from your repo root)
//   2. In Netlify dashboard → Site settings → Environment variables:
//        ANTHROPIC_API_KEY = <your new key>  (server-side, NOT prefixed with VITE_)
//   3. In your frontend, call fetch('/api/chat', {...}) instead of Anthropic directly
//   4. Delete VITE_ANTHROPIC_API_KEY from .env
//   5. Update vite.config.js to remove the dev proxy (or keep it pointing here for dev)
//
// LOCAL DEV:
//   - Install Netlify CLI: npm install -g netlify-cli
//   - Run: netlify dev   (serves Vite + functions together on one port)
//   - OR: keep your vite.config.js dev proxy pointing to Anthropic for local dev,
//     since the function only runs in production / under netlify dev
// ============================================================

export async function handler(event) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not configured in Netlify env');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server not configured' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();

    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: responseText,
    };
  } catch (err) {
    console.error('Anthropic proxy error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Upstream error' }),
    };
  }
}