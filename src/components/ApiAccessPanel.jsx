import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import './AccessManagement.css';

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
  const [confirmRevokeId, setConfirmRevokeId] = useState('');
  const [showInactive, setShowInactive] = useState(false);
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
    setError(''); setMessage('');
    try {
      const r = await axios.post(`${API_BASE_URL}/api/data/keys/${key.id}/revoke`, {}, auth);
      setKeys(current => current.map(k => (k.id === key.id ? r.data.key : k)));
      setConfirmRevokeId('');
      setMessage(`"${key.name}" has been revoked. It stopped working straight away.`);
    } catch (e) { handleError(e, 'Unable to revoke the API key.'); }
  }

  async function copy(text, label) {
    try { await navigator.clipboard.writeText(text); setCopied(label); }
    catch { setCopied(''); setError('Copying is blocked in this browser. Select the text and copy it instead.'); }
  }

  const renviron = newKey ? `DF_API_URL=${getApiUrl()}\nDF_API_KEY=${newKey.value}` : '';
  const activeKeys = keys.filter(k => k.status === 'ACTIVE');
  const inactiveKeys = keys.filter(k => k.status !== 'ACTIVE');

  function renderKey(k) {
    const confirming = confirmRevokeId === k.id;
    return <li key={k.id} className={k.status !== 'ACTIVE' ? 'is-inactive' : ''}>
      <div className="am-row-main">
        <span className="am-avatar is-key" aria-hidden="true"><i className="bi bi-key" /></span>
        <div className="am-row-text">
          <strong>{k.name}</strong>
          <code className="am-row-code">{k.keyPrefix}</code>
          <span className="am-tags">
            <span className={`am-tag ${k.status === 'ACTIVE' ? 'is-ok' : 'is-muted'}`}>{STATUS_LABEL[k.status]}</span>
            <span className="am-tag">{k.country || 'All countries'}</span>
            <span className={`am-tag ${k.includePersonalData ? 'is-warn' : ''}`}>{k.includePersonalData ? 'Personal data' : 'De-identified'}</span>
          </span>
          <dl className="am-meta">
            <div><dt>{k.status === 'REVOKED' ? 'Revoked' : k.status === 'EXPIRED' ? 'Expired' : 'Expires'}</dt><dd>{formatDate(k.status === 'REVOKED' ? k.revokedAt : k.expiresAt)}</dd></div>
            <div><dt>Last used</dt><dd>{formatDate(k.lastUsedAt)}</dd></div>
            {k.createdByName && <div><dt>Created by</dt><dd>{k.createdByName}</dd></div>}
          </dl>
        </div>
      </div>
      {k.status === 'ACTIVE' && <div className="am-row-actions">
        {confirming ? <>
          <span className="am-confirm-text">Anyone using this key loses access straight away.</span>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => revokeKey(k)}>Yes, revoke<span className="visually-hidden"> {k.name}</span></button>
          <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => setConfirmRevokeId('')}>Keep it</button>
        </> : <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setConfirmRevokeId(k.id)}>Revoke<span className="visually-hidden"> {k.name}</span></button>}
      </div>}
    </li>;
  }

  return <section className="am-section" aria-labelledby="am-api-title">
    <header className="am-section-header">
      <span className="am-section-icon" aria-hidden="true"><i className="bi bi-code-slash" /></span>
      <div>
        <h2 id="am-api-title">API access for R</h2>
        <p>Read-only keys that let an analyst pull application data into R / RStudio. Keys are de-identified by default: no names, phone numbers, emails, dates of birth or free-text answers.</p>
      </div>
      <span className="am-count">{activeKeys.length} active</span>
    </header>

    {newKey && <div className="am-new-key" role="region" aria-labelledby="am-new-key-title">
      <h3 id="am-new-key-title" ref={newKeyRef} tabIndex="-1"><i className="bi bi-exclamation-triangle-fill" aria-hidden="true" /> Copy this key now: it will not be shown again</h3>
      <p>Give it to “{newKey.name}” in person or through a password manager, never by email or chat. They paste these two lines into their <code>.Renviron</code> file, then restart R.</p>
      <pre><code>{renviron}</code></pre>
      <div className="am-new-key-actions">
        <button type="button" className="btn ss-btn-primary" onClick={() => copy(renviron, 'lines')}><i className="bi bi-clipboard" aria-hidden="true" /> Copy both lines</button>
        <button type="button" className="btn btn-outline-dark" onClick={() => copy(newKey.value, 'key')}><i className="bi bi-key" aria-hidden="true" /> Copy key only</button>
        <button type="button" className="btn btn-link" onClick={() => setNewKey(null)}>I have saved it, hide the key</button>
      </div>
      <p role="status" className="am-copied">{copied === 'lines' ? 'Both lines copied.' : copied === 'key' ? 'Key copied.' : ''}</p>
    </div>}

    <div className="am-split">
      <div className="am-stack">
        <div className="am-card am-form-card">
          <h3>Create a key</h3>
          <form onSubmit={createKey} noValidate>
            <div className="am-fields">
              <label className="am-field am-field-wide"><span>Key name</span><input className="form-control" value={form.name} maxLength={120} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. M&E team – RStudio" aria-describedby="am-key-name-hint" /><small id="am-key-name-hint">Who uses it and for what, so you know which key to revoke later.</small></label>
              <label className="am-field"><span>Country access</span><select className="form-select" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}><option value="">All four countries</option>{COUNTRIES.map(c => <option key={c}>{c}</option>)}</select></label>
              <label className="am-field"><span>Expires after</span><select className="form-select" value={form.expiresInDays} onChange={e => setForm({ ...form, expiresInDays: e.target.value })}>{[30, 90, 180, 365].map(d => <option key={d} value={d}>{d} days</option>)}</select></label>
            </div>
            <div className={`am-choice ${form.includePersonalData ? 'is-on' : ''}`}>
              <label><input type="checkbox" checked={form.includePersonalData} onChange={e => setForm({ ...form, includePersonalData: e.target.checked })} aria-describedby="am-personal-hint" /> <span>Include personal data</span></label>
              <small id="am-personal-hint">Adds names, phone numbers, emails, dates of birth, next of kin and free-text answers. Only tick this when the person must contact participants and has a data-protection reason.</small>
            </div>
            {error && <p className="am-feedback is-bad" role="alert"><i className="bi bi-exclamation-circle-fill" aria-hidden="true" /> {error}</p>}
            {message && <p className="am-feedback is-ok" role="status"><i className="bi bi-check-circle-fill" aria-hidden="true" /> {message}</p>}
            <button type="submit" className="btn ss-btn-primary am-submit" disabled={busy}><i className="bi bi-plus-circle" aria-hidden="true" /> {busy ? 'Creating…' : 'Create API key'}</button>
          </form>
        </div>

        <div className="am-card am-help-card">
          <h3>Using a key in RStudio</h3>
          <ol className="am-steps">
            <li>Install the packages once: <code>install.packages(c("httr2", "jsonlite"))</code></li>
            <li>Run <code>usethis::edit_r_environ()</code>, paste the two lines shown when the key was created, save and restart R.</li>
            <li>Load the helper script from <code>backend/docs/r</code>: <code>source("digital_futures_data.R")</code></li>
            <li>Pull data: <code>applicants &lt;- df_get("applicants")</code>. Also <code>"status-history"</code>, <code>"skills-tests"</code> and <code>"committee-reviews"</code>.</li>
          </ol>
        </div>
      </div>

      <div className="am-card am-list-card">
        <h3>Active keys <span className="am-muted">({activeKeys.length})</span></h3>
        {activeKeys.length === 0 ? <p className="am-empty"><i className="bi bi-key" aria-hidden="true" /> No active keys. Keys you create appear here.</p> : <ul className="am-list">{activeKeys.map(renderKey)}</ul>}
        {inactiveKeys.length > 0 && <>
          <button type="button" className="btn btn-link am-toggle" aria-expanded={showInactive} onClick={() => setShowInactive(v => !v)}>
            <i className={`bi ${showInactive ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden="true" /> {showInactive ? 'Hide' : 'Show'} revoked and expired keys ({inactiveKeys.length})
          </button>
          {showInactive && <ul className="am-list">{inactiveKeys.map(renderKey)}</ul>}
        </>}
      </div>
    </div>
  </section>;
}
