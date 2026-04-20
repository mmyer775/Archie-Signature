// ============================================================
// RosterManager — Manager roster tab
//
// - View all active reps with role badges
// - Add new rep (name, email, role, a-player assignment)
// - Edit existing rep (role, a-player assignment)
// - Mark inactive (collapsed section, can reactivate)
// - Col F in ROSTER sheet = status (active/inactive)
// ============================================================

import { useState, useEffect } from 'react';
import { fetchRoster, addRepToRoster, updateRosterRow } from '../api/sheets';

const ROLE_OPTIONS = ['rep', 'a_player', 'manager'];

const ROLE_COLORS = {
  rep:      '#7B8FCE',
  a_player: '#B8A0D4',
  manager:  '#A0C4B8',
  captain:  '#E8C87A',
  admin:    '#C4748A',
};

function RoleBadge({ role }) {
  const color = ROLE_COLORS[role] || '#888';
  return (
    <div style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 100,
      background: color + '20', border: `1px solid ${color}50`,
      fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, color,
    }}>
      {role.replace('_', ' ')}
    </div>
  );
}

function inputStyle(extra = {}) {
  return {
    width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)', background: 'var(--bg-overlay)',
    color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-display)',
    boxSizing: 'border-box', ...extra,
  };
}

// ── Add / Edit Modal ──────────────────────────────────────────

