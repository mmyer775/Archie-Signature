import { useState, useEffect }      from 'react';
import { fetchNumbers, fetchLeaderboard } from '../api/sheets';
import { MetricsCard, useMetrics }  from './MetricsCard';

const ALL_BADGES = [
  { id: 'first_sale',    icon: '🏆', label: 'First Close',   desc: 'Close your very first sale',                   color: '#C4748A', category: 'Milestone'   },
  { id: 'ten_sales',     icon: '💎', label: 'Ten Up',        desc: 'Close 10 total sales',                         color: '#B8A0D4', category: 'Milestone'   },
  { id: 'fifty_sales',   icon: '👑', label: 'Half Century',  desc: 'Close 50 total sales',                         color: '#E8A0B0', category: 'Milestone'   },
  { id: 'hundred_club',  icon: '🚪', label: '100 Club',      desc: 'Knock 100+ doors in a single day',             color: '#C4748A', category: 'Daily Grind' },
  { id: 'talk_machine',  icon: '🗣️', label: 'Talk Machine',  desc: "Hit 45+ talk-to's in a single day",            color: '#7B8FCE', category: 'Daily Grind' },
  { id: 'sara_king',     icon: '📋', label: 'SARA King',     desc: 'Complete 8+ SARAs in a single day',            color: '#E8A0B0', category: 'Daily Grind' },
  { id: 'on_fire',       icon: '🔥', label: 'On Fire',       desc: '3+ sales in a single day',                    color: '#C4748A', category: 'Daily Grind' },
  { id: 'week_warrior',  icon: '📅', label: 'Week Warrior',  desc: 'Submit your numbers 5 days in a row',          color: '#7B8FCE', category: 'Consistency' },
  { id: 'quota_crusher', icon: '💜', label: 'Quota Crusher', desc: 'Hit daily sales target 5 days straight',       color: '#B8A0D4', category: 'Consistency' },
  { id: 'month_strong',  icon: '🗓️', label: 'Month Strong',  desc: 'Submit numbers every working day for a month', color: '#B8A0D4', category: 'Consistency' },
  { id: 'closer',        icon: '✅', label: 'The Closer',    desc: 'Maintain 50%+ close rate for a full week',     color: '#A0C4B8', category: 'Conversion'  },
  { id: 'quote_machine', icon: '⚡', label: 'Quote Machine', desc: 'Hit 33%+ quote rate 3 days in a row',          color: '#B8A0D4', category: 'Conversion'  },
  { id: 'sara_streak',   icon: '🎯', label: 'SARA Streak',   desc: 'Hit SARA target 5 days in a row',              color: '#A0C4B8', category: 'Conversion'  },
  { id: 'top_gun',       icon: '🚀', label: 'Top Gun',       desc: 'Rank #1 in sales for the week',                color: '#E8A0B0', category: 'Elite'       },
  { id: 'legend',        icon: '🌟', label: 'Legend',        desc: 'Earn all 14 other badges',                     color: '#B8A0D4', category: 'Elite'       },
];

// Day labels
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// Map a date string to a day label
function toDayLabel(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
}

// Build a 7-entry week array from NUMBERS rows (this week Mon–Sun)
function buildWeek(rows) {
  const now       = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const monday    = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0,0,0,0);

  return DAYS.map((label, i) => {
    const target = new Date(monday);
    target.setDate(monday.getDate() + i);
    const dateStr = target.toLocaleDateString('en-US');

    const row = rows.find(r => {
      const d = new Date(r.date);
      return d.toLocaleDateString('en-US') === dateStr;
    });

    return {
      day:        label,
      houses:     row?.houses      || 0,
      talkTos:    row?.talkTos     || 0,
      saras:      row?.saras       || 0,
      sales:      row?.closedSales || 0,
    };
  });
}

