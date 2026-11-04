import { useEffect, useRef, useState } from 'react';
import geography from '../data/applicationRegions.json';
import mapContext from '../data/applicationMapContext.json';
import CountryMap from './regionMap/CountryMap';
import { MEASURES, MIN_FOR_SHARE, SEXES, SEX_CLASS, PATHWAY_NAMES, LEVEL, key, number, share, monthLabel, buildScale } from './regionMap/mapUtils';

function Sparkline({ months, byMonth }) {
  const values = months.map(m => byMonth?.[m] || 0);
  const max = Math.max(1, ...values);
  const w = 240, h = 44;
  const x = i => (months.length === 1 ? w / 2 : 4 + i * (w - 8) / (months.length - 1));
  const y = v => h - 6 - v / max * (h - 12);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg className="df-region-spark" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Applications per month: ${months.map((m, i) => `${monthLabel(m)} ${values[i]}`).join(', ')}`}>
      <polygon points={`${x(0)},${h - 6} ${points} ${x(values.length - 1)},${h - 6}`} className="area" />
      <polyline points={points} className="line" />
      <circle cx={x(values.length - 1)} cy={y(values.at(-1))} r="3.5" />
    </svg>
  );
}

function RegionProfile({ region, name, months, rank, rankedInCountry, countryTotal, titleRef, onClose, onZoom }) {
  const count = region.count;
  const pathways = Object.entries(region.byPathway || {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const stats = [
    ['Initially eligible', region.eligible],
    ['Reported a disability', region.withDisability],
    ['Shortlisted / enrolled', region.shortlisted],
  ];
  return (
    <div className="df-region-profile">
      <div className="df-region-profile-head">
        <div><span>{region.country}</span><h3 id="df-map-side-title" tabIndex="-1" ref={titleRef}>{name}</h3></div>
        <button type="button" className="btn btn-sm ss-btn-outline" onClick={onClose}><i className="bi bi-list-ol" aria-hidden="true" /> Ranking</button>
      </div>
      <div className="df-region-profile-total">
        <strong>{number(count)}</strong>
        <span>applications · {share(count, countryTotal)}% of {region.country}{rank ? ` · ranked ${rank} of ${rankedInCountry}` : ''}</span>
      </div>

      <h4>Gender</h4>
      <div className="df-stack-track" aria-hidden="true">{SEXES.filter(sex => region.bySex?.[sex]).map(sex => <span key={sex} className={`df-sex-segment ${SEX_CLASS[sex]}`} style={{ flexGrow: region.bySex[sex] / count }} />)}</div>
      <ul className="df-region-profile-legend">{SEXES.filter(sex => region.bySex?.[sex]).map(sex => <li key={sex}><i className={`df-sex-key ${SEX_CLASS[sex]}`} aria-hidden="true" />{sex} <strong>{number(region.bySex[sex])}</strong> <small>{share(region.bySex[sex], count)}%</small></li>)}</ul>

      <dl className="df-region-profile-stats">
        {stats.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{number(value)} <small>{share(value, count)}%</small></dd></div>)}
      </dl>

      {pathways.length > 0 && <>
        <h4>Pathways</h4>
        <ul className="df-region-profile-bars">{pathways.map(([id, n]) => <li key={id}><span>{PATHWAY_NAMES[id] || id}</span><strong>{number(n)}</strong><span className="track" aria-hidden="true"><span style={{ width: `${n / count * 100}%` }} /></span></li>)}</ul>
      </>}

      {months.length > 1 && <>
        <h4>Applications per month</h4>
        <Sparkline months={months} byMonth={region.byMonth} />
        <div className="df-region-spark-axis" aria-hidden="true"><span>{monthLabel(months[0])}</span><span>{monthLabel(months.at(-1))}</span></div>
      </>}

      <button type="button" className="btn ss-btn-outline w-100 mt-3" onClick={onZoom}><i className="bi bi-zoom-in" aria-hidden="true" /> Zoom to {name}</button>
    </div>
  );
}

export default function ApplicationRegionMap({ regions, countries, months = [], onCountryChange, canShowAll }) {
  const [measureId, setMeasureId] = useState('count');
  const [monthIndex, setMonthIndex] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const mapRefs = useRef({});
  const wrapRef = useRef(null);
  const titleRef = useRef(null);
  const measure = MEASURES[measureId];
  const lastMonth = months.length - 1;
  const timeLimited = measureId === 'count' && monthIndex !== null && monthIndex < lastMonth;
  // Playback stops by itself once it reaches the latest month.
  const isPlaying = playing && monthIndex !== null && monthIndex < lastMonth;
  const untilMonth = timeLimited ? months[monthIndex] : null;

  // Step through the months, one a second, and stop on the latest.
  useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = setInterval(() => setMonthIndex(i => Math.min(lastMonth, (i ?? lastMonth) + 1)), 1000);
    return () => clearInterval(timer);
  }, [isPlaying, lastMonth]);

  const original = new Map(regions.map(r => [`${r.country}|${key(r.name)}`, r]));
  const values = new Map(regions.map(r => {
    const count = untilMonth ? Object.entries(r.byMonth || {}).filter(([m]) => m <= untilMonth).reduce((n, [, c]) => n + c, 0) : r.count;
    return [`${r.country}|${key(r.name)}`, { ...r, count, value: measure.value({ ...r, count }) }];
  }));
  const mappedKeys = new Set();
  countries.forEach(country => geography[country]?.features.forEach(f => mappedKeys.add(`${country}|${key(f.name)}`)));
  const mapped = [...values.entries()].filter(([k]) => mappedKeys.has(k)).map(([, v]) => v);
  const missing = regions.filter(r => !mappedKeys.has(`${r.country}|${key(r.name)}`)).reduce((n, r) => n + r.count, 0);
  const comparable = mapped.filter(r => r.count > 0 && (!measure.percent || r.count >= MIN_FOR_SHARE));
  // While the month slider is moving, keep the colour scale fixed to the full period so regions visibly fill in.
  const scaleMax = Math.max(1, ...(untilMonth ? regions.filter(r => mappedKeys.has(`${r.country}|${key(r.name)}`)).map(r => r.count) : comparable.map(r => r.value)));
  const scale = buildScale(measure, scaleMax, Math.min(...comparable.map(r => r.value), scaleMax));
  const ranked = [...comparable].sort((a, b) => b.value - a.value || b.count - a.count || a.name.localeCompare(b.name));
  const countryTotal = country => [...values.values()].filter(r => r.country === country).reduce((n, r) => n + r.count, 0);
  const featureName = (country, name) => geography[country]?.features.find(f => key(f.name) === key(name))?.name || name;
  const rankIn = r => (r ? ranked.filter(o => o.country === r.country).findIndex(o => o.name === r.name) + 1 : 0);
  const multiple = countries.length > 1;
  const selectedKey = selected && `${selected.country}|${key(selected.name)}`;
  const hoveredKey = hovered && `${hovered.country}|${key(hovered.name)}`;
  const focusKey = hoveredKey || selectedKey;
  const hoveredEntry = hovered && values.get(hoveredKey);
  const selectedRegion = selected && countries.includes(selected.country) ? original.get(selectedKey) : null;

  function hover(country, name, event) {
    const box = wrapRef.current?.getBoundingClientRect();
    if (!box) return;
    let x, y;
    if (event && event.type.startsWith('pointer')) {
      x = event.clientX - box.left;
      y = event.clientY - box.top;
    } else {
      const target = wrapRef.current.querySelector(`[data-region="${CSS.escape(`${country}|${featureName(country, name)}`)}"]`);
      const r = target?.getBoundingClientRect();
      x = r ? r.left - box.left + r.width / 2 : box.width / 2;
      y = r ? r.top - box.top + r.height / 2 : 40;
    }
    setHovered({ country, name, x, y, flip: x > box.width * 0.6 });
  }
  function select(country, name, fromList = false) {
    setSelected({ country, name });
    setHovered(null);
    // From the ranking list, move focus to the profile heading; on the map, keep focus on the region.
    if (fromList) window.requestAnimationFrame(() => titleRef.current?.focus());
  }
  function changeMeasure(id) {
    setMeasureId(id);
    setPlaying(false);
    setMonthIndex(null);
  }
  function togglePlay() {
    if (isPlaying) { setPlaying(false); return; }
    if (monthIndex === null || monthIndex >= lastMonth) setMonthIndex(0);
    setPlaying(true);
  }
  const markerValue = hoveredEntry?.count && !(measure.percent && hoveredEntry.count < MIN_FOR_SHARE) ? hoveredEntry.value : null;
  const scaleWidth = scale.top - scale.start;
  const markerAt = markerValue === null ? null : Math.min(100, Math.max(0, (markerValue - scale.start + 0.5) / scaleWidth * 100));
  const shownMonth = months[monthIndex ?? lastMonth];

  return (
    <div className="df-map" ref={wrapRef}>
      <div className="df-map-toolbar">
        <div className="df-segmented" role="group" aria-label="What the map shows">
          {Object.entries(MEASURES).map(([id, m]) => <button key={id} type="button" aria-pressed={measureId === id} onClick={() => changeMeasure(id)}>{m.label}</button>)}
        </div>
        {measureId === 'count' && months.length > 1 && (
          <div className="df-map-time">
            <button type="button" className="btn btn-sm ss-btn-outline" onClick={togglePlay} aria-pressed={isPlaying}>
              <i className={`bi ${isPlaying ? 'bi-pause-fill' : 'bi-play-fill'}`} aria-hidden="true" /> {isPlaying ? 'Pause' : 'Play months'}
            </button>
            <label>
              <span>Applications up to <strong>{monthLabel(shownMonth, 'long')}</strong></span>
              <input type="range" min="0" max={lastMonth} step="1" value={monthIndex ?? lastMonth} onChange={e => { setPlaying(false); setMonthIndex(Number(e.target.value)); }} aria-valuetext={monthLabel(shownMonth, 'long')} />
            </label>
          </div>
        )}
      </div>
      {measure.percent && <p className="df-map-measure-note">Share of each region's applicants. Regions with fewer than {MIN_FOR_SHARE} applications are hatched, because a percentage from so few people can be misleading.</p>}

      <div className={`df-map-layout ${multiple ? '' : 'single'}`}>
        <div className={`df-map-grid ${multiple ? '' : 'single'}`}>
          {countries.map(country => geography[country] && (
            <CountryMap
              key={country}
              ref={map => { mapRefs.current[country] = map; }}
              country={country}
              geo={geography[country]}
              context={mapContext[country]}
              values={values}
              scale={scale}
              measure={measure}
              focusKey={focusKey}
              selectedKey={selectedKey}
              ranked={ranked}
              multiple={multiple}
              canShowAll={canShowAll}
              total={countryTotal(country)}
              onHover={hover}
              onLeave={() => setHovered(null)}
              onSelect={select}
              onCountryChange={onCountryChange}
            />
          ))}
        </div>

        <aside className="df-map-side" aria-labelledby="df-map-side-title">
          {selectedRegion ? (
            <RegionProfile
              region={selectedRegion}
              name={featureName(selectedRegion.country, selectedRegion.name)}
              months={months}
              rank={rankIn(values.get(selectedKey))}
              rankedInCountry={ranked.filter(r => r.country === selectedRegion.country).length}
              countryTotal={regions.filter(r => r.country === selectedRegion.country).reduce((n, r) => n + r.count, 0)}
              titleRef={titleRef}
              onClose={() => setSelected(null)}
              onZoom={() => mapRefs.current[selectedRegion.country]?.zoomTo(selectedRegion.name)}
            />
          ) : (
            <div className="df-map-ranking">
              <h3 id="df-map-side-title">Top {multiple ? 'regions' : LEVEL[countries[0]] || 'regions'}</h3>
              <p>{measure.percent ? `Highest ${measure.label.toLowerCase()}, among regions with ${MIN_FOR_SHARE}+ applications.` : `Ranked by applications${untilMonth ? ` up to ${monthLabel(untilMonth)}` : ''}.`} Select one for its full profile.</p>
              {ranked.length ? (
                <ol>
                  {ranked.slice(0, 10).map(r => {
                    const name = featureName(r.country, r.name);
                    const k = `${r.country}|${key(r.name)}`;
                    return (
                      <li key={k}>
                        <button
                          type="button"
                          className={focusKey === k ? 'is-focus' : ''}
                          onClick={() => select(r.country, name, true)}
                          onPointerEnter={() => hover(r.country, name, null)}
                          onPointerLeave={() => setHovered(null)}
                          onFocus={() => hover(r.country, name, null)}
                          onBlur={() => setHovered(null)}
                        >
                          <span className="df-map-rank-name">{name}{multiple && <small>{r.country}</small>}</span>
                          <strong>{measure.format(r.value)}{measure.percent && <small> of {number(r.count)}</small>}</strong>
                          <span className="df-map-rank-bar" aria-hidden="true"><span style={{ width: `${Math.max(3, (r.value - scale.start + 1) / scaleWidth * 100)}%`, background: scale.colourFor(r.value) }} /></span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              ) : <p className="df-chart-note">No regions to rank in this view.</p>}
            </div>
          )}
        </aside>
      </div>

      {hovered && (
        <div className={`df-map-tooltip ${hovered.flip ? 'left' : ''}`} style={{ left: hovered.x, top: hovered.y }} aria-hidden="true">
          <p>{featureName(hovered.country, hovered.name)}<small>{hovered.country}</small></p>
          {hoveredEntry?.count ? <>
            <div className="df-map-tooltip-total">
              <strong>{measure.percent ? (hoveredEntry.count < MIN_FOR_SHARE ? '–' : measure.format(hoveredEntry.value)) : number(hoveredEntry.count)}</strong>
              <span>{measure.percent
                ? (hoveredEntry.count < MIN_FOR_SHARE ? `too few to compare · ${number(hoveredEntry.count)} applications` : `of ${number(hoveredEntry.count)} applicants`)
                : `applications${untilMonth ? ` to ${monthLabel(untilMonth)}` : ''} · ${share(hoveredEntry.count, countryTotal(hovered.country))}% of ${hovered.country}`}</span>
            </div>
            {rankIn(hoveredEntry) > 0 && <span className="df-map-tooltip-rank">Ranked {rankIn(hoveredEntry)} of {ranked.filter(r => r.country === hovered.country).length} in {hovered.country}</span>}
            {!untilMonth && SEXES.filter(sex => hoveredEntry.bySex?.[sex]).map(sex => <div key={sex}><i className={`df-sex-key line ${SEX_CLASS[sex]}`} /><strong>{number(hoveredEntry.bySex[sex])}</strong><span>{sex}</span></div>)}
            <span className="df-map-tooltip-hint">Click for the full profile</span>
          </> : <span className="df-map-tooltip-rank">No applications{untilMonth ? ` by ${monthLabel(untilMonth)}` : ' yet'}</span>}
        </div>
      )}

      <div className="df-map-footer">
        <div className="df-map-scale">
          <span className="df-map-legend-title">{measure.legend}{untilMonth ? ` (up to ${monthLabel(untilMonth)})` : ''}</span>
          <div className="df-map-scale-row">
            <span className="df-map-scale-none"><span className="df-map-swatch empty" />None</span>
            {measure.percent && <span className="df-map-scale-none"><span className="df-map-swatch hatched" />Under {MIN_FOR_SHARE} applications</span>}
            <div className="df-map-scale-bar" role="img" aria-label={`Colour scale: ${scale.classes.map(c => (c.from === c.to ? measure.format(c.from) : `${measure.format(c.from)} to ${measure.format(c.to)}`)).join(', ')}.`}>
              {markerAt !== null && <span className="df-map-scale-marker" style={{ left: `${markerAt}%` }} aria-hidden="true" />}
              <div className="df-map-scale-steps">{scale.classes.map(c => <span key={c.from} style={{ background: c.colour }} />)}</div>
              <div className="df-map-scale-ticks" aria-hidden="true">{scale.classes.map(c => <span key={c.from}>{c.from === c.to ? measure.format(c.from) : `${number(c.from)}–${measure.format(c.to)}`}</span>)}</div>
            </div>
          </div>
        </div>
        <p className="df-map-selection" role="status">
          {selectedRegion
            ? `Showing the profile for ${featureName(selectedRegion.country, selectedRegion.name)}, ${selectedRegion.country}.`
            : 'Hover a region for its numbers, click it for a full profile, double-click to zoom.'}
        </p>
      </div>
      {missing > 0 && <p className="df-data-note">{number(missing)} applications have a missing or unmatched region and are not shown on the map. They are still counted in the totals and the table.</p>}
      <details className="df-map-attribution"><summary>Map sources and interpretation</summary><p>Regional boundaries: geoBoundaries gbOpen, Kenya (RCMRD/Africa GeoPortal, public domain); Nigeria (GRID3, CC BY 4.0); Ghana (OpenStreetMap, CC BY-SA 2.0); Zambia (Zambia Data Hub, CC BY 4.0). Neighbouring countries and lakes: Natural Earth (public domain). Geometry simplified for display. Colours show where applicants say they live, by administrative region, not their exact address. One colour scale is shared by all countries shown.</p><a href="https://www.geoboundaries.org/" target="_blank" rel="noreferrer">geoBoundaries<span className="visually-hidden"> (opens in a new tab)</span></a> · <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth<span className="visually-hidden"> (opens in a new tab)</span></a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0<span className="visually-hidden"> (opens in a new tab)</span></a> · <a href="https://creativecommons.org/licenses/by-sa/2.0/" target="_blank" rel="noreferrer">CC BY-SA 2.0<span className="visually-hidden"> (opens in a new tab)</span></a></details>
    </div>
  );
}