function RepModal({ rep, aPlayers, officeName, onSave, onClose, saving }) {
  const isEdit = !!rep;
  const [form, setForm] = useState({
    email:  rep?.email  || '',
    name:   rep?.name   || '',
    role:   rep?.role   || 'rep',
    team:   rep?.team   || '',
    status: rep?.status || 'active',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) return;
    onSave({ ...rep, ...form, office: officeName });
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(92vw, 460px)',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', zIndex: 1001, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 16, color: 'var(--text)' }}>
            {isEdit ? 'Edit Rep' : 'Add Rep'}
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-overlay)', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Form */}
        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Full Name</div>
            <input
              style={inputStyle()}
              placeholder="First Last"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Email</div>
            <input
              style={inputStyle()}
              placeholder="rep@email.com"
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              disabled={isEdit} // don't let email change on edit
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Role</div>
            <select
              style={inputStyle({ appearance: 'none' })}
              value={form.role}
              onChange={e => set('role', e.target.value)}
            >
              {ROLE_OPTIONS.map(r => (
                <option key={r} value={r}>{r.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          {/* A-player assignment — only show for reps */}
          {form.role === 'rep' && aPlayers.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Reports To (A-Player)</div>
              <select
                style={inputStyle({ appearance: 'none' })}
                value={form.team}
                onChange={e => set('team', e.target.value)}
              >
                <option value="">— None —</option>
                {aPlayers.map(ap => (
                  <option key={ap} value={ap}>{ap}</option>
                ))}
              </select>
            </div>
          )}

          {/* Status toggle — only on edit */}
          {isEdit && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Status</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['active', 'inactive'].map(s => (
                  <button
                    key={s}
                    onClick={() => set('status', s)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${form.status === s ? (s === 'active' ? '#A0C4B8' : '#C4748A') : 'var(--border)'}`,
                      background: form.status === s ? (s === 'active' ? '#A0C4B820' : '#C4748A20') : 'transparent',
                      color: form.status === s ? (s === 'active' ? '#A0C4B8' : '#C4748A') : 'var(--text-muted)',
                      fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.email.trim()}
            style={{
              width: '100%', padding: '12px 0',
              borderRadius: 'var(--radius-sm)',
              background: saving ? '#A0C4B840' : '#A0C4B8',
              border: 'none', color: '#0A0B0F',
              fontFamily: 'var(--font-display)', fontWeight: 900,
              fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
              opacity: (!form.name.trim() || !form.email.trim()) ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Rep'}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Rep row ───────────────────────────────────────────────────

function RepRow({ rep, onEdit }) {
  const initials = rep.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const color = ROLE_COLORS[rep.role] || '#888';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: color + '20', border: `1px solid ${color}50`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12, color,
      }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {rep.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {rep.email}
          {rep.team ? ` · reports to ${rep.team}` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <RoleBadge role={rep.role} />
        <button
          onClick={() => onEdit(rep)}
          style={{
            padding: '4px 10px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-muted)', fontSize: 12,
            fontFamily: 'var(--font-display)', fontWeight: 700, cursor: 'pointer',
          }}
        >
          Edit
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

export function RosterManager({ user }) {
  const [roster,        setRoster]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [modal,         setModal]         = useState(null); // null | 'add' | rep object
  const [saving,        setSaving]        = useState(false);
  const [showInactive,  setShowInactive]  = useState(false);
  const [successMsg,    setSuccessMsg]    = useState('');

  const load = async () => {
    if (!user?.email) return;
    try {
      setLoading(true); setError(null);
      const rows = await fetchRoster(user.email);
      setRoster(rows);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.email]);

  const activeRoster   = roster.filter(r => r.status !== 'inactive');
  const inactiveRoster = roster.filter(r => r.status === 'inactive');
  const aPlayers       = activeRoster.filter(r => r.role === 'a_player').map(r => r.name);
  const officeName     = user?.office || '';

  const flash = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (formData.rowIndex) {
        // Edit existing
        await updateRosterRow(user.email, formData.rowIndex, formData);
        flash(`${formData.name} updated`);
      } else {
        // Add new
        await addRepToRoster(user.email, formData);
        flash(`${formData.name} added`);
      }
      setModal(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade-up">
      {modal && (
        <RepModal
          rep={modal === 'add' ? null : modal}
          aPlayers={aPlayers}
          officeName={officeName}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}

      <div className="section-header">
        <div>
          <div className="section-title">Roster</div>
          <div className="section-subtitle">{activeRoster.length} active · {inactiveRoster.length} inactive</div>
        </div>
        <button
          onClick={() => setModal('add')}
          style={{
            padding: '8px 14px', borderRadius: 'var(--radius-sm)',
            background: '#A0C4B8', border: 'none',
            color: '#0A0B0F', fontFamily: 'var(--font-display)',
            fontWeight: 900, fontSize: 13, cursor: 'pointer',
          }}
        >
          + Add Rep
        </button>
      </div>

      {successMsg && (
        <div style={{ marginBottom: 12, padding: '8px 14px', background: '#A0C4B820', border: '1px solid #A0C4B850', borderRadius: 'var(--radius-sm)', fontSize: 12, color: '#A0C4B8', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
          ✓ {successMsg}
        </div>
      )}

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 16px' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text)' }}>Loading roster...</div>
        </div>
      )}

      {!loading && error && (
        <div className="card" style={{ borderColor: '#C4748A60' }}>
          <div style={{ color: '#C4748A', fontSize: 13 }}>⚠️ {error}</div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Active reps */}
          {activeRoster.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '32px 16px', opacity: 0.6 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>No reps yet</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tap + Add Rep to get started.</div>
            </div>
          ) : (
            <div className="card" style={{ marginBottom: 12 }}>
              {activeRoster.map(rep => (
                <RepRow key={rep.email} rep={rep} onEdit={() => setModal(rep)} />
              ))}
            </div>
          )}

          {/* Inactive reps — collapsible */}
          {inactiveRoster.length > 0 && (
            <div className="card" style={{ opacity: showInactive ? 1 : 0.7 }}>
              <button
                onClick={() => setShowInactive(s => !s)}
                style={{
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: 0,
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--text-muted)' }}>
                    Inactive ({inactiveRoster.length})
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    Tap to {showInactive ? 'hide' : 'view'} · click Edit to reactivate
                  </div>
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', transform: showInactive ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>▾</div>
              </button>

              {showInactive && (
                <div style={{ marginTop: 12 }}>
                  {inactiveRoster.map(rep => (
                    <RepRow key={rep.email} rep={rep} onEdit={() => setModal(rep)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
