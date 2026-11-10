import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import PasswordFields from './PasswordFields';
import { getPasswordPairProblem } from '../utils/passwordRules';
const EMPTY = { fullName: '', email: '', password: '', confirmPassword: '', country: '' };
export default function DashboardAccessPanel({ token, onSessionExpired }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    axios.get(`${API_BASE_URL}/api/auth/users`, { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } }).then(r => setUsers((r.data.users || []).filter(u => u.role === 'VIEWER'))).catch(e => {
      if (axios.isCancel(e)) return;
      if (e.response?.status === 401) onSessionExpired();
      else setError('Unable to load dashboard users.');
    });
    return () => controller.abort();
  }, [token, onSessionExpired]);
  async function createUser(event) {
    event.preventDefault(); setError(''); setMessage('');
    const problem = !form.fullName.trim() || !form.email.trim() ? 'Enter the full name and email address.' : getPasswordPairProblem(form.password, form.confirmPassword, form);
    if (problem) { setError(problem); return; }
    setBusy(true);
    try {
      const r = await axios.post(`${API_BASE_URL}/api/auth/users`, { ...form, role: 'VIEWER' }, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(current => [...current, r.data.user]); setForm(EMPTY);
      setMessage('Dashboard user created. They can sign in through the existing staff login.');
    } catch (e) { if (e.response?.status === 401) onSessionExpired(); else setError(e.response?.data?.message || 'Unable to create this user.'); }
    finally { setBusy(false); }
  }
  return <details className="df-dashboard-access"><summary><i className="bi bi-person-plus" aria-hidden="true" /> Manage dashboard access <span>Super Admin</span></summary>
    <p>Dashboard users see summary statistics only. Choose a country to restrict access, or explicitly grant all-country access.</p>
    <form onSubmit={createUser} className="df-dashboard-user-form" noValidate>
      <label>Full name<input className="form-control" required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} autoComplete="name" /></label>
      <label>Email<input className="form-control" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} autoComplete="off" /></label>
      <label>Country access<select className="form-select" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}><option value="">All four countries</option>{['Kenya', 'Nigeria', 'Ghana', 'Zambia'].map(c => <option key={c}>{c}</option>)}</select></label>
      <div className="df-dashboard-user-password">
        <PasswordFields
          password={form.password}
          confirmPassword={form.confirmPassword}
          onPasswordChange={value => setForm(current => ({ ...current, password: value }))}
          onConfirmPasswordChange={value => setForm(current => ({ ...current, confirmPassword: value }))}
          person={form}
          note="You are choosing this password for someone else. Tell them in person or by phone, never by email or chat. They can choose their own with “Forgot your password?” on the sign-in page."
        />
      </div>
      <button type="submit" className="btn ss-btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create dashboard user'}</button>
    </form>
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    {users.length > 0 && <ul className="df-dashboard-user-list">{users.map(u => <li key={u.id}><strong>{u.fullName}</strong><span>{u.country || 'All countries'} · {u.isActive ? 'Active' : 'Inactive'}</span></li>)}</ul>}
  </details>;
}
