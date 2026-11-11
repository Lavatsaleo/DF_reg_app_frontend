import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import PasswordFields from './PasswordFields';
import { getPasswordPairProblem } from '../utils/passwordRules';
import './AccessManagement.css';

// Super admins: people who can sign in and see the summary dashboard (role VIEWER).
const COUNTRIES = ['Kenya', 'Nigeria', 'Ghana', 'Zambia'];
const EMPTY = { fullName: '', email: '', password: '', confirmPassword: '', country: '' };

export default function DashboardAccessPanel({ token, onSessionExpired }) {
  const [users, setUsers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [rowFeedback, setRowFeedback] = useState({});
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    const controller = new AbortController();
    axios.get(`${API_BASE_URL}/api/auth/users`, { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } })
      .then(r => { setUsers((r.data.users || []).filter(u => u.role === 'VIEWER')); setLoaded(true); })
      .catch(e => {
        if (axios.isCancel(e)) return;
        if (e.response?.status === 401) onSessionExpired();
        else { setError('Unable to load dashboard users.'); setLoaded(true); }
      });
    return () => controller.abort();
  }, [token, onSessionExpired]);

  async function createUser(event) {
    event.preventDefault(); setError(''); setMessage('');
    const problem = !form.fullName.trim() || !form.email.trim() ? 'Enter the full name and email address.' : getPasswordPairProblem(form.password, form.confirmPassword, form);
    if (problem) { setError(problem); return; }
    setBusy(true);
    try {
      const r = await axios.post(`${API_BASE_URL}/api/auth/users`, { ...form, role: 'VIEWER' }, auth);
      setUsers(current => [...current, r.data.user]); setForm(EMPTY);
      setMessage(`${r.data.user.fullName} can now sign in through the staff sign-in page.`);
    } catch (e) { if (e.response?.status === 401) onSessionExpired(); else setError(e.response?.data?.message || 'Unable to create this user.'); }
    finally { setBusy(false); }
  }

  async function sendReset(user) {
    setRowFeedback(current => ({ ...current, [user.id]: { tone: 'info', text: 'Sending…' } }));
    try {
      await axios.post(`${API_BASE_URL}/api/auth/users/${user.id}/password-reset`, {}, auth);
      setRowFeedback(current => ({ ...current, [user.id]: { tone: 'ok', text: `Reset link sent to ${user.email}.` } }));
    } catch (e) {
      if (e.response?.status === 401) { onSessionExpired(); return; }
      setRowFeedback(current => ({ ...current, [user.id]: { tone: 'bad', text: e.response?.data?.message || 'The reset email could not be sent.' } }));
    }
  }

  const activeCount = users.filter(u => u.isActive).length;

  return <section className="am-section" aria-labelledby="am-users-title">
    <header className="am-section-header">
      <span className="am-section-icon" aria-hidden="true"><i className="bi bi-people" /></span>
      <div>
        <h2 id="am-users-title">Dashboard users</h2>
        <p>People who sign in to see the summary statistics on this dashboard. They never see individual applications. Restrict them to one country or give access to all four.</p>
      </div>
      <span className="am-count">{activeCount} active</span>
    </header>

    <div className="am-split">
      <div className="am-card am-form-card">
        <h3>Add a dashboard user</h3>
        <form onSubmit={createUser} noValidate>
          <div className="am-fields">
            <label className="am-field"><span>Full name</span><input className="form-control" required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} autoComplete="off" /></label>
            <label className="am-field"><span>Email address</span><input className="form-control" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} autoComplete="off" /></label>
            <label className="am-field am-field-wide"><span>Country access</span><select className="form-select" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}><option value="">All four countries</option>{COUNTRIES.map(c => <option key={c}>{c}</option>)}</select></label>
          </div>
          <PasswordFields
            password={form.password}
            confirmPassword={form.confirmPassword}
            onPasswordChange={value => setForm(current => ({ ...current, password: value }))}
            onConfirmPasswordChange={value => setForm(current => ({ ...current, confirmPassword: value }))}
            person={form}
            note="You are choosing this password for someone else. Tell them in person or by phone, never by email or chat. They can choose their own with “Forgot your password?” on the sign-in page."
          />
          {error && <p className="am-feedback is-bad" role="alert"><i className="bi bi-exclamation-circle-fill" aria-hidden="true" /> {error}</p>}
          {message && <p className="am-feedback is-ok" role="status"><i className="bi bi-check-circle-fill" aria-hidden="true" /> {message}</p>}
          <button type="submit" className="btn ss-btn-primary am-submit" disabled={busy}><i className="bi bi-person-plus" aria-hidden="true" /> {busy ? 'Creating…' : 'Create dashboard user'}</button>
        </form>
      </div>

      <div className="am-card am-list-card">
        <h3>People with access <span className="am-muted">({users.length})</span></h3>
        {!loaded ? <p className="am-empty">Loading…</p> : users.length === 0 ? <p className="am-empty"><i className="bi bi-person-dash" aria-hidden="true" /> No dashboard users yet. People you add appear here.</p> : <ul className="am-list">{users.map(u => <li key={u.id} className={u.isActive ? '' : 'is-inactive'}>
          <div className="am-row-main">
            <span className="am-avatar" aria-hidden="true">{(u.fullName || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}</span>
            <div className="am-row-text">
              <strong>{u.fullName}</strong>
              {u.email && <span className="am-row-email">{u.email}</span>}
              <span className="am-tags"><span className="am-tag">{u.country || 'All countries'}</span><span className={`am-tag ${u.isActive ? 'is-ok' : 'is-muted'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></span>
            </div>
          </div>
          {u.isActive && <div className="am-row-actions"><button type="button" className="btn btn-outline-dark btn-sm" onClick={() => sendReset(u)}><i className="bi bi-envelope" aria-hidden="true" /> Send reset link<span className="visually-hidden"> to {u.fullName}</span></button></div>}
          {rowFeedback[u.id] && <p className={`am-feedback is-${rowFeedback[u.id].tone}`} role="status">{rowFeedback[u.id].text}</p>}
        </li>)}</ul>}
      </div>
    </div>
  </section>;
}