// Compute streak: consecutive days (Mon–Sat) with at least one house logged
function computeStreak(rows) {
  const logged = new Set(rows.filter(r => r.houses > 0).map(r => {
    const d = new Date(r.date);
    d.setHours(0,0,0,0);
    return d.getTime();
  }));

  const now  = new Date(); now.setHours(0,0,0,0);
  let streak = 0;
  let cursor = new Date(now);

  for (let i = 0; i < 60; i++) {
    const isSun = cursor.getDay() === 0;
    if (!isSun && logged.has(cursor.getTime())) {
      streak++;
    } else if (!isSun) {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function motiveLine(streak) {
  if (streak === 0) return "Start tracking today. You can't improve what you don't measure.";
  if (streak === 1) return 'Day 1 logged. Awareness is the first step to getting better.';
  if (streak < 4)   return `${streak} days tracked. The data is already working for you.`;
  if (streak < 7)   return `${streak} days straight. Reps who track consistently close more — fact.`;
  if (streak < 14)  return `${streak}-day streak. Your numbers don't lie — and neither does your growth.`;
  return `${streak} days logged. Elite reps track everything. Now you see why.`;
}

// Order-count color tiers — match ManagerHome's weekly leaderboard styling.
// 0–3: baseline blue, no glow · 4: cyan · 5–7: green · 8: yellow · 9+: hot pink
function orderTierStyle(orders) {
  const n = Number(orders) || 0;
  if (n >= 9)  return { color: '#FF00E5', textShadow: '0 0 8px #FF00E5, 0 0 2px #FF00E5' };
  if (n === 8) return { color: '#FFEA00', textShadow: '0 0 8px #FFEA00, 0 0 2px #FFEA00' };
  if (n >= 5)  return { color: '#39FF14', textShadow: '0 0 8px #39FF14, 0 0 2px #39FF14' };
  if (n === 4) return { color: '#00F0FF', textShadow: '0 0 8px #00F0FF, 0 0 2px #00F0FF' };
  return { color: '#7B8FCE', textShadow: 'none' };
}

export function RepHome({ user }) {
  const firstName  = (user?.name || 'Rep').split(' ')[0];
  const earnedIds  = new Set(user?.earnedBadgeIds ?? []);

  const [weeklyData, setWeeklyData] = useState(Array(7).fill(null).map((_, i) => ({ day: DAYS[i], houses: 0, talkTos: 0, saras: 0, sales: 0 })));
  const [streak,     setStreak]     = useState(0);
  const [selDay,     setSelDay]     = useState(null);
  const [claimed,    setClaimed]    = useState(user?.grandPrizeClaimed ?? false);
  const [claiming,   setClaiming]   = useState(false);
  const [leaderboard, setLeaderboard] = useState({ top: [], myRank: null, myWeekLines: 0, myWeekOrders: 0, totalActive: 0 });

  const today      = new Date().toLocaleDateString('en-US', { weekday: 'short' });

  // Load metrics
  const { myMetrics, office: officeMetrics, loading: metricsLoading } = useMetrics(user);

  // Load live numbers from NUMBERS sheet
  useEffect(() => {
    async function load() {
      if (!user?.email) return;
      try {
        const rows = await fetchNumbers(user.email, user.name);
        setWeeklyData(buildWeek(rows));
        setStreak(computeStreak(rows));
      } catch (err) {
        console.warn('Could not load numbers:', err.message);
      }
    }
    load();
  }, [user?.email, user?.name]);

  // Load weekly leaderboard (top 5 + caller's rank)
  useEffect(() => {
    async function loadLb() {
      if (!user?.email) return;
      try {
        const lb = await fetchLeaderboard(user.email);
        setLeaderboard(lb);
      } catch (err) {
        console.warn('Could not load leaderboard:', err.message);
      }
    }
    loadLb();
  }, [user?.email]);

  const totH  = weeklyData.reduce((a, d) => a + d.houses,  0);
  const totT  = weeklyData.reduce((a, d) => a + d.talkTos, 0);
  const totS  = weeklyData.reduce((a, d) => a + d.saras,   0);
  const totSl = weeklyData.reduce((a, d) => a + d.sales,   0);
  const days  = weeklyData.filter(d => d.houses > 0).length;
  const maxH  = Math.max(...weeklyData.map(d => d.houses), 1);

  const earned   = earnedIds.size;
  const total    = ALL_BADGES.length;
  const allDone  = earned >= total;
  const pct      = Math.round((earned / total) * 100);
  const left     = total - earned;
  const earnedBadges = ALL_BADGES.filter(b => earnedIds.has(b.id));

  return (
    <div className="fade-up">
      {/* Hero */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: 'linear-gradient(135deg,#7B5EA7,#C4748A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: '#EDE8F5', flexShrink: 0 }}>
            {firstName[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{greeting()},</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 30, color: 'var(--text)', lineHeight: 1.1 }}>{firstName}.</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: '#B8A0D4', fontStyle: 'italic', paddingLeft: 64, lineHeight: 1.5 }}>{motiveLine(streak)}</div>
      </div>

      {/* Grand Prize */}
      <div style={{ background: 'var(--bg-surface)', border: `1px solid ${allDone ? '#B8A0D4' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', padding: 18, marginBottom: 12, transition: 'border-color 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-sm)', background: 'var(--bg-raised)', border: '1px solid var(--border-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 30, filter: allDone ? 'none' : 'grayscale(1)', opacity: allDone ? 1 : 0.35 }}>⌚</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 4 }}>· EARN ALL BADGES TO UNLOCK ·</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 17, color: allDone ? 'var(--text)' : 'var(--text-muted)', marginBottom: 4 }}>Apple Watch Series 11</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {allDone ? (claimed ? 'Prize claimed — well earned.' : 'You did it. Claim your reward below.') : `${left} badge${left !== 1 ? 's' : ''} to go`}
            </div>
          </div>
        </div>
        <div style={{ position: 'relative', height: 8, background: 'var(--bg-raised)', borderRadius: 100, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ height: '100%', borderRadius: 100, width: `${pct}%`, background: allDone ? 'linear-gradient(90deg,#7B8FCE,#B8A0D4,#C4748A)' : 'linear-gradient(90deg,#7B5EA7,#9B7EC8)', transition: 'width 0.6s ease' }} />
          <div style={{ position: 'absolute', right: 0, top: -18, fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>{earned} / {total} badges</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
          {ALL_BADGES.map(b => (
            <div key={b.id} style={{ width: 12, height: 12, borderRadius: '50%', border: `1px solid ${earnedIds.has(b.id) ? b.color + '80' : 'var(--border-mid)'}`, background: earnedIds.has(b.id) ? b.color : 'var(--bg-overlay)', transform: earnedIds.has(b.id) ? 'scale(1.25)' : 'scale(1)', transition: 'all 0.2s' }} />
          ))}
        </div>
        {allDone && !claimed && (
          <button style={{ width: '100%', padding: 13, background: 'linear-gradient(135deg,#7B5EA7,#C4748A)', color: '#EDE8F5', border: 'none', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, cursor: 'pointer', opacity: claiming ? 0.65 : 1 }}
            onClick={() => { setClaiming(true); setTimeout(() => { setClaimed(true); setClaiming(false); }, 1400); }} disabled={claiming}>
            {claiming ? 'Submitting...' : '🎁 Claim Your Prize'}
          </button>
        )}
        {claimed && <div style={{ textAlign: 'center', padding: 12, background: '#A0C4B820', border: '1px solid #A0C4B840', borderRadius: 'var(--radius-sm)', color: '#A0C4B8', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>✓ Prize claimed — your manager has been notified.</div>}
        {!allDone && <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: '6px 0 2px' }}>Keep earning badges — each one gets you closer.</div>}
      </div>

      {/* Weekly rank + top 5 leaderboard */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14, color: 'var(--text)' }}>My Week</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Mon – Today</div>
          </div>
          {leaderboard.myRank ? (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color: leaderboard.myRank === 1 ? '#E8C87A' : leaderboard.myRank <= 3 ? '#B8A0D4' : '#7B8FCE', lineHeight: 1 }}>
                #{leaderboard.myRank}
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: leaderboard.myRank && leaderboard.myRank <= 5 ? 16 : 0 }}>
          <div style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-sm)', border: '1px solid #A0C4B830' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color: '#A0C4B8', lineHeight: 1 }}>{leaderboard.myWeekLines || 0}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lines</div>
          </div>
          <div style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-sm)', border: '1px solid ' + orderTierStyle(leaderboard.myWeekOrders).color + '30' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, lineHeight: 1, ...orderTierStyle(leaderboard.myWeekOrders) }}>{leaderboard.myWeekOrders || 0}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Orders</div>
          </div>
        </div>

        {/* Top 5 list — visible only if rep is in the top 5 */}
        {leaderboard.myRank && leaderboard.myRank <= 5 && leaderboard.top.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Top 5 This Week</div>
            {(() => {
              const topLines = leaderboard.top[0]?.weekLines || 1;
              return leaderboard.top.map((rep, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                const pct   = topLines > 0 ? Math.round(((rep.weekLines || 0) / topLines) * 100) : 0;
                const isMe  = rep.name.toLowerCase().trim() === (user?.name || '').toLowerCase().trim();
                return (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ width: 20, textAlign: 'center', fontSize: medal ? 14 : 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
                        {medal || `#${i + 1}`}
                      </div>
                      <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: isMe ? 900 : 800, fontSize: 13, color: isMe ? '#B8A0D4' : 'var(--text)' }}>
                        {isMe ? `${rep.name} (you)` : rep.name}
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14, color: '#A0C4B8', lineHeight: 1 }}>{rep.weekLines || 0}</div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>lines</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14, lineHeight: 1, ...orderTierStyle(rep.weekOrders) }}>{rep.weekOrders || 0}</div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>orders</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ marginLeft: 28, height: 4, background: 'var(--bg-overlay)', borderRadius: 100, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: i === 0 ? '#E8C87A' : i === 1 ? '#B8A0D4' : i === 2 ? '#7B8FCE' : 'var(--border-mid)', borderRadius: 100, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                );
              });
            })()}
          </>
        )}

        {/* Not in top 5 — motivational nudge instead */}
        {leaderboard.myRank && leaderboard.myRank > 5 && leaderboard.top.length > 0 && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--bg-overlay)', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 700, lineHeight: 1.5 }}>
              <span style={{ color: '#A0C4B8', fontWeight: 800 }}>{Math.max((leaderboard.top[4]?.weekLines || 0) - (leaderboard.myWeekLines || 0) + 1, 1)} lines</span> to break into the top 5.
            </div>
          </div>
        )}
      </div>

      {/* Metrics */}
      {!metricsLoading && (myMetrics || officeMetrics) && (
        <>
          <div className="section-header" style={{ marginTop: 4 }}>
            <div className="section-title" style={{ fontSize: 18 }}>My Metrics</div>
            <div className="section-subtitle">{myMetrics ? 'activation & churn' : 'office activation & churn'}</div>
          </div>
          <MetricsCard metrics={myMetrics || officeMetrics} />
        </>
      )}

      {/* Streak */}
      <div className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 40, paddingTop: 2 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 34, color: '#E8A0B0', lineHeight: 1 }}>{streak}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginTop: 2 }}>day{streak !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>Tracking Streak</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.4 }}>Mon–Sat keeps your streak alive. Sundays are optional — but they count if you do.</div>
          <div style={{ display: 'flex', gap: 5 }}>
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => {
              const worked   = weeklyData.find(d => d.day === day)?.houses > 0;
              const isToday  = day === today;
              const isSunday = day === 'Sun';
              return (
                <div key={day} style={{ width: 26, height: 26, borderRadius: 7, background: worked ? '#C4748A30' : 'var(--bg-overlay)', border: `${isSunday && !worked ? '1px dashed #2E2044' : worked ? '1px solid #C4748A60' : isToday ? '1px solid #B8A0D4' : '1px solid var(--border-mid)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', opacity: isSunday && !worked ? 0.4 : 1 }}>{day[0]}</span>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
            Reps who log daily are <span style={{ color: '#E8A0B0', fontWeight: 700 }}>2x more likely</span> to hit their weekly target.
          </div>
        </div>
        <div style={{ fontSize: 26 }}>🔥</div>
      </div>

      {/* This Week */}
      <div className="section-header" style={{ marginTop: 4 }}>
        <div className="section-title" style={{ fontSize: 18 }}>This Week</div>
        <div className="section-subtitle">{days} days logged</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 4 }}>
        {[['Houses', totH, '#C4748A'], ["Talk-to's", totT, '#7B8FCE'], ['SARAs', totS, '#E8A0B0'], ['Sales', totSl, '#A0C4B8']].map(([label, value, color]) => (
          <div key={label} className="card" style={{ textAlign: 'center', padding: '12px 8px', margin: 0, borderColor: color + '40' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="card" style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, marginBottom: 10, position: 'relative' }}>
          {weeklyData.map(day => {
            const p = Math.round((day.houses / maxH) * 100);
            const isToday = day.day === today;
            const sel = selDay === day.day;
            return (
              <div key={day.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', position: 'relative' }} onClick={() => setSelDay(sel ? null : day.day)}>
                {sel && day.houses > 0 && (
                  <div style={{ position: 'absolute', top: -96, left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-base)', border: '1px solid var(--border-mid)', borderRadius: 8, padding: '8px 10px', zIndex: 10, minWidth: 56, whiteSpace: 'nowrap' }}>
                    {[['🚪','#C4748A',day.houses],['🗣️','#7B8FCE',day.talkTos],['📋','#E8A0B0',day.saras],['✅','#A0C4B8',day.sales]].map(([icon, color, val]) => (
                      <div key={icon} style={{ fontSize: 11, color: 'var(--text-mid)', fontWeight: 600, display: 'flex', gap: 6, lineHeight: 1.7 }}><span style={{ color }}>{icon}</span>{val}</div>
                    ))}
                  </div>
                )}
                <div style={{ width: '100%', height: 80, background: 'var(--bg-overlay)', borderRadius: 6, overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{ width: '100%', height: `${p}%`, borderRadius: '6px 6px 0 0', transition: 'height 0.3s ease', background: day.houses === 0 ? 'var(--bg-overlay)' : isToday ? 'linear-gradient(180deg,#B8A0D4,#7B5EA7)' : 'linear-gradient(180deg,#C4748A,#7B3A50)' }} />
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, color: isToday ? '#B8A0D4' : 'var(--text-muted)' }}>{day.day}</div>
                {day.sales > 0 && <div style={{ position: 'absolute', top: -2, right: 2, width: 14, height: 14, borderRadius: '50%', background: '#A0C4B8', fontSize: 8, fontWeight: 800, color: '#0E0A18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{day.sales > 1 ? day.sales : ''}</div>}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          {[['#C4748A','■ Houses'],['#A0C4B8','● Sales day'],['#B8A0D4','■ Today']].map(([color, label]) => (
            <span key={label} style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, display: 'flex', gap: 4, alignItems: 'center' }}><span style={{ color }}>{label.split(' ')[0]}</span>{label.split(' ').slice(1).join(' ')}</span>
          ))}
        </div>
      </div>

      {/* Badges — earned only */}
      <div className="section-header" style={{ marginTop: 8 }}>
        <div className="section-title" style={{ fontSize: 18 }}>My Badges</div>
        <div className="section-subtitle">{earned} earned</div>
      </div>
      {earnedBadges.length === 0
        ? <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.4 }}>🎖️</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--text)', marginBottom: 6 }}>No badges yet</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>Get out there and earn them. Badges unlock as you hit milestones — you'll know one when you see it.</div>
          </div>
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {earnedBadges.map(b => (
              <div key={b.id} className="card" style={{ margin: 0, borderColor: b.color + '50', position: 'relative', padding: 14 }}>
                <div style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: '50%', background: b.color }} />
                <div style={{ fontSize: 26, marginBottom: 4 }}>{b.icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: b.color + 'CC', marginBottom: 3 }}>{b.category}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: b.color, marginBottom: 3 }}>{b.label}</div>
                <div style={{ fontSize: 11, lineHeight: 1.4, color: 'var(--text-muted)', marginBottom: 6 }}>{b.desc}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, color: '#A0C4B8' }}>✓ Earned</div>
              </div>
            ))}
          </div>
      }
    </div>
  );
}
