import { useState } from 'react';
import geography from '../data/applicationRegions.json';
const key = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const level = { Kenya: 'Counties', Nigeria: 'States & FCT', Ghana: 'Regions', Zambia: 'Provinces' };
export default function ApplicationRegionMap({ regions, countries, onCountryChange }) {
  const [selected, setSelected] = useState(null);
  const counts = new Map(regions.map(r => [`${r.country}|${key(r.name)}`, r.count]));
  const max = Math.max(1, ...regions.filter(r => r.name !== 'Not recorded').map(r => r.count));
  const mappedKeys = new Set();
  countries.forEach(country => geography[country]?.features.forEach(f => mappedKeys.add(`${country}|${key(f.name)}`)));
  const missing = regions.filter(r => !mappedKeys.has(`${r.country}|${key(r.name)}`)).reduce((n, r) => n + r.count, 0);
  return (
    <>
      <div className={`df-map-grid ${countries.length === 1 ? 'single' : ''}`}>
        {countries.map(country => {
          const geo = geography[country];
          if (!geo) return null;
          const [left, bottom, right, top] = geo.bounds;
          const cos = Math.cos((top + bottom) / 2 * Math.PI / 180);
          const scale = Math.min(500 / ((right - left) * cos), 285 / (top - bottom));
          const ox = (560 - (right - left) * cos * scale) / 2;
          const oy = (325 - (top - bottom) * scale) / 2;
          const project = ([lon, lat]) => [ox + (lon - left) * cos * scale, oy + (top - lat) * scale];
          const path = f => (f.type === 'Polygon' ? [f.coordinates] : f.coordinates).map(poly => poly.map(ring => ring.map((point, i) => `${i ? 'L' : 'M'}${project(point).map(v => v.toFixed(1)).join(',')}`).join(' ') + 'Z').join(' ')).join(' ');
          const total = regions.filter(r => r.country === country).reduce((n, r) => n + r.count, 0);
          return (
            <div className="df-country-map" key={country}>
              <div className="df-map-heading"><button type="button" onClick={() => onCountryChange(country)}>{country} <i className="bi bi-arrow-up-right" aria-hidden="true" /></button><span>{total.toLocaleString()} applications</span></div>
              <svg viewBox="0 0 560 325" role="group" aria-label={`${country}: applications by ${level[country].toLowerCase()}. Exact counts are also in the table below.`}>
                {geo.features.map(f => <path key={f.name} d={path(f)} className="df-region-shape" fillRule="evenodd" />)}
                {[...geo.features].sort((a, b) => (counts.get(`${country}|${key(b.name)}`) || 0) - (counts.get(`${country}|${key(a.name)}`) || 0)).map(f => {
                  const count = counts.get(`${country}|${key(f.name)}`) || 0;
                  if (!count) return null;
                  const [cx, cy] = project(f.point);
                  const active = selected?.country === country && selected?.name === f.name;
                  const label = `${f.name}: ${count.toLocaleString()} applications`;
                  return <circle key={f.name} cx={cx} cy={cy} r={Math.max(3, 22 * Math.sqrt(count / max))} className={`df-map-bubble ${active ? 'active' : ''}`} tabIndex="0" role="button" aria-label={label} aria-pressed={active} onClick={() => setSelected({ country, name: f.name })} onKeyDown={event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); setSelected({ country, name: f.name }); } }}><title>{label}</title></circle>;
                })}
              </svg>
              <small>{level[country]} · boundary source year {geo.sourceYear}</small>
            </div>
          );
        })}
      </div>
      <div className="df-map-legend"><span className="df-legend-dot" /> Bubble area represents application count. Select a bubble for its total.</div>
      <p className="df-map-selection" role="status">{selected && countries.includes(selected.country) ? `${selected.country} · ${selected.name}: ${(counts.get(`${selected.country}|${key(selected.name)}`) || 0).toLocaleString()} applications` : 'Select a country heading to focus the dashboard on that country.'}</p>
      {missing > 0 && <p className="df-data-note">{missing.toLocaleString()} applications have missing or unmatched regions and are not plotted. They remain included in totals and the table.</p>}
      <details className="df-map-attribution"><summary>Map sources and interpretation</summary><p>geoBoundaries gbOpen: Kenya (RCMRD/Africa GeoPortal, public domain); Nigeria (GRID3, CC BY 4.0); Ghana (OpenStreetMap, CC BY-SA 2.0); Zambia (Zambia Data Hub, CC BY 4.0). Geometry simplified for display. Bubbles are placed inside administrative regions, not at applicants’ addresses. These are counts, not population-adjusted rates.</p><a href="https://www.geoboundaries.org/" target="_blank" rel="noreferrer">geoBoundaries</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a> · <a href="https://creativecommons.org/licenses/by-sa/2.0/" target="_blank" rel="noreferrer">CC BY-SA 2.0</a></details>
    </>
  );
}
