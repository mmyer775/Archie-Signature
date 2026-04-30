// ============================================================
// OrdersView — Live orders from ORDERS sheet
// repFilter  (string) = single rep name, server-side filter
// teamFilter (array)  = list of rep names, client-side filter
// ============================================================

import { useState, useEffect } from 'react';
import { fetchOrders } from '../api/sheets';
import { OrderDetailModal } from './OrderDetailModal';

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

function statusColor(status) {
  if (STATUS_COLORS[status]) return STATUS_COLORS[status];
  const colors = ['#7B8FCE','#B8A0D4','#E8A0B0','#A0C4B8','#E8C87A'];
  return colors[(status || '').length % colors.length];
}

// Format ISO date strings (e.g. "2026-04-24T04:00:00.000Z") into "Apr 24, 2026"
// Returns the original value if it's not a parseable date, so already-formatted
// strings like "M/D/YY" pass through unchanged.
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

function OrderCard({ order, onClick }) {
  const color = statusColor(order.status);
  return (
    <div onClick={onClick} style={{ background: 'var(--bg-surface)', border: `1px solid var(--border)`, borderLeft: `3px solid ${color}`, borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 8, cursor: 'pointer', transition: 'border-color 0.15s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{order.customer}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{order.apexId}</div>
        </div>
        <div style={{ background: color + '20', border: `1px solid ${color}50`, borderRadius: 100, padding: '3px 10px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, color, flexShrink: 0 }}>
          {order.status}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}><span style={{ color: '#B8A0D4', fontWeight: 600 }}>Rep</span> {order.repName}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}><span style={{ color: '#B8A0D4', fontWeight: 600 }}>Plan</span> {order.plan || '—'}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}><span style={{ color: '#B8A0D4', fontWeight: 600 }}>Lines</span> {order.lines || '—'}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}><span style={{ color: '#B8A0D4', fontWeight: 600 }}>Ordered</span> {formatDate(order.orderDate) || '—'}</div>
        {order.activeDate && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}><span style={{ color: '#A0C4B8', fontWeight: 600 }}>Activated</span> {formatDate(order.activeDate)}</div>}
      </div>
    </div>
  );
}

