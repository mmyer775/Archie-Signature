// ============================================================
// PaycheckView — Time-aware pay tab
//
// Sun → Wed 1:59pm  →  "Projected Pay" (ORDERS active Mon–Sun × $110/line)
// Wed 2:00pm → Sat  →  "Real Paycheck" (DD Data tab, col AA)
//
// Rep pay    = amount / 2  (50/50 split)
// Office total = gross amount (no split)
//
// Rep:      own pay + history
// A-Player: their team + office total
// Manager:  Current DD (office gross, expandable rep breakdown)
//           Previous 4 weeks (compact rows)
//           Projected next week (active order count + $230/line)
// ============================================================

import { useState, useEffect } from 'react';
import { fetchOrders, fetchDDData } from '../api/sheets';
import { ROLES }                    from '../config';

const RATE_PER_LINE = 110;
const MANAGER_RATE  = 230;
const DEFAULT_TARGET = 10;
const TARGET_KEY    = 'archie_line_target';
const ACTIVE_DAYS   = 30;

function isRealPaycheckTime() {
  const now      = new Date();
  const day      = now.getDay();
  const afterTwo = now.getHours() >= 14;
  return (day === 3 && afterTwo) || day === 4 || day === 5 || day === 6;
}

function lastMonday() {
  const now      = new Date();
  const day      = now.getDay();
  const daysBack = day === 0 ? 6 : day - 1;
  const mon      = new Date(now);
  mon.setDate(now.getDate() - daysBack);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function lastSunday() {
  const sun = new Date(lastMonday());
  sun.setDate(sun.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return sun;
}

function thisWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function thisWeekEnd() {
  const sun = new Date(thisWeekStart());
  sun.setDate(sun.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return sun;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d) ? null : d;
}

function fmtMoney(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtShort(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function dateFmt(d) {
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
}

function computeProjected(orders, repName = null) {
  const mon = lastMonday();
  const sun = lastSunday();
  const active = orders.filter(o => {
    if (repName && o.repName.toLowerCase() !== repName.toLowerCase()) return false;
    const status = (o.status || '').toLowerCase();
    if (!status.includes('active') && !status.includes('activated')) return false;
    const ad = parseDate(o.activeDate);
    return ad && ad >= mon && ad <= sun;
  });
  const lines = active.reduce((s, o) => s + (Number(o.lines) || 1), 0);
  return { lines, pay: lines * RATE_PER_LINE };
}

function isRepActive(orders, repName) {
  const cutoff = daysAgo(ACTIVE_DAYS);
  return orders.some(o => {
    if (o.repName.toLowerCase() !== repName.toLowerCase()) return false;
    const od = parseDate(o.orderDate);
    return od && od >= cutoff;
  });
}

function groupByWeek(ddRows) {
  const weeks = {};
  ddRows.forEach(r => {
    if (!r.ddWeek) return;
    if (!weeks[r.ddWeek]) weeks[r.ddWeek] = [];
    weeks[r.ddWeek].push(r);
  });
  return Object.entries(weeks).sort(([a], [b]) => {
    const da = new Date(a), db = new Date(b);
    if (!isNaN(da) && !isNaN(db)) return db - da;
    return b.localeCompare(a);
  });
}

// Rep share = gross / 2
function repShareForWeek(rows) {
  return rows.reduce((s, r) => s + r.amount, 0) / 2;
}

// Office gross = raw sum, no split (includes captain bonus rows with blank rep names)
function officeGrossForWeek(rows) {
  return rows.reduce((s, r) => s + r.amount, 0);
}

// Get the most recent DD week's rows for a rep
function currentWeekRepRows(repDdRows, mostRecentWeek) {
  if (!mostRecentWeek) return [];
  return repDdRows.filter(r => r.ddWeek === mostRecentWeek);
}

// Group a week's rows by rep name, excluding blank-name rows (captain bonuses)
// Returns array of { repName, grossAmount, repTakeHome } sorted by take-home desc
function repBreakdownForWeek(rows) {
  const byRep = {};
  rows.forEach(r => {
    const name = (r.repName || '').trim();
    if (!name) return; // skip captain bonus rows
    if (!byRep[name]) byRep[name] = 0;
    byRep[name] += Number(r.amount) || 0;
  });
  return Object.entries(byRep)
    .map(([repName, grossAmount]) => ({
      repName,
      grossAmount,
      repTakeHome: grossAmount / 2,
    }))
    .sort((a, b) => b.repTakeHome - a.repTakeHome);
}

function PayBadge({ label, color }) {
  return (
    <div style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 100, background: color + '20', border: `1px solid ${color}50`, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, color }}>
      {label}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10, marginTop: 4 }}>
      {children}
    </div>
  );
}

