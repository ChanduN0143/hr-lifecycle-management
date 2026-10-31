
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Users, ClipboardList, ShieldCheck, Package,
  AlertTriangle, RefreshCw, Search,
  LayoutDashboard, Activity
} from 'lucide-react';
import './styles.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function App() {
  const [page, setPage] = useState('Overview');
  const [stats, setStats] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API}/dashboard`);
      if (!response.ok) throw new Error('Dashboard API unavailable.');
      setStats(await response.json());
    } catch (e) {
      setError(e.message);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadRows(p = page) {
    const endpoints = {
      Employees: 'employees',
      Tasks: 'tasks',
      Exceptions: 'exceptions',
      'Access Requests': 'access-requests',
      Assets: 'assets',
      Offboarding: 'offboarding-cases'
    };

    const endpoint = endpoints[p];

    if (!endpoint) {
      setRows([]);
      return;
    }

    try {
      const response = await fetch(`${API}/${endpoint}`);
      if (!response.ok) throw new Error(`Unable to load ${p}.`);
      setRows(await response.json());
      setError('');
    } catch (e) {
      setError(e.message);
      setRows([]);
    }
  }

  async function handleAction(type, row) {
    let endpoint = '';
    let body = {};
    let confirmation = '';

    if (type === 'complete-task') {
      endpoint = `/tasks/${row.task_id}/complete`;
      confirmation = 'Complete this task?';
    }

    if (type === 'approve-access' || type === 'reject-access') {
      const approverId = window.prompt('Enter approver employee ID:');
      if (!approverId?.trim()) return;

      endpoint = `/access-requests/${row.access_request_id}/approve`;
      body = {
        decision: type === 'approve-access' ? 'approved' : 'rejected',
        approver_employee_id: approverId.trim(),
        comments: 'Processed through PeopleOps dashboard'
      };
      confirmation = `Confirm ${body.decision} access?`;
    }

    if (type === 'revoke-access') {
      endpoint = `/access-requests/${row.access_request_id}/revoke`;
      confirmation = 'Revoke this access?';
    }

    if (type === 'recover-asset') {
      endpoint = `/assets/${row.asset_id}/recover`;
      confirmation = 'Confirm asset recovery?';
    }

    if (type === 'complete-offboarding') {
      endpoint = `/offboarding-cases/${row.offboarding_case_id}/complete`;
      confirmation = 'Attempt to complete this offboarding case?';
    }

    if (!endpoint || !window.confirm(confirmation)) return;

    try {
      const response = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...(Object.keys(body).length
          ? { body: JSON.stringify(body) }
          : {})
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'The action could not be completed.');
      }

      window.alert('Action completed successfully.');
      await Promise.all([load(), loadRows(page)]);
    } catch (e) {
      window.alert(e.message);
      await loadRows(page);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setSearch('');
    setStatus('all');
    loadRows(page);
  }, [page]);

  const nav = [
    ['Overview', LayoutDashboard],
    ['Employees', Users],
    ['Tasks', ClipboardList],
    ['Access Requests', ShieldCheck],
    ['Assets', Package],
    ['Offboarding', Users],
    ['Exceptions', AlertTriangle]
  ];

  const filtered = rows.filter(row =>
    JSON.stringify(row).toLowerCase().includes(search.toLowerCase()) &&
    (status === 'all' || row.status === status)
  );

  const cards = [
    ['Employees', stats?.employees ?? '—', Users, 'All employee records'],
    ['Active onboarding', stats?.active_onboarding ?? '—', Activity, 'Cases in progress'],
    ['Open tasks', stats?.open_tasks ?? '—', ClipboardList, 'Tasks not closed'],
    ['Overdue tasks', stats?.overdue_tasks ?? '—', AlertTriangle, 'Past due date'],
    ['Active access', stats?.active_access ?? '—', ShieldCheck, 'Access currently active'],
    ['Flagged events', stats?.flagged_events ?? '—', AlertTriangle, 'Recorded exceptions']
  ];

  function renderActions(row) {
    if (page === 'Tasks' && !['completed', 'cancelled'].includes(row.status)) {
      return (
        <button className="action-btn"
          onClick={() => handleAction('complete-task', row)}>
          Complete
        </button>
      );
    }

    if (page === 'Access Requests' && row.status === 'pending') {
      return (
        <>
          <button className="action-btn"
            onClick={() => handleAction('approve-access', row)}>
            Approve
          </button>
          <button className="action-btn danger"
            onClick={() => handleAction('reject-access', row)}>
            Reject
          </button>
        </>
      );
    }

    if (page === 'Access Requests' && row.status === 'active') {
      return (
        <button className="action-btn danger"
          onClick={() => handleAction('revoke-access', row)}>
          Revoke
        </button>
      );
    }

    if (page === 'Assets' && row.status === 'assigned') {
      return (
        <button className="action-btn"
          onClick={() => handleAction('recover-asset', row)}>
          Recover
        </button>
      );
    }

    if (page === 'Offboarding' && row.status !== 'completed') {
      return (
        <button className="action-btn"
          onClick={() => handleAction('complete-offboarding', row)}>
          Complete case
        </button>
      );
    }

        if (page === 'Exceptions') {
      return (
        <button
          className="action-btn"
          onClick={() => {
            window.alert(
              `Exception: ${row.issue_type || row.event_type}\n\n` +
              `Entity: ${row.entity_type}\n` +
              `Entity ID: ${row.entity_id}\n\n` +
              `Details:\n${JSON.stringify(row.details, null, 2)}`
            );
          }}
        >
          Inspect
        </button>
      );
    }

    return <span className="muted">—</span>;
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">HL</div>
          <div><b>PeopleOps</b><small>Lifecycle Control</small></div>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        {nav.map(([name, Icon]) => (
          <button key={name}
            className={`nav ${page === name ? 'selected' : ''}`}
            onClick={() => setPage(name)}>
            <Icon size={18} />
            <span>{name}</span>
            {name === 'Exceptions' && <i className="nav-dot" />}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="avatar">OP</div>
          <div><b>Operations Team</b><small>Process workspace</small></div>
        </div>
      </aside>

      <main className="main">
        <header>
          <div>
            <div className="eyebrow">PEOPLE OPERATIONS / CONTROL CENTER</div>
            <h1>{page}</h1>
            <p className="subtitle">
              Coordinate employee transitions with traceable, policy-driven workflows.
            </p>
          </div>
          <button className="refresh"
            onClick={() => { load(); loadRows(page); }}>
            <RefreshCw size={16} /> Refresh data
          </button>
        </header>

        {error && (
          <div className="alert">
            <AlertTriangle size={18} />
            <div>
              <b>Connection notice</b>
              <p>{error} Check PostgreSQL, database setup, and the API server.</p>
            </div>
          </div>
        )}

        {page === 'Overview' ? (
          <>
            <div className="welcome">
              <div>
                <span className="pill">● OPERATIONS SNAPSHOT</span>
                <h2>Lifecycle overview</h2>
                <p>Monitor onboarding progress, access exposure, and service-level exceptions in one place.</p>
              </div>
              <div className="welcome-art">
                <div className="circle c1" />
                <div className="circle c2" />
                <div className="art-card">
                  <ShieldCheck size={28} />
                  <b>Control</b>
                  <small>Track every transition</small>
                </div>
              </div>
            </div>

            <div className="section-head">
              <div>
                <h3>Key indicators</h3>
                <p>Latest figures from the connected PostgreSQL database</p>
              </div>
              <span className="live"><i /> LIVE DATA</span>
            </div>

            <div className="metrics">
              {cards.map(([title, value, Icon, desc], i) => (
                <div className="metric" key={title}>
                  <div className={`metric-icon icon-${i}`}><Icon size={19} /></div>
                  <div className="metric-title">{title}</div>
                  <strong>{loading ? '…' : value}</strong>
                  <small>{desc}</small>
                </div>
              ))}
            </div>

            <div className="bottom-grid">
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h3>Lifecycle checkpoints</h3>
                    <p>Key control points in the employee journey</p>
                  </div>
                  <span className="tag">WORKFLOW</span>
                </div>

                {[
                  ['01', 'Identity verification', 'Confirm identity before account setup', 'Required'],
                  ['02', 'Approval controls', 'Validate approvals before provisioning', 'Policy'],
                  ['03', 'Asset accountability', 'Track assignment and recovery', 'Inventory'],
                  ['04', 'Exit clearance', 'Revoke access and recover equipment', 'Critical']
                ].map(item => (
                  <div className="checkpoint" key={item[0]}>
                    <div className="checkpoint-num">{item[0]}</div>
                    <div className="checkpoint-text">
                      <b>{item[1]}</b><small>{item[2]}</small>
                    </div>
                    <span>{item[3]}</span>
                  </div>
                ))}
              </section>

              <section className="panel health">
                <div className="panel-head">
                  <div>
                    <h3>Control posture</h3>
                    <p>Operational safeguards</p>
                  </div>
                  <ShieldCheck size={21} />
                </div>
                <div className="health-row"><span>Approval-gated access</span><b>Enforced by workflow</b></div>
                <div className="health-row"><span>Dependency validation</span><b>Backend enforced</b></div>
                <div className="health-row"><span>Audit history</span><b>Event records</b></div>
                <div className="health-note">
                  <AlertTriangle size={16} />
                  <span>Review flagged exceptions promptly. Ground-truth labels are stored separately from operational records.</span>
                </div>
              </section>
            </div>
          </>
        ) : (
          <section className="panel data-panel">
            <div className="panel-head">
              <div>
                <h3>{page} records</h3>
                <p>Live records returned by the backend API</p>
              </div>
              <span className="tag">{filtered.length} SHOWN</span>
            </div>

            <div className="filters">
              <label className="search">
                <Search size={17} />
                <input placeholder="Search records..."
                  value={search}
                  onChange={e => setSearch(e.target.value)} />
              </label>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                <option value="all">All statuses</option>
                {['pending', 'in_progress', 'completed', 'approved',
                  'active', 'assigned', 'available', 'revoked',
                  'rejected', 'terminated', 'cancelled'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {(filtered[0] ? Object.keys(filtered[0]) : ['No records'])
                      .slice(0, 7)
                      .map(k => <th key={k}>{k.replaceAll('_', ' ')}</th>)}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 100).map((row, index) => (
                    <tr key={row.task_id || row.access_request_id ||
                      row.asset_id || row.offboarding_case_id ||
                      row.employee_id || index}>
                      {Object.entries(row).slice(0, 7).map(([key, value]) => (
                        <td key={key}>
                            {key === 'status' ? (
  <span className={`status ${String(value).toLowerCase()}`}>
    {String(value)}
  </span>
) : (
  typeof value === 'object' && value !== null
    ? JSON.stringify(value).slice(0, 150)
    : String(value ?? '—').slice(0, 72)
)}
                          
                        </td>
                      ))}
                      <td>{renderActions(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!filtered.length && (
                <div className="empty">
                  {loading ? 'Loading records…' : 'No records to display. Check API connection and database setup.'}
                </div>
              )}
            </div>
          </section>
        )}

        <footer>
          <span>PeopleOps Lifecycle Control</span>
          <span>Deterministic synthetic data · No real employee data</span>
        </footer>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
