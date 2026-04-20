// ============================================================
// ARCHIE API CLIENT (v2.0)
// All data goes through the Apps Script web app.
// No direct Google Sheets API calls — removes the need for
// Sheets scope in OAuth, and keeps each office isolated.
// ============================================================

import { CONFIG } from '../config';

const APPS_SCRIPT_URL = CONFIG.appsScriptUrl;

// ── Core request helper ──────────────────────────────────────────────────────
// Every call goes through POST to the Apps Script web app.
// User email is required for auth on every call except lookupUser.
async function callApi(action, payload = {}, userEmail = null) {
  if (!APPS_SCRIPT_URL) {
    throw new Error('VITE_APPS_SCRIPT_URL not configured');
  }

  const body = { action, ...payload };
  if (userEmail) body.userEmail = userEmail.toLowerCase().trim();

  let response;
  try {
    response = await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      // NOTE: Apps Script web apps don't handle preflight CORS for JSON Content-Type.
      // Using text/plain avoids the preflight; Apps Script parses the body regardless.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body:    JSON.stringify(body),
      redirect: 'follow',
    });
  } catch (err) {
    throw new Error(`Network error reaching Archie API: ${err.message}`);
  }

  if (!response.ok) {
    throw new Error(`Archie API HTTP ${response.status}`);
  }

  let result;
  try {
    result = await response.json();
  } catch (err) {
    throw new Error('Archie API returned non-JSON response');
  }

  if (!result.ok) {
    throw new Error(result.error || 'Archie API error');
  }

  return result.data;
}


// ── ROSTER ───────────────────────────────────────────────────────────────────

export async function lookupUserInRoster(email) {
  // No userEmail in auth header — the lookup IS the auth check
  return callApi('lookupUser', { userEmail: email });
}

export async function fetchRoster(userEmail) {
  return callApi('fetchRoster', {}, userEmail);
}

export async function addRepToRoster(userEmail, rep) {
  return callApi('addRep', { rep }, userEmail);
}

export async function updateRosterRow(userEmail, rowIndex, rep) {
  return callApi('updateRep', { rowIndex, rep }, userEmail);
}


// ── ORDERS ───────────────────────────────────────────────────────────────────

export async function fetchOrders(userEmail, repName = null) {
  const data = await callApi('fetchOrders', { repName }, userEmail);
  return data || [];
}


// ── PAYCHECK ─────────────────────────────────────────────────────────────────

export async function fetchPaycheck(userEmail, repName = null) {
  const data = await callApi('fetchPaycheck', { repName }, userEmail);
  return data || [];
}


// ── NUMBERS ──────────────────────────────────────────────────────────────────

export async function fetchNumbers(userEmail, repName = null) {
  const data = await callApi('fetchNumbers', { repName }, userEmail);
  return data || [];
}

export async function submitNumbers(userEmail, repData) {
  return callApi('submitNumbers', { data: repData }, userEmail);
}


// ── STRUGGLES ────────────────────────────────────────────────────────────────

export async function fetchStruggles(userEmail, repName = null) {
  const data = await callApi('fetchStruggles', { repName }, userEmail);
  return data || [];
}

export async function logStruggle(userEmail, entry) {
  return callApi('logStruggle', { entry }, userEmail);
}


// ── METRICS ──────────────────────────────────────────────────────────────────

export async function fetchMetrics(userEmail) {
  const data = await callApi('fetchMetrics', {}, userEmail);
  return data || { office: null, reps: [] };
}


// ── MASTER TRACKER — DD DATA ─────────────────────────────────────────────────

export async function fetchDDData(userEmail, repName = null) {
  const data = await callApi('fetchDDData', { repName }, userEmail);
  return data || [];
}


// ── MASTER TRACKER — ORDER DETAIL ────────────────────────────────────────────

export async function fetchOrderDetail(userEmail, { customer, repName, orderDate }) {
  const data = await callApi('fetchOrderDetail', { customer, repName, orderDate }, userEmail);
  return data || [];
}