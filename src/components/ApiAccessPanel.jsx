import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

// Super admins create read-only API keys for analysts pulling data into R / RStudio.
const COUNTRIES = ['Kenya', 'Nigeria', 'Ghana', 'Zambia'];
const EMPTY = { name: '', country: '', expiresInDays: '90', includePersonalData: false };
const STATUS_LABEL = { ACTIVE: 'Active', EXPIRED: 'Expired', REVOKED: 'Revoked' };

const formatDate = value => (value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never');

function getApiUrl() {
  return (API_BASE_URL || window.location.origin).replace(/\/+$/, '');
}

export default function ApiAccessPanel({ token, onSessionExpired }) {
  const [keys, setKeys] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState('');
  const newKeyRef = useRef(null);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  function handleError(e, fallback) {
    if (e.response?.status === 401) onSessionExpired();
    else setError(e.response?.data?.message || fallback);
  }

  useEffect(() => {
    const controller = new AbortController();
    axios.get(`${API_BASE_URL}/api/data/keys`, { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } })
      .then(r => setKeys(r.data.keys || []))
      .catch(e => {
        if (axios.isCancel(e)) return;
        if (e.response?.status === 401) onSessionExpired();
        else setError('Unable to load API keys.');
      });
    return () => controller.abort();
  }, [token, onSessionExpired]);

  // Move focus to the one-time key as soon as it appears, so keyboard and screen reader users find it.
  useEffect(() => {
    if (newKey) newKeyRef.current?.focus();
  }, [newKey]);

  async function createKey(event) {
    event.preventDefault();
    setError(''); setMessage(''); setCopied('');
    if (form.name.trim().length < 3) { setError('Give the key a name of at least 3 characters, such as "M&E team – RStudio".'); return; }
    setBusy(true);
    try {
      const r = await axios.post(`${API_BASE_URL}/api/data/keys`, { ...form, name: form.name.trim(), expiresInDays: Number(form.expiresInDays) }, auth);
      setKeys(current => [r.data.key, ...current]);
      setNewKey({ value: r.data.apiKey, name: r.data.key.name });
      setForm(EMPTY);
    } catch (e) { handleError(e, 'Unable to create the API key.'); }
    finally { setBusy(false); }
  }

  async function revokeKey(key) {
    if (!window.confirm(`Revoke "${key.name}"? Anyone using it in R will lose access straight away.`)) return;
    setError(''); setMessage('');
    try {
      const r = await axios.post(`${API_BASE_URL}/api/data/keys/${key.id}/revoke`, {}, auth);
      setKeys(current => current.map(k => (k.id === key.id ? r.data.key : k)));
      setMessage(`"${key.name}" has been revoked.`);
    } catch (e) { handleError(e, 'Unable to revoke the API key.'); }
  }

  async function copy(text, label) {
    try { await navigator.clipboard.writeText(text); setCopied(label); }
    catch { setCopied(''); setError('Copying is blocked in this browser. Select the text and copy it instead.'); }
  }

  const renviron = newKey ? `DF_API_URL=${getApiUrl()}\nDF_API_KEY=${newKey.value}` : '';

  return <details className="df-dashboard-access df-api-access">
    <summary><i className="bi bi-code-slash" aria-hidden="true" /> API access for R <span>Super Admin</span></summary>
    <p>Create a read-only key so an analyst can pull application data into R / RStudio. Keys are de-identified by default: no names, phone numbers, emails, dates of birth or free-text answers.</p>

    {newKey && <div className="df-api-new-key" role="region" aria-labelledby="df-api-new-key-title">
      <h3 id="df-api-new-key-title" ref={newKeyRef} tabIndex="-1"><i className="bi bi-exclamation-triangle-fill" aria-hidden="true" /> Copy this key now: it will not be shown again</h3>
      <p>Give it to “{newKey.name}” in person or through a password manager, never by email or chat. They add these two lines to their <code>.Renviron</code> file (in RStudio run <code>usethis::edit_r_environ()</code>), then restart R:</p>
      <pre><code>{renviron}</code></pre>
      <div className="df-api-new-key-actions">
        <button type="button" className="btn ss-btn-primary" onClick={() => copy(renviron, 'lines')}><i className="bi bi-clipboard" aria-hidden="true" /> Copy both lines</button>
        <button type="button" className="btn btn-outline-dark" onClick={() => copy(newKey.value, 'key')}>Copy key only</button>
        <button type="button" className="btn btn-link" onClick={() => setNewKey(null)}>I have saved it</button>
      </div>
      <p role="status" className="df-api-copied">{copied === 'lines' ? 'Both lines copied.' : copied === 'key' ? 'Key copied.' : ''}</p>
      <p>Then in R: <code>source("digital_futures_data.R")</code> and <code>applicants &lt;- df_get("applicants")</code>. The script and instructions are in <code>backend/docs/r</code>.</p>
    </div>}

    <form onSubmit={createKey} className="df-dashboard-user-form" noValidate>
      <label>Key name<input className="form-control" value={form.name} maxLength={120} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. M&E team – RStudio" aria-describedby="df-api-name-hint" /><small id="df-api-name-hint">Who uses it and for what, so you know which key to revoke later.</small></label>
      <label>Country access<select className="form-select" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}><option value="">All four countries</option>{COUNTRIES.map(c => <option key={c}>{c}</option>)}</select></label>
      <label>Expires after<select className="form-select" value={form.expiresInDays} onChange={e => setForm({ ...form, expiresInDays: e.target.value })}>{[30, 90, 180, 365].map(d => <option key={d} value={d}>{d} days</option>)}</select></label>
      <div className="df-api-personal">
        <label className="df-api-check"><input type="checkbox" checked={form.includePersonalData} onChange={e => setForm({ ...form, includePersonalData: e.target.checked })} aria-describedby="df-api-personal-hint" /> Include personal data</label>
        <small id="df-api-personal-hint">Adds names, phone numbers, emails, dates of birth, next of kin and free-text answers. Only tick this when the person must contact participants and has a data-protection reason.</small>
      </div>
      <button type="submit" className="btn ss-btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create API key'}</button>
    </form>
    {message && <p role="status">{message}</p>}{error && <p role="alert" className="df-api-error">{error}</p>}

    {keys.length > 0 && <ul className="df-api-key-list" aria-label="API keys">{keys.map(k => <li key={k.id} className={k.status !== 'ACTIVE' ? 'is-inactive' : ''}>
      <div>
        <strong>{k.name}</strong>
        <span><code>{k.keyPrefix}</code> · {k.country || 'All countries'} · {k.includePersonalData ? 'Personal data' : 'De-identified'}</span>
        <small>{STATUS_LABEL[k.status]} · {k.status === 'REVOKED' ? `revoked ${formatDate(k.revokedAt)}` : `expires ${formatDate(k.expiresAt)}`} · last used {formatDate(k.lastUsedAt)}{k.createdByName ? ` · created by ${k.createdByName}` : ''}</small>
      </div>
      {k.status === 'ACTIVE' && <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => revokeKey(k)}>Revoke<span className="visually-hidden"> {k.name}</span></button>}
    </li>)}</ul>}
  </details>;
}