export function OrdersView({ user, repFilter = null, teamFilter = null }) {
  const [orders,       setOrders]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [filter,       setFilter]       = useState('All');
  const [search,       setSearch]       = useState('');
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [showDates,    setShowDates]    = useState(false);
  const [showReps,     setShowReps]     = useState(false);
  const [selectedReps, setSelectedReps] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const userEmail = user?.email;

  useEffect(() => {
    if (!userEmail) {
      setError('Not signed in.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // If teamFilter (array) provided → fetch all, filter client-side
    // If repFilter (string) provided → pass to API for server-side filter
    fetchOrders(userEmail, teamFilter ? null : repFilter)
      .then(data => {
        const result = teamFilter
          ? data.filter(o => teamFilter.some(
              name => o.repName.toLowerCase().trim() === name.toLowerCase().trim()
            ))
          : data;
        setOrders(result);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Could not load orders.');
        setLoading(false);
        console.error('OrdersView error:', err);
      });
  }, [userEmail, repFilter, JSON.stringify(teamFilter)]);

  // Show rep filter chips when manager sees all, or when a-player sees their team
  const showRepFilter = !repFilter || teamFilter;
  const repList = showRepFilter
    ? Array.from(new Set(orders.map(o => o.repName).filter(Boolean))).sort()
    : [];

  const toggleRep = (rep) => {
    setSelectedReps(prev => prev.includes(rep) ? prev.filter(r => r !== rep) : [...prev, rep]);
  };

  const filtered = orders.filter(o => {
    const matchStatus = filter === 'All' || o.status === filter;
    const matchRep    = selectedReps.length === 0 || selectedReps.includes(o.repName);
    const matchSearch = !search || [o.customer, o.repName, o.apexId, o.plan]
      .some(f => f?.toLowerCase().includes(search.toLowerCase()));
    let matchDate = true;
    if (dateFrom || dateTo) {
      const orderDate = o.orderDate ? new Date(o.orderDate) : null;
      if (orderDate && !isNaN(orderDate)) {
        if (dateFrom) matchDate = matchDate && orderDate >= new Date(dateFrom);
        if (dateTo)   matchDate = matchDate && orderDate <= new Date(dateTo + 'T23:59:59');
      }
    }
    return matchStatus && matchRep && matchSearch && matchDate;
  });

  const counts = {};
  filtered.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
  const statuses = ['All', ...Array.from(new Set(orders.map(o => o.status).filter(Boolean)))];

  const hasDateFilter = dateFrom || dateTo;
  const clearDates = () => { setDateFrom(''); setDateTo(''); };

  if (loading) return (
    <div className="fade-up">
      <div className="section-header"><div><div className="section-title">All Orders</div><div className="section-subtitle">Loading...</div></div></div>
      {[1,2,3].map(i => <div key={i} style={{ height: 80, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: 8, opacity: 0.4 }} />)}
    </div>
  );

  if (error) return (
    <div className="fade-up">
      <div className="section-header"><div><div className="section-title">All Orders</div><div className="section-subtitle">Error</div></div></div>
      <div className="card" style={{ borderColor: '#C4748A50' }}>
        <div style={{ color: '#C4748A', fontSize: 13 }}>❌ {error}</div>
      </div>
    </div>
  );

  return (
    <div className="fade-up">
      <div className="section-header">
        <div>
          <div className="section-title">All Orders</div>
          <div className="section-subtitle">{orders.length} total · {filtered.length} shown</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {Object.entries(counts).map(([status, count]) => (
          <div key={status} style={{ background: statusColor(status) + '20', border: `1px solid ${statusColor(status)}40`, borderRadius: 100, padding: '4px 10px', fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, color: statusColor(status) }}>
            {status} · {count}
          </div>
        ))}
      </div>

      <input className="input" placeholder="Search by customer, rep, APEX ID, plan..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 8 }} />

      {/* Rep multi-select — manager or a-player team view */}
      {repList.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <button
            onClick={() => setShowReps(prev => !prev)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${selectedReps.length > 0 ? '#B8A0D4' : 'var(--border)'}`, background: selectedReps.length > 0 ? '#B8A0D415' : 'transparent', color: selectedReps.length > 0 ? '#B8A0D4' : 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, cursor: 'pointer', marginBottom: showReps ? 8 : 0 }}
          >
            <span>👥 {selectedReps.length === 0 ? 'Filter by rep' : `${selectedReps.length} rep${selectedReps.length > 1 ? 's' : ''} selected`}</span>
            <span style={{ fontSize: 10, opacity: 0.7 }}>{showReps ? '▲' : '▼'}</span>
          </button>
          {showReps && (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                {selectedReps.length > 0 && <button onClick={() => setSelectedReps([])} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Clear all</button>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {repList.map(rep => {
                  const selected = selectedReps.includes(rep);
                  return (
                    <button key={rep} onClick={() => toggleRep(rep)} style={{ padding: '5px 11px', borderRadius: 100, border: `1px solid ${selected ? '#B8A0D4' : 'var(--border)'}`, background: selected ? '#B8A0D420' : 'transparent', color: selected ? '#B8A0D4' : 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {rep.split(' ')[0]} {rep.split(' ')[1]?.[0] ? rep.split(' ')[1][0] + '.' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Date range */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
        <button onClick={() => setShowDates(!showDates)} style={{ padding: '6px 12px', borderRadius: 100, border: `1px solid ${hasDateFilter ? '#B8A0D4' : 'var(--border)'}`, background: hasDateFilter ? '#B8A0D420' : 'transparent', color: hasDateFilter ? '#B8A0D4' : 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
          📅 {hasDateFilter ? `${dateFrom || '...'} → ${dateTo || '...'}` : 'Date range'}
        </button>
        {hasDateFilter && <button onClick={clearDates} style={{ padding: '6px 10px', borderRadius: 100, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>✕ Clear</button>}
      </div>

      {showDates && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, padding: 12, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 4 }}>FROM</div>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-display)', boxSizing: 'border-box' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 4 }}>TO</div>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-display)', boxSizing: 'border-box' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: '6px 12px', borderRadius: 100, border: `1px solid ${filter === s ? statusColor(s) : 'var(--border)'}`, background: filter === s ? statusColor(s) + '20' : 'transparent', color: filter === s ? statusColor(s) : 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">📦</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>No orders found</div>
          <div className="empty-state-text">Try adjusting your search or filter.</div>
        </div>
      ) : (
        filtered.map((order, i) => <OrderCard key={order.apexId || i} order={order} onClick={() => setSelectedOrder(order)} />)
      )}

      {selectedOrder && <OrderDetailModal order={selectedOrder} user={user} onClose={() => setSelectedOrder(null)} />}
    </div>
  );
}