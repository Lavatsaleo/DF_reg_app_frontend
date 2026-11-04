import { useRef, useState } from 'react';
import geography from '../data/applicationRegions.json';
const key = value => String(value || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const level = { Kenya: 'Counties', Nigeria: 'States & FCT', Ghana: 'Regions', Zambia: 'Provinces' };
const singular = { Kenya: 'county', Nigeria: 'state', Ghana: 'region', Zambia: 'province' };
const SEXES = ['Female', 'Male', 'Not recorded'];
const SEX_CLASS = { Female: 'female', Male: 'male', 'Not recorded': 'unrecorded' };
const number = n => Number(n || 0).toLocaleString();
const share = (part, whole) => whole ? Math.round(part / whole * 100) : 0;
// One-hue sequential ramp (brand yellow, light to dark). Regions with no applications use a neutral fill instead.
const RAMP = ['#ffeeb8', '#ffd457', '#f0ad00', '#b98200', '#6f4e00'];
const VIEW = { width: 560, height: 325 };

// Equal-width classes on a round step (10, 15, 20, 25, 30, 40, 50, 60, 80…) so the legend reads 1–60, 61–120 and so on.
function classStep(max) {
  if (max <= RAMP.length) return 1;
  const power = 10 ** Math.floor(Math.log10(max / RAMP.length));
  return [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map(f => f * power).find(s => Number.isInteger(s) && s * RAMP.length >= max) || 10 * power;
}

function projector(geo) {
  const [left, bottom, right, top] = geo.bounds;
  const cos = Math.cos((top + bottom) / 2 * Math.PI / 180);
  const scale = Math.min((VIEW.width - 24) / ((right - left) * cos), (VIEW.height - 24) / (top - bottom));
  const ox = (VIEW.width - (right - left) * cos * scale) / 2;
  const oy = (VIEW.height - (top - bottom) * scale) / 2;
  const project = ([lon, lat]) => [ox + (lon - left) * cos * scale, oy + (top - lat) * scale];
  const path = f => (f.type === 'Polygon' ? [f.coordinates] : f.coordinates).map(poly => poly.map(ring => ring.map((point, i) => `${i ? 'L' : 'M'}${project(point).map(v => v.toFixed(1)).join(',')}`).join(' ') + 'Z').join(' ')).join(' ');
  return { project, path };
}

export default function ApplicationRegionMap({ regions, countries, onCountryChange, canShowAll }) {
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const wrapRef = useRef(null);

  const counts = new Map(regions.map(r => [`${r.country}|${key(r.name)}`, r]));
  const lookup = (country, name) => counts.get(`${country}|${key(name)}`);
  const mappedKeys = new Set();
  countries.forEach(country => geography[country]?.features.forEach(f => mappedKeys.add(`${country}|${key(f.name)}`)));
  const mapped = regions.filter(r => mappedKeys.has(`${r.country}|${key(r.name)}`));
  const missing = regions.filter(r => !mappedKeys.has(`${r.country}|${key(r.name)}`)).reduce((n, r) => n + r.count, 0);
  const max = Math.max(1, ...mapped.map(r => r.count));
  const step = classStep(max);
  const classes = RAMP.map((colour, i) => ({ colour, from: i * step + 1, to: (i + 1) * step })).filter(c => c.from <= max);
  const fillFor = count => (count ? RAMP[Math.min(RAMP.length - 1, Math.ceil(count / step) - 1)] : undefined);
  const countryTotal = country => regions.filter(r => r.country === country).reduce((n, r) => n + r.count, 0);
  const ranked = [...mapped].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const rankInCountry = r => ranked.filter(o => o.country === r.country).findIndex(o => o.name === r.name) + 1;
  const featureName = (country, name) => geography[country]?.features.find(f => key(f.name) === key(name))?.name || name;
  const same = (a, b) => a && b && a.country === b.country && key(a.name) === key(b.name);

  const focus = hovered || selected;
  const focusRegion = focus && lookup(focus.country, focus.name);
  const multiple = countries.length > 1;

  // The hover card sits at the pointer, or at the region's centre for keyboard and list focus.
  function place(event, country, f) {
    const box = wrapRef.current?.getBoundingClientRect();
    if (!box) return;
    if (event?.clientX != null && event.type.startsWith('pointer')) {
      const px = event.clientX - box.left;
      setHovered({ country, name: f.name, x: px, y: event.clientY - box.top, flip: px > box.width * 0.6 });
      return;
    }
    const target = wrapRef.current.querySelector(`[data-region="${CSS.escape(`${country}|${f.name}`)}"]`);
    const r = target?.getBoundingClientRect();
    const cx = r ? r.left - box.left + r.width / 2 : box.width / 2;
    setHovered({ country, name: f.name, x: cx, y: r ? r.top - box.top + r.height / 2 : 40, flip: cx > box.width * 0.6 });
  }

  return (
    <div className="df-map" ref={wrapRef}>
      <div className={`df-map-layout ${multiple ? '' : 'single'}`}>
        <div className={`df-map-grid ${multiple ? '' : 'single'}`}>
          {countries.map(country => {
            const geo = geography[country];
            if (!geo) return null;
            const { project, path } = projector(geo);
            const total = countryTotal(country);
            const topThree = ranked.filter(r => r.country === country).slice(0, 3);
            const highlight = geo.features.filter(f => same(focus, { country, name: f.name }));
            return (
              <figure className="df-country-map" key={country}>
                <figcaption className="df-map-heading">
                  <div><strong>{country}</strong><span>{number(total)} applications · {level[country].toLowerCase()}</span></div>
                  {multiple
                    ? <button type="button" className="btn btn-sm ss-btn-outline" onClick={() => onCountryChange(country)}>Focus on {country} <i className="bi bi-arrow-up-right" aria-hidden="true" /></button>
                    : canShowAll && <button type="button" className="btn btn-sm ss-btn-outline" onClick={() => onCountryChange('')}><i className="bi bi-arrow-left" aria-hidden="true" /> All countries</button>}
                </figcaption>
                <svg viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} role="group" aria-label={`${country}: applications by ${singular[country]}. Regions with applications can be focused for their count. Exact counts are also in the table below.`}>
                  {geo.features.map(f => {
                    const region = lookup(country, f.name);
                    const label = `${f.name}: ${number(region?.count)} application${region?.count === 1 ? '' : 's'}`;
                    return (
                      <path
                        key={f.name}
                        d={path(f)}
                        data-region={`${country}|${f.name}`}
                        className={`df-region-shape ${region?.count ? 'has-data' : 'empty'}`}
                        style={region?.count ? { fill: fillFor(region.count) } : undefined}
                        fillRule="evenodd"
                        tabIndex={region?.count ? 0 : undefined}
                        role={region?.count ? 'button' : undefined}
                        aria-label={region?.count ? label : undefined}
                        aria-pressed={region?.count ? same(selected, { country, name: f.name }) : undefined}
                        onPointerMove={event => place(event, country, f)}
                        onPointerLeave={() => setHovered(null)}
                        onFocus={event => place(event, country, f)}
                        onBlur={() => setHovered(null)}
                        onClick={() => region?.count && setSelected(same(selected, { country, name: f.name }) ? null : { country, name: f.name })}
                        onKeyDown={event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); setSelected({ country, name: f.name }); } }}
                      >
                        <title>{label}</title>
                      </path>
                    );
                  })}
                  {/* Redraw the focused region on top so its outline is not hidden by neighbours. */}
                  {highlight.map(f => <path key={f.name} d={path(f)} className="df-region-outline" fillRule="evenodd" aria-hidden="true" />)}
                  {topThree.map((r, i) => {
                    const f = geo.features.find(feature => key(feature.name) === key(r.name));
                    if (!f) return null;
                    const [cx, cy] = project(f.point);
                    return (
                      <g key={r.name} className="df-map-label" aria-hidden="true" transform={`translate(${cx.toFixed(1)},${cy.toFixed(1)})`}>
                        <circle r="9" />
                        <text className="rank" dy="0.35em">{i + 1}</text>
                        {!multiple && <text className="name" x="13" dy="0.35em">{f.name}</text>}
                      </g>
                    );
                  })}
                </svg>
              </figure>
            );
          })}
        </div>

        <aside className="df-map-ranking" aria-labelledby="df-map-ranking-title">
          <h3 id="df-map-ranking-title">Top {multiple ? 'regions' : level[countries[0]]?.toLowerCase() || 'regions'}</h3>
          <p>Ranked by number of applications. Select one to highlight it on the map.</p>
          {ranked.length ? (
            <ol>
              {ranked.slice(0, 10).map(r => {
                const f = { name: featureName(r.country, r.name) };
                const isSelected = same(selected, r);
                return (
                  <li key={`${r.country}|${r.name}`}>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      className={same(focus, r) ? 'is-focus' : ''}
                      onClick={() => setSelected(isSelected ? null : { country: r.country, name: f.name })}
                      onPointerEnter={() => place(null, r.country, f)}
                      onPointerLeave={() => setHovered(null)}
                      onFocus={() => place(null, r.country, f)}
                      onBlur={() => setHovered(null)}
                    >
                      <span className="df-map-rank-name">{f.name}{multiple && <small>{r.country}</small>}</span>
                      <strong>{number(r.count)}</strong>
                      <span className="df-map-rank-bar" aria-hidden="true"><span style={{ width: `${r.count / max * 100}%`, background: fillFor(r.count) }} /></span>
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : <p className="df-chart-note">No mapped applications in this view.</p>}
        </aside>
      </div>

      {hovered && focusRegion && (
        <div className={`df-map-tooltip ${hovered.flip ? 'left' : ''}`} style={{ left: hovered.x, top: hovered.y }} aria-hidden="true">
          <p>{featureName(hovered.country, hovered.name)}<small>{hovered.country}</small></p>
          <div className="df-map-tooltip-total"><strong>{number(focusRegion.count)}</strong><span>applications · {share(focusRegion.count, countryTotal(hovered.country))}% of {hovered.country}</span></div>
          <span className="df-map-tooltip-rank">Ranked {rankInCountry(focusRegion)} of {ranked.filter(r => r.country === hovered.country).length} with applications</span>
          {focusRegion.bySex && SEXES.filter(sex => focusRegion.bySex[sex]).map(sex => <div key={sex}><i className={`df-sex-key line ${SEX_CLASS[sex]}`} /><strong>{number(focusRegion.bySex[sex])}</strong><span>{sex}</span></div>)}
        </div>
      )}
      {hovered && !focusRegion && (
        <div className={`df-map-tooltip ${hovered.flip ? 'left' : ''}`} style={{ left: hovered.x, top: hovered.y }} aria-hidden="true">
          <p>{hovered.name}<small>{hovered.country}</small></p>
          <span className="df-map-tooltip-rank">No applications yet</span>
        </div>
      )}

      <div className="df-map-footer">
        <div className="df-map-legend" role="img" aria-label={`Colour scale: ${classes.map(c => (c.from === c.to ? `${c.from}` : `${c.from} to ${c.to}`)).join(', ')} applications; light grey means no applications.`}>
          <span className="df-map-legend-title">Applications per region</span>
          <ul>
            <li><span className="df-map-swatch empty" />None</li>
            {classes.map(c => <li key={c.from}><span className="df-map-swatch" style={{ background: c.colour }} />{c.from === c.to ? number(c.from) : `${number(c.from)}–${number(c.to)}`}</li>)}
          </ul>
        </div>
        <p className="df-map-selection" role="status">
          {selected && lookup(selected.country, selected.name)
            ? `Selected: ${featureName(selected.country, selected.name)}, ${selected.country}. ${number(lookup(selected.country, selected.name).count)} applications (${share(lookup(selected.country, selected.name).count, countryTotal(selected.country))}% of ${selected.country}).`
            : 'Hover or select a region to see its applications. The darker the colour, the more applications.'}
        </p>
      </div>
      {missing > 0 && <p className="df-data-note">{number(missing)} applications have a missing or unmatched region and are not shown on the map. They are still counted in the totals and the table.</p>}
      <details className="df-map-attribution"><summary>Map sources and interpretation</summary><p>geoBoundaries gbOpen: Kenya (RCMRD/Africa GeoPortal, public domain); Nigeria (GRID3, CC BY 4.0); Ghana (OpenStreetMap, CC BY-SA 2.0); Zambia (Zambia Data Hub, CC BY 4.0). Geometry simplified for display. Colours show where applicants say they live, by administrative region, not their exact address. These are counts, not population-adjusted rates, so populous regions will naturally look darker. One colour scale is shared across all countries shown.</p><a href="https://www.geoboundaries.org/" target="_blank" rel="noreferrer">geoBoundaries<span className="visually-hidden"> (opens in a new tab)</span></a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0<span className="visually-hidden"> (opens in a new tab)</span></a> · <a href="https://creativecommons.org/licenses/by-sa/2.0/" target="_blank" rel="noreferrer">CC BY-SA 2.0<span className="visually-hidden"> (opens in a new tab)</span></a></details>
    </div>
  );
}
