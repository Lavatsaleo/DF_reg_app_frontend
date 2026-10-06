import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import ApplicationRegionMap from '../components/ApplicationRegionMap';
import DashboardAccessPanel from '../components/DashboardAccessPanel';
import './ApplicationDashboard.css';
const COUNTRIES = ['Kenya', 'Nigeria', 'Ghana', 'Zambia'];
const PATHWAY_NAMES = { PHYSICAL_ACADEMY: 'Physical Academy', VIRTUAL_ACADEMY: 'Virtual Academy', DIGITAL_ENTREPRENEURSHIP: 'Digital Entrepreneurship', UNKNOWN: 'Not recorded' };
const number = n => Number(n || 0).toLocaleString();
const monthLabel = m => new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(m + '-01T00:00:00Z'));
const SEXES = ['Female', 'Male', 'Not recorded'];
const SEX_CLASS = { Female: 'female', Male: 'male', 'Not recorded': 'unrecorded' };
const share = (part, whole) => whole ? Math.round(part / whole * 100) : 0;
const sexSummary = bySex => SEXES.filter(sex => bySex?.[sex]).map(sex => `${sex} ${number(bySex[sex])}`).join(' · ') || 'No applications';
function GenderLegend() {
  return <ul className="df-gender-legend" aria-label="Gender colours">{SEXES.map(sex => <li key={sex}><span className={`df-sex-key ${SEX_CLASS[sex]}`} aria-hidden="true" />{sex}</li>)}</ul>;
}
// One fill per sex, sized by its share of the item; empty segments are dropped so gaps stay even.
function SexSegments({ bySex, count }) {
  return SEXES.filter(sex => bySex?.[sex]).map(sex => <span key={sex} className={`df-sex-segment ${SEX_CLASS[sex]}`} style={{ flexGrow: bySex[sex] / count }} />);
}
function hoverProps(tooltip, title, bySex) {
  const show = event => {
    const box = event.currentTarget.getBoundingClientRect();
    tooltip.show({ title, bySex, x: event.clientX ?? box.left + box.width / 2, y: event.clientY ?? box.top });
  };
  return { tabIndex: 0, onPointerMove: show, onFocus: show, onPointerLeave: tooltip.hide, onBlur: tooltip.hide };
}
function Bars({ items, total, palette = 'teal', split, tooltip }) {
  const max = Math.max(1, ...items.map(item => item.count));
  return <ul className={`df-chart-bars ${palette}`}>{items.map(item => <li key={item.name} {...(split && item.count ? hoverProps(tooltip, item.name, item.bySex) : {})}><div><span>{item.name}</span><strong>{number(item.count)} <small>{share(item.count, total)}%</small></strong></div><div className={`df-bar-track${split ? ' split' : ''}`} aria-hidden="true"><span style={{ width: `${item.count / max * 100}%` }}>{split && <SexSegments bySex={item.bySex} count={item.count} />}</span></div>{split && item.count > 0 && <small className="df-sex-breakdown">{sexSummary(item.bySex)}</small>}</li>)}</ul>;
}
function GenderCard({ data, tooltip }) {
  const total = data.totals.applications;
  const applied = data.genderFunnel[0]?.count || 0;
  return <section className="df-dashboard-card df-gender-card"><div className="df-card-heading"><div><span>GENDER DISAGGREGATION</span><h2>Who is applying and progressing</h2><p>Female and male applicants at each stage. Shares are of everyone at that stage.</p></div><GenderLegend /></div>
    <div className="df-gender-grid">
      <div className="df-gender-split">{data.genders.map(g => <div key={g.name} className="df-gender-stat"><span><i className={`df-sex-key ${SEX_CLASS[g.name]}`} aria-hidden="true" />{g.name}</span><strong>{number(g.count)}</strong><small>{share(g.count, total)}% of applicants</small></div>)}</div>
      <ul className="df-gender-funnel">{data.genderFunnel.map(stage => <li key={stage.name} {...(stage.count ? hoverProps(tooltip, stage.name, stage.bySex) : {})}><div><span>{stage.name}</span><strong>{number(stage.count)} <small>{share(stage.count, applied)}% of applicants</small></strong></div><div className="df-stack-track" aria-hidden="true">{stage.count ? <SexSegments bySex={stage.bySex} count={stage.count} /> : <span className="df-sex-segment empty" />}</div><small className="df-sex-breakdown">{stage.count ? SEXES.filter(sex => stage.bySex[sex]).map(sex => `${sex} ${share(stage.bySex[sex], stage.count)}%`).join(' · ') : 'Nobody at this stage yet'}</small></li>)}</ul>
    </div>
    <details className="df-region-table"><summary>View gender table</summary><div className="table-responsive"><table className="table"><caption>Applicants by gender at each stage for the selected filters</caption><thead><tr><th scope="col">Stage</th>{SEXES.map(sex => <th scope="col" key={sex}>{sex}</th>)}<th scope="col">Total</th><th scope="col">Female share</th></tr></thead><tbody>{data.genderFunnel.map(stage => <tr key={stage.name}><td>{stage.name}</td>{SEXES.map(sex => <td key={sex}>{number(stage.bySex[sex])}</td>)}<td>{number(stage.count)}</td><td>{share(stage.bySex.Female, stage.count)}%</td></tr>)}</tbody></table></div></details>
  </section>;
}
function ChartTooltip({ tip }) {
  if (!tip) return null;
  const count = SEXES.reduce((n, sex) => n + (tip.bySex?.[sex] || 0), 0);
  const left = Math.min(tip.x + 14, window.innerWidth - 220);
  return <div className="df-chart-tooltip" role="presentation" style={{ left, top: tip.y + 14 }}><p>{tip.title}</p>{SEXES.map(sex => <div key={sex}><i className={`df-sex-key line ${SEX_CLASS[sex]}`} /><strong>{number(tip.bySex?.[sex])}</strong><span>{sex} · {share(tip.bySex?.[sex], count)}%</span></div>)}</div>;
}
function Metric({ label, value, note, icon, tone }) {
  return <article className={`df-metric ${tone}`}><div className="df-metric-top"><span>{label}</span><i className={`bi ${icon}`} aria-hidden="true" /></div><strong>{value}</strong><p>{note}</p></article>;
}
export default function ApplicationDashboardPage({ staffUser, token, onStaffLogout, onSessionExpired, onShowCommittee }) {
  const fixedCountry = staffUser?.role === 'VIEWER' ? staffUser.country || '' : '';
  const [country, setCountry] = useState(fixedCountry);
  const [month, setMonth] = useState('');
  const [sex, setSex] = useState('');
  const [splitByGender, setSplitByGender] = useState(false);
  const [tip, setTip] = useState(null);
  const tooltip = { show: setTip, hide: () => setTip(null) };
  const [mode, setMode] = useState('live');
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError('');
      try {
        const r = await axios.get(`${API_BASE_URL}/api/dashboard`, { params: { country, month, sex, mode }, signal: controller.signal, headers: { Authorization: `Bearer ${token}` } });
        if (!controller.signal.aborted) setData(r.data);
      } catch (e) {
        if (controller.signal.aborted) return;
        setData(null);
        if (e.response?.status === 401) onSessionExpired();
        else setError(e.response?.data?.message || 'Unable to load the dashboard. Please try again.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [country, month, sex, mode, refresh, token, onSessionExpired]);
  const scopeCountries = fixedCountry ? [fixedCountry] : COUNTRIES;
  const visibleCountries = country ? [country] : scopeCountries;
  const total = data?.totals.applications || 0;
  const monthlyMax = Math.max(1, ...(data?.monthly || []).map(m => m.count));
  // A single-gender view has nothing to split.
  const split = splitByGender && !sex;
  return <main id="main-content" className="df-dashboard-page">
    <div className="df-dashboard-shell">
      <header className="df-dashboard-header"><div><span className="df-dashboard-eyebrow">DIGITAL FUTURES / PROGRAMME INSIGHTS</span><h1>Application dashboard<span>.</span></h1><p>Understand who is applying, where they live and how reach is growing.</p></div><div className="df-dashboard-user"><span>{staffUser?.fullName}</span><small>{staffUser?.role === 'ADMIN' ? 'Super Admin' : 'Dashboard user'} · {fixedCountry || 'All countries'}</small><div>{staffUser?.role === 'ADMIN' && <button type="button" className="btn ss-btn-outline" onClick={onShowCommittee}>Committee workspace</button>}<button type="button" className="btn ss-btn-outline" onClick={onStaffLogout}>Sign out</button></div></div></header>
      <section className="df-dashboard-filters" aria-label="Dashboard filters">
        <label><span>Country</span><select className="form-select" value={country} disabled={Boolean(fixedCountry)} onChange={e => { setCountry(e.target.value); setMonth(''); }}>{!fixedCountry && <option value="">All countries</option>}{scopeCountries.map(c => <option key={c}>{c}</option>)}</select></label>
        <label><span>Application month</span><select className="form-select" value={month} onChange={e => setMonth(e.target.value)}><option value="">All months</option>{month && !data?.availableMonths.includes(month) && <option value={month}>{monthLabel(month)}</option>}{(data?.availableMonths || []).map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}</select></label>
        <label><span>Gender</span><select className="form-select" value={sex} onChange={e => setSex(e.target.value)}><option value="">All genders</option>{SEXES.map(s => <option key={s}>{s}</option>)}</select></label>
        <button type="button" className="btn ss-btn-outline df-split-toggle" aria-pressed={split} disabled={Boolean(sex)} onClick={() => setSplitByGender(v => !v)}><i className="bi bi-gender-ambiguous" aria-hidden="true" /> Split by gender</button>
        <div className="df-data-mode" role="group" aria-label="Data source"><button type="button" aria-pressed={mode === 'live'} onClick={() => { setMode('live'); setMonth(''); }}>Live data</button><button type="button" aria-pressed={mode === 'demo'} onClick={() => { setMode('demo'); setMonth(''); }}>Showcase data</button></div>
        <button type="button" className="btn ss-btn-outline" onClick={() => setRefresh(n => n + 1)} disabled={loading}><i className="bi bi-arrow-clockwise" aria-hidden="true" /> Refresh</button>
      </section>
      {mode === 'demo' && <div className="df-demo-notice" role="status"><i className="bi bi-stars" aria-hidden="true" /><strong>Showcase mode</strong> Illustrative data only. These figures are not real applications and are never saved to the database.</div>}
      {error && <div className="alert ss-alert-error" role="alert">{error}</div>}
      {loading ? <div className="df-dashboard-loading" role="status"><span className="spinner-border" aria-hidden="true" /><p>Loading application insights…</p></div> : data && <>
        <div className="df-dashboard-context"><span>{country || 'All programme countries'} · {month ? monthLabel(month) : 'All application months'} · {sex ? `${sex} applicants` : 'All genders'}</span><small>{data.dataMode === 'demo' ? 'Illustrative dataset' : 'Live application records'} · Updated {new Date(data.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></div>
        <section className="df-metric-grid" aria-label="Application indicators">
          <Metric label="People applied" value={number(total)} note="Submitted application records; excludes drafts" icon="bi-people" tone="yellow" />
          <Metric label="Initially eligible" value={number(data.totals.eligible)} note={`${total ? Math.round(data.totals.eligible / total * 100) : 0}% of applications in this view`} icon="bi-person-check" tone="teal" />
          <Metric label="ICT tests completed" value={number(data.totals.skillsTestCompleted)} note={data.totals.averageTestScore === null ? 'No submitted test results yet' : `${data.totals.averageTestScore}% average test score`} icon="bi-laptop" tone="green" />
          <Metric label="Shortlisted / enrolled" value={number(data.totals.shortlisted)} note="Approved for enrolment or enrolled" icon="bi-award" tone="orange" />
        </section>
        {total === 0 && <div className="df-empty-state"><h2>No applications in this view</h2><p>Change the country, month or gender, or choose Showcase data to demonstrate the dashboard.</p></div>}
        <GenderCard data={data} tooltip={tooltip} />
        {split && <div className="df-split-notice"><GenderLegend /><small>Age, month, country and pathway charts are split by gender (the map shows totals). Hover or focus a bar for exact counts.</small></div>}
        <div className="df-dashboard-chart-grid">
          <section className="df-dashboard-card"><div className="df-card-heading"><div><span>WHO IS APPLYING</span><h2>Age at application</h2></div><i className="bi bi-person-lines-fill" aria-hidden="true" /></div><Bars items={data.ages} total={total} split={split} tooltip={tooltip} /><p className="df-chart-note">Age recorded when the application was submitted. Missing ages are shown separately.</p></section>
          <section className="df-dashboard-card"><div className="df-card-heading"><div><span>APPLICATION MOMENTUM</span><h2>Applications by month</h2></div><i className="bi bi-calendar3" aria-hidden="true" /></div>{data.monthly.length ? <div className="df-monthly-chart" role="img" aria-label={data.monthly.map(m => `${monthLabel(m.name)}: ${m.count}`).join('; ')}>{data.monthly.map(m => <div className="df-month-column" key={m.name} {...(split && m.count ? hoverProps(tooltip, monthLabel(m.name), m.bySex) : {})}><strong>{number(m.count)}</strong><div className={split ? 'split' : undefined}><span style={{ height: `${m.count / monthlyMax * 100}%` }}>{split && <SexSegments bySex={m.bySex} count={m.count} />}</span></div><small>{monthLabel(m.name)}</small></div>)}</div> : <p className="df-chart-note">No monthly activity to display.</p>}<p className="df-chart-note">Submission month (UTC). All indicators follow the selected filters.</p></section>
          <section className="df-dashboard-card"><div className="df-card-heading"><div><span>PROGRAMME REACH</span><h2>Applications by country</h2></div><span className="df-count-pill">{data.totals.countries} countries</span></div><Bars items={data.countries} total={total} palette="orange" split={split} tooltip={tooltip} /></section>
          <section className="df-dashboard-card"><div className="df-card-heading"><div><span>LEARNING PATHWAYS</span><h2>Pathway choices</h2></div><i className="bi bi-signpost-split" aria-hidden="true" /></div><Bars items={data.pathways.map(p => ({ ...p, name: PATHWAY_NAMES[p.name] || p.name }))} total={total} palette="green" split={split} tooltip={tooltip} /></section>
        </div>
        <section className="df-dashboard-card df-geography-card"><div className="df-card-heading"><div><span>WHERE APPLICATIONS COME FROM</span><h2>Geographic concentration</h2><p>Counties in Kenya, states in Nigeria, regions in Ghana and provinces in Zambia.</p></div><i className="bi bi-globe-africa" aria-hidden="true" /></div><ApplicationRegionMap regions={data.regions} countries={visibleCountries} onCountryChange={setCountry} />
          <details className="df-region-table"><summary>View all regional counts ({data.regions.length})</summary><div className="table-responsive"><table className="table"><caption>Regional totals for the selected country and month filters</caption><thead><tr><th scope="col">Country</th><th scope="col">Administrative region</th><th scope="col">Applications</th><th scope="col">Share of this view</th></tr></thead><tbody>{data.regions.map(r => <tr key={`${r.country}|${r.name}`}><td>{r.country}</td><td>{r.name}</td><td>{number(r.count)}</td><td>{total ? (r.count / total * 100).toFixed(1) : 0}%</td></tr>)}</tbody></table></div></details>
        </section>
        <ChartTooltip tip={tip} />
      </>}
      {staffUser?.role === 'ADMIN' && <DashboardAccessPanel token={token} onSessionExpired={onSessionExpired} />}
      <footer className="df-dashboard-footnote">Digital Futures · Summary statistics only · Dashboard access does not grant access to individual applications.</footer>
    </div>
  </main>;
}
