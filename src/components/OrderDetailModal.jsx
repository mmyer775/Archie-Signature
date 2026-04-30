// ============================================================
// OrderDetailModal — Full order detail from master tracker
// CPNI safe: no phone numbers, no zip codes
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { createPortal }                from 'react-dom';
import { fetchOrderDetail }            from '../api/sheets';

const STATUS_COLORS = {
  'Active':              '#A0C4B8',
  'Activated':           '#A0C4B8',
  'Delivered':           '#E8C87A',
  'Pending':             '#7B8FCE',
  'Pending Shipment':    '#B8A0D4',
  'Shipped':             '#7B8FCE',
  'Shipped - InTransit': '#7B8FCE',
  'Port Approved':       '#A0C4B8',
  'Porting Issue':       '#E8A0B0',
  'Disconnected':        '#C4748A',
  'Cancelled':           '#C4748A',
  'Returned':            '#C4748A',
};

function statusColor(s) {
  return STATUS_COLORS[s] || '#B8A0D4';
}

// Format ISO date strings (e.g. "2026-04-24T04:00:00.000Z") into "Apr 24, 2026"
// Returns the original value if it's not a parseable date, so we don't break
// things like "M/D/YY" strings that might already be formatted.
function formatDate(value) {
  if (!value) return value;
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', {
    year:  'numeric',
    month: 'short',
    day:   'numeric',
  });
}

function Field({ label, value, color }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: color || 'var(--text)', lineHeight: 1.5 }}>
        {value}
      </div>
    </div>
  );
}

export function OrderDetailModal({ order, user, onClose }) {
  const [lines,   setLines]   = useState(null); // null = not loaded yet
  const [error,   setError]   = useState(null);
  const fetchedRef = useRef(false);

  const userEmail = user?.email;

  useEffect(() => {
    // Use ref to prevent double-fetch from StrictMode
    if (fetchedRef.current) return;
    if (!userEmail || !order) return;
    fetchedRef.current = true;

    fetchOrderDetail(userEmail, {
      customer:  order.customer,
      repName:   order.repName,
      orderDate: order.orderDate,
    })
      .then(data => setLines(data))
      .catch(err => {
        setError('Could not load order details.');
        console.error('OrderDetailModal error:', err);
      });
  }, []);

  if (!order) return null;

  const loading      = lines === null && !error;
  const uniqueNotes  = lines ? [...new Set(lines.map(l => l.notes).filter(Boolean))] : [];
  const followUp     = lines ? lines.some(l => l.followUp && l.followUp.toLowerCase() !== 'no' && l.followUp.trim() !== '') : false;
  const firstLine    = lines?.[0];

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-base)',
          borderRadius: '20px 20px 0 0',
          width: '100%',
          maxWidth: 600,
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: '0 0 40px',
        }}
      >
        {/* Sticky header — always visible */}
        <div style={{
          position: 'sticky',
          top: 0,
          background: 'var(--bg-base)',
          zIndex: 10,
          borderRadius: '20px 20px 0 0',
          borderBottom: '1px solid var(--border)',
          padding: '12px 20px 14px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-mid)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 20, color: 'var(--text)', marginBottom: 4 }}>
                {order.customer}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{order.apexId}</div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'var(--bg-overlay)', border: 'none', borderRadius: '50%', width: 32, height: 32, color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              ✕
            </button>
          </div>
          {followUp && (
            <div style={{ marginTop: 10, padding: '6px 10px', background: '#E8C87A20', border: '1px solid #E8C87A40', borderRadius: 8, fontSize: 12, color: '#E8C87A', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              ⚠️ Follow up required
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px' }}>

          {loading && (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Loading details from master tracker...
            </div>
          )}

          {error && (
            <div style={{ padding: 12, background: '#C4748A15', border: '1px solid #C4748A40', borderRadius: 8, color: '#C4748A', fontSize: 13 }}>
              {error}
            </div>
          )}

          {lines !== null && !error && lines.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              No detail records found in master tracker.
            </div>
          )}

          {lines !== null && lines.length > 0 && (
            <>
              {/* Order info */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.07em', marginBottom: 10 }}>ORDER INFO</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <Field label="REP"        value={firstLine?.repName} />
                  <Field label="OFFICE"     value={firstLine?.office} />
                  <Field label="ORDER DATE" value={formatDate(order.orderDate)} />
                  <Field label="LINES"      value={`${lines.length} line${lines.length > 1 ? 's' : ''}`} />
                </div>
              </div>

              {/* Each line */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.07em', marginBottom: 10 }}>
                  LINES · {lines.length}
                </div>
                {lines.map((line, i) => {
                  const color = statusColor(line.status);
                  return (
                    <div key={i} style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderLeft: `3px solid ${color}`,
                      borderRadius: 10,
                      padding: '12px 14px',
                      marginBottom: 8,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--text)' }}>
                          Line {i + 1}
                        </div>
                        <div style={{
                          background: color + '20',
                          border: `1px solid ${color}50`,
                          borderRadius: 100,
                          padding: '2px 8px',
                          fontSize: 11,
                          fontFamily: 'var(--font-display)',
                          fontWeight: 700,
                          color,
                        }}>
                          {line.status || 'Unknown'}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                        {line.plan       && <Field label="PLAN"        value={line.plan} />}
                        {line.phone      && <Field label="DEVICE"      value={line.phone} />}
                        {line.activeDate && <Field label="ACTIVE DATE" value={formatDate(line.activeDate)} color="#A0C4B8" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Notes */}
              {uniqueNotes.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.07em', marginBottom: 10 }}>NOTES</div>
                  {uniqueNotes.map((note, i) => (
                    <div key={i} style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '10px 14px',
                      fontSize: 13,
                      color: 'var(--text)',
                      lineHeight: 1.6,
                      marginBottom: 6,
                    }}>
                      {note}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  , document.body);
}