function TargetSelector({ target, onChange }) {
  const options = [5, 8, 10, 12, 15, 20];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>TARGET</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {options.map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            style={{
              padding: '3px 9px', borderRadius: 100,
              border: `1px solid ${target === n ? '#B8A0D4' : 'var(--border)'}`,
              background: target === n ? '#B8A0D420' : 'transparent',
              color: target === n ? '#B8A0D4' : 'var(--text-muted)',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, cursor: 'pointer',
            }}
          >{n}</button>
        ))}
      </div>
    </div>
  );
}

// ── Rep-side components (unchanged) ──────────────────────────

function HistoryCard({ weeklyHistory }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0 }}
      >
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>Previous Paychecks</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{weeklyHistory.length} prior pay period{weeklyHistory.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>▾</div>
      </button>
      {expanded && (
        <div style={{ marginTop: 12 }}>
          {weeklyHistory.map(([week, rows], i) => {
            const lineCount = rows.filter(r => r.clDescription === 'Port Line - OOF').length;
            const amt = rows.reduce((s, r) => s + r.amount, 0) / 2;
            const color = amt >= 1500 ? '#A0C4B8' : amt >= 800 ? '#B8A0D4' : '#C4748A';
            return (
              <div key={week} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < weeklyHistory.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>{week}</div>
                  {lineCount > 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{lineCount} line{lineCount !== 1 ? 's' : ''}</div>}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color }}>{fmtMoney(amt)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProjectedThisWeekCard({ orders, repName, target }) {
  const weekStart = thisWeekStart();
  const weekEnd   = thisWeekEnd();

  const thisWeekOrders = orders.filter(o => {
    if (repName && o.repName.toLowerCase() !== (repName || '').toLowerCase()) return false;
    const status = (o.status || '').toLowerCase();
    if (status.includes('cancel') || status.includes('disconnect')) return false;
    const d = parseDate(o.activeDate) || parseDate(o.orderDate);
    return d && d >= weekStart && d <= weekEnd;
  });

  const lines = thisWeekOrders.reduce((s, o) => s + (Number(o.lines) || 1), 0);
  const pay   = lines * RATE_PER_LINE;
  const pct   = Math.min(Math.round((lines / target) * 100), 100);
  const color = pct >= 100 ? '#A0C4B8' : pct >= 60 ? '#B8A0D4' : '#C4748A';

  const now      = new Date();
  const weekMs   = weekEnd - weekStart;
  const weekPct  = Math.round((Math.min(Math.max(now - weekStart, 0), weekMs) / weekMs) * 100);

  return (
    <div className="card" style={{ marginBottom: 12, borderColor: '#B8A0D430' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, color: '#B8A0D4', lineHeight: 1 }}>
            {fmtShort(pay)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            {lines} line{lines !== 1 ? 's' : ''} · {dateFmt(weekStart)}–{dateFmt(weekEnd)}
          </div>
        </div>
        <PayBadge label="In Progress" color="#B8A0D4" />
      </div>
      <div style={{ marginTop: 14, marginBottom: 4 }}>
        <div style={{ height: 4, borderRadius: 100, background: 'var(--bg-raised)', overflow: 'hidden', marginBottom: 4 }}>
          <div style={{ height: '100%', borderRadius: 100, width: `${weekPct}%`, background: 'linear-gradient(90deg,#B8A0D480,#B8A0D4)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
          <span>MON</span><span>SUN</span>
        </div>
      </div>
      <div style={{ height: 6, background: 'var(--bg-raised)', borderRadius: 100, overflow: 'hidden', margin: '10px 0 6px' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${color}99,${color})`, borderRadius: 100, transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lines} / {target} line target · {pct}%</div>
    </div>
  );
}

// ── Manager-side components ──────────────────────────────────

// Current DD card: office gross at top, collapsible rep-by-rep take-home breakdown
function CurrentDDCard({ rows, ddWeek }) {
  const [open, setOpen]  = useState(false);
  const officeGross      = officeGrossForWeek(rows);
  const breakdown        = repBreakdownForWeek(rows);

  return (
    <div className="card" style={{ marginBottom: 12, borderColor: '#A0C4B830' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, color: '#A0C4B8', lineHeight: 1 }}>
            {fmtMoney(officeGross)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Gross office total · DD Week {ddWeek || '—'}
          </div>
        </div>
        <PayBadge label="Current DD" color="#A0C4B8" />
      </div>

      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          marginTop: 14,
          padding: '10px 14px',
          background: '#A0C4B815',
          border: '1px solid #A0C4B830',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'var(--text)',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        <span>Rep breakdown ({breakdown.length} rep{breakdown.length !== 1 ? 's' : ''})</span>
        <span style={{ fontSize: 14, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>▾</span>
      </button>

      {open && (
        <div style={{ marginTop: 10 }}>
          {breakdown.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0', textAlign: 'center' }}>
              No rep rows for this week.
            </div>
          ) : (
            breakdown.map((row, i) => {
              const color = row.repTakeHome >= 1500 ? '#A0C4B8' : row.repTakeHome >= 800 ? '#B8A0D4' : '#C4748A';
              return (
                <div
                  key={row.repName}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 0',
                    borderBottom: i < breakdown.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: 'linear-gradient(135deg,#7B5EA7,#C4748A)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 13, color: '#EDE8F5', flexShrink: 0,
                  }}>
                    {row.repName[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {row.repName}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15, color }}>
                    {fmtMoney(row.repTakeHome)}
                  </div>
                </div>
              );
            })
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
            * Rep take-home = gross ÷ 2 (50/50 split). Captain bonuses excluded.
          </div>
        </div>
      )}
    </div>
  );
}

// Previous 4 weeks, compact rows (office gross)
function PreviousWeeksCard({ weekGroups }) {
  if (weekGroups.length === 0) return null;
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      {weekGroups.map(([week, rows], i) => {
        const amt   = officeGrossForWeek(rows);
        const color = amt >= 40000 ? '#A0C4B8' : amt >= 20000 ? '#B8A0D4' : '#C4748A';
        return (
          <div
            key={week}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: i < weekGroups.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{week}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color }}>{fmtMoney(amt)}</div>
          </div>
        );
      })}
    </div>
  );
}

// Projected next week card: total office projection + collapsible rep breakdown
function ProjectedNextWeekCard({ totalLines, activeRepCount, repProjected }) {
  const [open, setOpen] = useState(false);
  const pay = totalLines * MANAGER_RATE;

  // Rep breakdown: projected take-home = lines × $110 per rep, sorted high→low
  const breakdown = Object.entries(repProjected)
    .map(([repName, { lines }]) => ({
      repName,
      lines,
      repTakeHome: lines * RATE_PER_LINE,
    }))
    .filter(r => r.lines > 0)
    .sort((a, b) => b.repTakeHome - a.repTakeHome);

  return (
    <div className="card" style={{ marginBottom: 12, borderColor: '#B8A0D430' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, color: '#B8A0D4', lineHeight: 1 }}>
            {fmtShort(pay)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            {dateFmt(lastMonday())}–{dateFmt(lastSunday())} · {activeRepCount} active rep{activeRepCount !== 1 ? 's' : ''}
          </div>
        </div>
        <PayBadge label="Projected" color="#B8A0D4" />
      </div>
      <div style={{
        marginTop: 14,
        padding: '10px 14px',
        background: '#B8A0D415',
        border: '1px solid #B8A0D430',
        borderRadius: 'var(--radius-sm)',
        fontSize: 12,
        color: 'var(--text-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>
          <strong style={{ color: 'var(--text)', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{totalLines}</strong> active line{totalLines !== 1 ? 's' : ''} × ${MANAGER_RATE}
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: '#B8A0D4' }}>
          = {fmtShort(pay)}
        </span>
      </div>

      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          marginTop: 10,
          padding: '10px 14px',
          background: '#B8A0D415',
          border: '1px solid #B8A0D430',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'var(--text)',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        <span>Rep breakdown ({breakdown.length} rep{breakdown.length !== 1 ? 's' : ''})</span>
        <span style={{ fontSize: 14, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>▾</span>
      </button>

      {open && (
        <div style={{ marginTop: 10 }}>
          {breakdown.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0', textAlign: 'center' }}>
              No active lines projected yet this cycle.
            </div>
          ) : (
            breakdown.map((row, i) => {
              const color = row.repTakeHome >= 1500 ? '#A0C4B8' : row.repTakeHome >= 800 ? '#B8A0D4' : '#C4748A';
              return (
                <div
                  key={row.repName}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 0',
                    borderBottom: i < breakdown.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: 'linear-gradient(135deg,#7B5EA7,#C4748A)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 13, color: '#EDE8F5', flexShrink: 0,
                  }}>
                    {row.repName[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.repName}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                      {row.lines} line{row.lines !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15, color }}>
                    {fmtMoney(row.repTakeHome)}
                  </div>
                </div>
              );
            })
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
            * Rep take-home = lines × ${RATE_PER_LINE}. Does not include bonuses.
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
        * Finalizes Wed at 2pm.
      </div>
    </div>
  );
}

// Rep row for A-Player office view (kept from original)
function RepPayRow({ repName, projected, realPay, showReal, target, ddHistory }) {
  const [open, setOpen] = useState(false);
  const amount = showReal ? realPay : projected.pay;
  const pct    = Math.min(Math.round((projected.lines / target) * 100), 100);
  const color  = showReal
    ? (amount >= 1500 ? '#A0C4B8' : amount >= 800 ? '#B8A0D4' : '#C4748A')
    : (pct >= 100 ? '#A0C4B8' : pct >= 60 ? '#B8A0D4' : '#C4748A');

  return (
    <>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: open ? 'none' : '1px solid var(--border)', cursor: 'pointer' }}
      >
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#7B5EA7,#C4748A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, color: '#EDE8F5', flexShrink: 0 }}>
          {(repName || '?')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {repName}
          </div>
          {!showReal && (
            <div style={{ height: 4, background: 'var(--bg-raised)', borderRadius: 100, overflow: 'hidden', marginTop: 5, width: '80%' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 100 }} />
            </div>
          )}
          {!showReal && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{projected.lines} / {target} lines</div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color }}>{fmtMoney(amount)}</div>
            {!showReal && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>projected</div>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', opacity: 0.6 }}>{open ? '▲' : '▼'}</div>
        </div>
      </div>

      {open && (
        <div style={{ padding: '8px 0 12px 48px', borderBottom: '1px solid var(--border)' }}>
          {ddHistory.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No DD pay history found.</div>
          ) : (
            ddHistory.slice(0, 4).map(([week, rows]) => {
              const amt = repShareForWeek(rows);
              const c   = amt >= 1500 ? '#A0C4B8' : amt >= 800 ? '#B8A0D4' : '#C4748A';
              return (
                <div key={week} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: 'var(--text)' }}>{week}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: c }}>{fmtMoney(amt)}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );
}

// ── Main ─────────────────────────────────────────────────────

export function PaycheckView({ user }) {
  const [orders,       setOrders]       = useState([]);
  const [ddData,       setDDData]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [target,       setTarget]       = useState(() => {
    const saved = localStorage.getItem(TARGET_KEY);
    return saved ? Number(saved) : DEFAULT_TARGET;
  });
  const [showInactive, setShowInactive] = useState(false);

  const showReal  = isRealPaycheckTime();
  const role      = user?.role;
  const isRep     = role === ROLES.REP;
  const isAPlayer = role === ROLES.A_PLAYER;
  const isManager = role === ROLES.MANAGER || role === ROLES.ADMIN || role === ROLES.CAPTAIN;

  const handleTargetChange = (n) => {
    setTarget(n);
    localStorage.setItem(TARGET_KEY, String(n));
  };

  useEffect(() => {
    async function load() {
      if (!user?.email) return;
      try {
        setLoading(true);
        setError(null);
        const [orderRows, ddRows] = await Promise.all([
          fetchOrders(user.email, isRep ? user.name : null),
          fetchDDData(user.email, isRep ? user.name : null),
        ]);
        setOrders(orderRows);
        setDDData(ddRows);
      } catch (err) {
        console.error('PaycheckView error:', err);
        setError(err.message || 'Could not load pay data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.email, user?.name, isRep]);

  const allReps      = [...new Set(orders.map(o => o.repName).filter(Boolean))].sort();
  const activeReps   = allReps.filter(r => isRepActive(orders, r));
  const inactiveReps = allReps.filter(r => !isRepActive(orders, r));

  const repProjected = {};
  allReps.forEach(rep => { repProjected[rep] = computeProjected(orders, rep); });

  // All week groups for office-level view (gross, no split)
  const allWeekGroups  = groupByWeek(ddData);
  const mostRecentWeek = allWeekGroups[0]?.[0] || null;
  const currentWeekRows = allWeekGroups[0]?.[1] || [];
  const previousFourWeeks = allWeekGroups.slice(1, 5); // weeks 2–5 = previous 4

  // Per-rep DD history (rep share = /2)
  const repDdHistory = {};
  allReps.forEach(rep => {
    const repDd = ddData.filter(r => r.repName.toLowerCase() === rep.toLowerCase());
    repDdHistory[rep] = groupByWeek(repDd);
  });

  // Rep real pay = their share of the most recent week only
  const repRealPay = {};
  allReps.forEach(rep => {
    const currentRows = currentWeekRepRows(
      ddData.filter(r => r.repName.toLowerCase() === rep.toLowerCase()),
      mostRecentWeek
    );
    repRealPay[rep] = currentRows.length > 0 ? repShareForWeek(currentRows) : 0;
  });

  // Office totals for projection
  const totalLines     = Object.values(repProjected).reduce((s, r) => s + r.lines, 0);

  // My (rep) data
  const myProjected   = computeProjected(orders, user?.name);
  const myDd          = ddData.filter(r => r.repName.toLowerCase() === (user?.name || '').toLowerCase());
  const myWeeks       = groupByWeek(myDd);
  const myCurrentRows = currentWeekRepRows(myDd, mostRecentWeek);
  const myDDWeek      = mostRecentWeek;
  const myHistory     = myWeeks.slice(0, 4);

  const renderRepList = (reps) => reps.map(rep => (
    <RepPayRow
      key={rep}
      repName={rep}
      projected={repProjected[rep] || { lines: 0, pay: 0 }}
      realPay={repRealPay[rep] || 0}
      showReal={showReal}
      target={target}
      ddHistory={repDdHistory[rep] || []}
    />
  ));

  return (
    <div className="fade-up">
      <div className="section-header">
        <div>
          <div className="section-title">{isManager ? 'Pay Overview' : isAPlayer ? 'Office View' : 'My Pay'}</div>
          <div className="section-subtitle">
            {isManager
              ? `DD Week ${mostRecentWeek || '—'}`
              : showReal
                ? `Real paycheck · DD Week ${mostRecentWeek || '—'}`
                : `Projected · ${dateFmt(lastMonday())}–${dateFmt(lastSunday())}`}
          </div>
        </div>
        {!isManager && (
          <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, padding: '4px 10px', background: showReal ? '#A0C4B815' : '#B8A0D415', border: `1px solid ${showReal ? '#A0C4B840' : '#B8A0D440'}`, borderRadius: 100, color: showReal ? '#A0C4B8' : '#B8A0D4' }}>
            {showReal ? '✓ Final' : '~ Est.'}
          </div>
        )}
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 16px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💰</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Loading pay data...</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Reading orders and DD data</div>
        </div>
      )}

      {!loading && error && (
        <div className="card" style={{ borderColor: '#C4748A60' }}>
          <div style={{ color: '#C4748A', fontSize: 13, marginBottom: 6 }}>⚠️ {error}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Could not reach the Archie API. Try refreshing.</div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ── Rep view ──────────────────────────────────── */}
          {isRep && (
            <>
              <TargetSelector target={target} onChange={handleTargetChange} />

              {/* Card 1 — Current Paycheck */}
              <SectionLabel>Current Paycheck</SectionLabel>
              {myCurrentRows.length > 0 ? (
                <div className="card" style={{ marginBottom: 12, borderColor: '#A0C4B830' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, color: '#A0C4B8', lineHeight: 1 }}>
                        {fmtMoney(myCurrentRows.reduce((s, r) => s + r.amount, 0) / 2)}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                        DD Week: {myDDWeek || '—'}
                        {(() => { const lines = myCurrentRows.filter(r => r.clDescription === 'Port Line - OOF').length; return lines > 0 ? ` · ${lines} line${lines !== 1 ? 's' : ''}` : ''; })()}
                      </div>
                    </div>
                    <PayBadge label="Paid" color="#A0C4B8" />
                  </div>
                  <div style={{ marginTop: 14, padding: '10px 14px', background: '#A0C4B815', border: '1px solid #A0C4B830', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-muted)' }}>
                    * subject to tax repayment and other Helen related debts
                  </div>
                </div>
              ) : isRepActive(orders, user?.name) ? (
                <div className="card" style={{ marginBottom: 12, borderColor: '#6B5F8030' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, color: 'var(--text-muted)', lineHeight: 1 }}>
                        $0.00
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                        No commissions for DD Week {mostRecentWeek || '—'}
                      </div>
                    </div>
                    <PayBadge label="$0" color="#6B5F80" />
                  </div>
                </div>
              ) : (
                <div className="card" style={{ marginBottom: 12, opacity: 0.6, textAlign: 'center', padding: '24px 16px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No paycheck data yet for this week.</div>
                </div>
              )}

              {/* Card 2 — History */}
              <SectionLabel>History</SectionLabel>
              {myHistory.length > 0 ? (
                <HistoryCard weeklyHistory={myHistory} />
              ) : (
                <div className="card" style={{ marginBottom: 12, opacity: 0.6 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>History will appear after your first completed pay period.</div>
                </div>
              )}

              {/* Card 3 — Projected this week */}
              <SectionLabel>This Week · Projected</SectionLabel>
              <ProjectedThisWeekCard orders={orders} repName={user?.name} target={target} />
            </>
          )}

          {/* ── Manager view ─────────────────────────────── */}
          {isManager && (
            <>
              {/* Current DD — always at top */}
              <SectionLabel>Current DD</SectionLabel>
              {currentWeekRows.length > 0 ? (
                <CurrentDDCard rows={currentWeekRows} ddWeek={mostRecentWeek} />
              ) : (
                <div className="card" style={{ marginBottom: 12, opacity: 0.6, textAlign: 'center', padding: '24px 16px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No DD data yet for the current week.</div>
                </div>
              )}

              {/* Previous 4 weeks */}
              <SectionLabel>Previous 4 Weeks</SectionLabel>
              {previousFourWeeks.length > 0 ? (
                <PreviousWeeksCard weekGroups={previousFourWeeks} />
              ) : (
                <div className="card" style={{ marginBottom: 12, opacity: 0.6, textAlign: 'center', padding: '16px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No prior DD weeks available yet.</div>
                </div>
              )}

              {/* Projected next week */}
              <SectionLabel>Projected · Next Week</SectionLabel>
              <ProjectedNextWeekCard totalLines={totalLines} activeRepCount={activeReps.length} repProjected={repProjected} />
            </>
          )}

          {/* ── A-Player view (kept from original) ───────── */}
          {isAPlayer && (
            <>
              <TargetSelector target={target} onChange={handleTargetChange} />

              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 30, color: '#A0C4B8', lineHeight: 1 }}>
                      {fmtMoney(showReal ? officeGrossForWeek(currentWeekRows) : totalLines * MANAGER_RATE)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                      {showReal
                        ? `Gross office total · DD Week ${mostRecentWeek || '—'}`
                        : `${totalLines} lines · ${activeReps.length} active reps`}
                    </div>
                  </div>
                  <PayBadge label={showReal ? 'Real Paycheck' : 'Projected'} color={showReal ? '#A0C4B8' : '#B8A0D4'} />
                </div>
                {!showReal && (
                  <>
                    <div style={{ height: 6, background: 'var(--bg-raised)', borderRadius: 100, overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{ height: '100%', width: `${Math.min(Math.round((totalLines / Math.max(activeReps.length * target, 1)) * 100), 100)}%`, background: 'linear-gradient(90deg,#7B5EA7,#B8A0D4)', borderRadius: 100 }} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {totalLines} / {activeReps.length * target} combined line target
                    </div>
                  </>
                )}
              </div>

              <div style={{ marginTop: 10, padding: '8px 12px', background: '#B8A0D415', border: '1px solid #B8A0D430', borderRadius: 'var(--radius-sm)', fontSize: 11, color: '#B8A0D4', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                👁 A-Player view — ${MANAGER_RATE}/line office revenue · your rep commission is ${RATE_PER_LINE}/line
              </div>

              {activeReps.length > 0 && (
                <div className="card" style={{ marginBottom: 12 }}>
                  <SectionLabel>Active Reps ({activeReps.length})</SectionLabel>
                  {renderRepList(activeReps)}
                </div>
              )}

              {inactiveReps.length > 0 && (
                <div className="card" style={{ marginBottom: 12 }}>
                  <div
                    onClick={() => setShowInactive(s => !s)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: showInactive ? 10 : 0 }}
                  >
                    <SectionLabel>Inactive Reps ({inactiveReps.length})</SectionLabel>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -8 }}>{showInactive ? '▲ hide' : '▼ show'}</span>
                  </div>
                  {showInactive && renderRepList(inactiveReps)}
                  {!showInactive && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No orders in the last {ACTIVE_DAYS} days
                    </div>
                  )}
                </div>
              )}

              {allWeekGroups.length > 0 && (
                <>
                  <SectionLabel>Last 4 DD Weeks — Office Gross</SectionLabel>
                  <div className="card">
                    {allWeekGroups.slice(0, 4).map(([week, rows], i, arr) => {
                      const amt   = officeGrossForWeek(rows);
                      const color = amt >= 40000 ? '#A0C4B8' : amt >= 20000 ? '#B8A0D4' : '#C4748A';
                      return (
                        <div key={week} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{week}</div>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color }}>{fmtMoney(amt)}</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
