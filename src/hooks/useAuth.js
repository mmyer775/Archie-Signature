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

async function buildTeam(teamNames, userEmail) {
  if (!teamNames || teamNames.length === 0) return [];

  const today        = new Date().toLocaleDateString('en-US');
  const { mon, sun } = getWeekBounds();

  // Fetch numbers and orders in parallel via Apps Script
  let allNumbers = [];
  let allOrders  = [];
  try {
    [allNumbers, allOrders] = await Promise.all([
      fetchNumbers(userEmail),
      fetchOrders(userEmail),
    ]);
  } catch (e) {
    console.warn('Could not load team data:', e.message);
  }

  return teamNames.map((name, i) => {
    const normName = name.toLowerCase().trim();

    // ── Daily numbers ─────────────────────────────────────────
    const todayRow = allNumbers.find(
      n => (n.repName || '').toLowerCase().trim() === normName && n.date === today
    );

    // ── Streak (consecutive days with submissions) ────────────
    const repRows = allNumbers
      .filter(n => (n.repName || '').toLowerCase().trim() === normName)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    let streak = 0;
    const check = new Date();
    check.setHours(0, 0, 0, 0);
    for (let d = 0; d < 30; d++) {
      const dateStr = check.toLocaleDateString('en-US');
      if (repRows.find(r => r.date === dateStr)) {
        streak++;
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }

    // ── Weekly orders ────────────────────────────────────────
    const weekOrders = allOrders.filter(o => {
      if ((o.repName || '').toLowerCase().trim() !== normName) return false;
      const d = new Date(o.orderDate);
      return !isNaN(d) && d >= mon && d <= sun;
    });

    const weekUniqueOrders = [...new Set(weekOrders.map(o => o.apexId).filter(Boolean))].length;
    const weekLines        = weekOrders.reduce((s, o) => s + (Number(o.lines) || 0), 0);

    return {
      id:           i + 1,
      name,
      houses:       todayRow?.houses      || 0,
      talkTos:      todayRow?.talkTos     || 0,
      saras:        todayRow?.saras       || 0,
      sales:        todayRow?.closedSales || 0,
      submitted:    !!todayRow,
      streak,
      weekOrders:   weekUniqueOrders,
      weekLines,
    };
  });
}

export function useAuth() {
  const [status, setStatus] = useState('idle');
  const [user,   setUser]   = useState(null);
  const [error,  setError]  = useState(null);

  // Restore session on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        const session = JSON.parse(saved);
        const age = Date.now() - session.timestamp;
        if (age < 8 * 60 * 60 * 1000) {
          setUser(session.user);
          setStatus('authenticated');
          return;
        }
      } catch (e) {
        sessionStorage.removeItem(SESSION_KEY);
      }
    }
    setStatus('idle');
  }, []);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setStatus('loading');
      setError(null);

      try {
        // ── Step 1: Get verified email from Google ──────────────────
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });
        const userInfo = await userInfoRes.json();
        if (!userInfo.email) throw new Error('Could not retrieve email from Google.');

        // ── Step 2: Look up user in this office's ROSTER (via Apps Script) ──
        const rosterEntry = await lookupUserInRoster(userInfo.email);

        if (!rosterEntry) {
          setStatus('denied');
          return;
        }

        const role  = rosterEntry.role;
        const email = rosterEntry.email;

        // ── Step 3: Build team list for managers / a_players ────────
        let teamNames = [];
        if (role === 'a_player') {
          teamNames = rosterEntry.team
            ? rosterEntry.team.split(',').map(n => n.trim()).filter(Boolean)
            : [];
          if (rosterEntry.name && !teamNames.includes(rosterEntry.name)) {
            teamNames.unshift(rosterEntry.name);
          }
        } else if (['manager', 'captain', 'admin'].includes(role)) {
  try {
    const allReps = await fetchRoster(email);
    teamNames = allReps
      .filter(r =>
        (r.office || '').toLowerCase() === (rosterEntry.office || '').toLowerCase() &&
        r.status === 'active' &&
        ['rep', 'a_player', 'manager'].includes(r.role)
      )
      .map(r => r.name)
      .filter(Boolean);
  } catch (e) {
    console.warn('Could not load roster for manager:', e.message);
  }
}

        // ── Step 4: Build team stats ────────────────────────────────
        let team = [];
        if (teamNames.length > 0) {
          team = await buildTeam(teamNames, email);
        }

        // ── Step 5: Persist session ─────────────────────────────────
        // NOTE: We no longer store accessToken — the frontend never uses it
        // to call Sheets directly. We store the verified email, which is
        // what sheets.js sends to the Apps Script for auth on every call.
        const sessionUser = {
          ...rosterEntry,
          team,
          picture: userInfo.picture || null,
        };

        const session = { user: sessionUser, timestamp: Date.now() };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

        setUser(sessionUser);
        setStatus('authenticated');

      } catch (err) {
        console.error('Auth error:', err);
        setError(err.message || 'Something went wrong. Please try again.');
        setStatus('error');
      }
    },
    onError: (err) => {
      console.error('Google OAuth error:', err);
      setError('Google sign-in failed. Please try again.');
      setStatus('error');
    },
    // NO Sheets scope — only identity scopes.
    // This eliminates the "Google hasn't verified this app" warning
    // once you remove the Sheets scope from the OAuth consent screen.
    scope: 'email profile openid',
  });

  const signOut = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
    setStatus('idle');
    setError(null);
  }, []);

  return {
    status,
    user,
    error,
    signIn:          googleLogin,
    signOut,
    isLoading:       status === 'loading',
    isAuthenticated: status === 'authenticated',
    isDenied:        status === 'denied',
  };
}
