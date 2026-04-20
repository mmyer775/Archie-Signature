// ============================================================
// useAuth — Authentication hook (v2.0)
// - Google OAuth for identity only (openid/email/profile — NO Sheets scope)
// - All data access goes through Apps Script web app (via sheets.js)
// - Session stores user's verified email; sheets.js uses it for auth on every call
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useGoogleLogin }                   from '@react-oauth/google';
import {
  lookupUserInRoster,
  fetchRoster,
  fetchNumbers,
  fetchOrders,
} from '../api/sheets';

const SESSION_KEY = 'archie_session';

function getWeekBounds() {
  const now      = new Date();
  const day      = now.getDay();
  const daysBack = day === 0 ? 6 : day - 1;
  const mon      = new Date(now);
  mon.setDate(now.getDate() - daysBack);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return { mon, sun };
}