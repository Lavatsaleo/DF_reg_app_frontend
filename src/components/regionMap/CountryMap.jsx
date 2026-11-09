import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { VIEW, key, number, LEVEL, SINGULAR, MIN_FOR_SHARE, projector, pathBox } from './mapUtils';

const MAX_ZOOM = 12;
const IDENTITY = { k: 1, x: 0, y: 0 };
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Keep the map covering the frame: no zooming out past the whole country, no panning off the edge.
function clampView({ k, x, y }) {
  const scale = Math.min(MAX_ZOOM, Math.max(1, k));
  return {
    k: scale,
    x: Math.min(0, Math.max(VIEW.width - VIEW.width * scale, x)),
    y: Math.min(0, Math.max(VIEW.height - VIEW.height * scale, y)),
  };
}

// Zoom by a factor around a point given in map units, so the point under the pointer stays put.
function zoomAround(view, factor, px, py) {
  const k = Math.min(MAX_ZOOM, Math.max(1, view.k * factor));
  const ratio = k / view.k;
  return clampView({ k, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio });
}

export default function CountryMap({ ref, country, geo, context, values, scale, measure, focusKey, selectedKey, ranked, multiple, canShowAll, total, onHover, onLeave, onSelect, onCountryChange }) {
  const svgRef = useRef(null);
  const viewRef = useRef(IDENTITY);
  const frameRef = useRef(0);
  const dragRef = useRef(null);
  const pointersRef = useRef(new Map());
  const [view, setViewState] = useState(IDENTITY);
  const [hint, setHint] = useState(false);
  const hintTimer = useRef(0);
  const { project, featurePath, ringsPath } = projector(geo.bounds);
  const id = `df-map-${key(country)}`;

  function setView(next) {
    viewRef.current = next;
    setViewState(next);
  }

  // Ease between views; skipped for people who prefer reduced motion.
  function animateTo(target) {
    cancelAnimationFrame(frameRef.current);
    const from = viewRef.current;
    const to = clampView(target);
    if (reducedMotion()) { setView(to); return; }
    let start = null;
    const step = now => {
      start ??= now;
      const t = Math.min(1, (now - start) / 380);
      const e = 1 - (1 - t) ** 3;
      setView({ k: from.k + (to.k - from.k) * e, x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e });
      if (t < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
  }

  function zoomToFeature(feature) {
    const box = pathBox(feature, project);
    const width = Math.max(box.x1 - box.x0, 8), height = Math.max(box.y1 - box.y0, 8);
    const k = Math.min(MAX_ZOOM, Math.max(1.5, 0.7 * Math.min(VIEW.width / width, VIEW.height / height)));
    animateTo({ k, x: VIEW.width / 2 - (box.x0 + width / 2) * k, y: VIEW.height / 2 - (box.y0 + height / 2) * k });
  }

  // The region profile can ask this map to zoom to one of its regions.
  useImperativeHandle(ref, () => ({
    zoomTo(name) {
      const feature = geo.features.find(f => key(f.name) === key(name));
      if (feature) zoomToFeature(feature);
    },
  }));

  const toMapPoint = (clientX, clientY) => {
    const box = svgRef.current.getBoundingClientRect();
    return [(clientX - box.left) * VIEW.width / box.width, (clientY - box.top) * VIEW.height / box.height];
  };

  // Ctrl/⌘ + scroll zooms. A plain scroll keeps scrolling the page and shows a hint instead of trapping it.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const onWheel = event => {
      if (!event.ctrlKey && !event.metaKey) {
        setHint(true);
        clearTimeout(hintTimer.current);
        hintTimer.current = setTimeout(() => setHint(false), 1400);
        return;
      }
      event.preventDefault();
      cancelAnimationFrame(frameRef.current);
      const [px, py] = toMapPoint(event.clientX, event.clientY);
      setView(zoomAround(viewRef.current, Math.exp(-event.deltaY * 0.0025), px, py));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => { svg.removeEventListener('wheel', onWheel); clearTimeout(hintTimer.current); cancelAnimationFrame(frameRef.current); };
  }, []);

  function pointerDown(event) {
    pointersRef.current.set(event.pointerId, [event.clientX, event.clientY]);
    if (pointersRef.current.size === 1) dragRef.current = { x: event.clientX, y: event.clientY, view: viewRef.current, moved: false };
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      dragRef.current = { pinch: Math.hypot(a[0] - b[0], a[1] - b[1]), view: viewRef.current, moved: true, mid: toMapPoint((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) };
    }
  }
  function pointerMove(event) {
    if (!pointersRef.current.has(event.pointerId) || !dragRef.current) return;
    pointersRef.current.set(event.pointerId, [event.clientX, event.clientY]);
    const drag = dragRef.current;
    if (drag.pinch && pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      setView(zoomAround(drag.view, Math.hypot(a[0] - b[0], a[1] - b[1]) / drag.pinch, ...drag.mid));
      return;
    }
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    if (drag.view.k === 1) return;
    drag.moved = true;
    svgRef.current.setPointerCapture?.(event.pointerId);
    const box = svgRef.current.getBoundingClientRect();
    setView(clampView({ k: drag.view.k, x: drag.view.x + dx * VIEW.width / box.width, y: drag.view.y + dy * VIEW.height / box.height }));
    onLeave();
  }
  function pointerUp(event) {
    pointersRef.current.delete(event.pointerId);
    if (!pointersRef.current.size) setTimeout(() => { dragRef.current = null; }, 0);
  }
  const wasDrag = () => dragRef.current?.moved;

  const buttonZoom = factor => animateTo(zoomAround(viewRef.current, factor, VIEW.width / 2, VIEW.height / 2));
  const zoomed = view.k > 1.01;
  // Text and markers live inside the zoomed group, so divide by the zoom to keep them the same size on screen.
  const s = 1 / view.k;
  const regionFeatures = geo.features;
  const focused = regionFeatures.filter(f => `${country}|${key(f.name)}` === focusKey);
  const selected = regionFeatures.filter(f => `${country}|${key(f.name)}` === selectedKey);
  const topThree = ranked.filter(r => r.country === country).slice(0, 3);
  const seenLakes = new Set();
  // Keep a centred label wholly inside the visible frame (charWidth is roughly one character in map units).
  const insideFrame = ([x, y], text, charWidth) => {
    const half = text.length * charWidth / 2 + 4 * s;
    const left = -view.x / view.k, right = (VIEW.width - view.x) / view.k;
    return [Math.min(right - half, Math.max(left + half, x)), y];
  };
  // Neighbour names, skipping any that would overlap one already placed.
  const neighbourLabels = [];
  (context?.land || []).filter(land => land.label).forEach(land => {
    const [x, y] = insideFrame(project(land.label), land.name, 8.5 * s * 0.78);
    const half = land.name.length * 8.5 * s * 0.39, height = 7 * s;
    const clash = neighbourLabels.some(o => Math.abs(o.x - x) < o.half + half + 6 * s && Math.abs(o.y - y) < height * 2);
    if (!clash) neighbourLabels.push({ name: land.name, x, y, half });
  });
  const entryOf = f => values.get(`${country}|${key(f.name)}`);
  const isLowSample = entry => measure.percent && entry?.count > 0 && entry.count < MIN_FOR_SHARE;
  const fillOf = f => {
    const entry = entryOf(f);
    if (!entry?.count) return undefined;
    return isLowSample(entry) ? `url(#${id}-hatch)` : scale.colourFor(entry.value);
  };

  return (
    <figure className={`df-country-map ${zoomed ? 'is-zoomed' : ''}`}>
      <figcaption className="df-map-heading">
        <div><strong>{country}</strong><span>{number(total)} applications · {LEVEL[country]}</span></div>
        {multiple
          ? <button type="button" className="btn btn-sm ss-btn-outline" onClick={() => onCountryChange(country)}>Focus on {country} <i className="bi bi-arrow-up-right" aria-hidden="true" /></button>
          : canShowAll && <button type="button" className="btn btn-sm ss-btn-outline" onClick={() => onCountryChange('')}><i className="bi bi-arrow-left" aria-hidden="true" /> All countries</button>}
      </figcaption>

      <div className="df-map-canvas">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
          role="group"
          aria-label={`${country}: ${measure.legend.toLowerCase()} by ${SINGULAR[country]}. Regions with applications can be focused with the Tab key; press Enter to open a region. Exact counts are also in the table below.`}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
        >
          <defs>
            <clipPath id={`${id}-frame`}><rect width={VIEW.width} height={VIEW.height} rx="10" /></clipPath>
            <pattern id={`${id}-hatch`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" fill="#f4f1ed" />
              <line x1="0" y1="0" x2="0" y2="5" stroke="#c9c1b8" strokeWidth="2" />
            </pattern>
            <filter id={`${id}-lift`} x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor="#000" floodOpacity=".35" /></filter>
          </defs>
          <g clipPath={`url(#${id}-frame)`}>
            <rect className="df-map-sea" width={VIEW.width} height={VIEW.height} />
            <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
              {context?.land.map(land => <path key={land.name} className="df-map-land" d={ringsPath(land.rings)} fillRule="evenodd" />)}
              {/* A thick stroke under the regions: only its outer half shows, which draws the national border. */}
              <g className="df-map-border" aria-hidden="true">{regionFeatures.map(f => <path key={f.name} d={featurePath(f)} />)}</g>
              {regionFeatures.map(f => {
                const entry = entryOf(f);
                const count = entry?.count || 0;
                const lowSample = isLowSample(entry);
                const fill = fillOf(f);
                const label = !count
                  ? `${f.name}: no applications`
                  : `${f.name}: ${measure.percent ? `${lowSample ? 'too few applications to compare' : measure.format(entry.value)}, ` : ''}${number(count)} application${count === 1 ? '' : 's'}`;
                return (
                  <path
                    key={f.name}
                    d={featurePath(f)}
                    data-region={`${country}|${f.name}`}
                    className={`df-region-shape ${count ? 'has-data' : 'empty'}`}
                    style={fill ? { fill } : undefined}
                    fillRule="evenodd"
                    tabIndex={count ? 0 : undefined}
                    role={count ? 'button' : undefined}
                    aria-label={count ? label : undefined}
                    aria-pressed={count ? `${country}|${key(f.name)}` === selectedKey : undefined}
                    onPointerMove={event => { if (!dragRef.current?.moved) onHover(country, f.name, event); }}
                    onPointerLeave={onLeave}
                    onFocus={event => onHover(country, f.name, event)}
                    onBlur={onLeave}
                    onClick={() => { if (!wasDrag() && count) onSelect(country, f.name); }}
                    onDoubleClick={() => zoomToFeature(f)}
                    onKeyDown={event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); onSelect(country, f.name, true); } }}
                  >
                    <title>{label}</title>
                  </path>
                );
              })}
              {context?.lakes.map((lake, i) => <path key={`${lake.name}-${i}`} className="df-map-lake" d={ringsPath(lake.rings)} fillRule="evenodd" aria-hidden="true" />)}
              {selected.map(f => <path key={`s-${f.name}`} d={featurePath(f)} className="df-region-outline selected" fillRule="evenodd" aria-hidden="true" />)}
              {focused.map(f => <path key={`f-${f.name}`} d={featurePath(f)} className="df-region-outline" fillRule="evenodd" filter={`url(#${id}-lift)`} style={{ fill: fillOf(f) || '#ece8e4' }} aria-hidden="true" />)}

              <g className="df-map-annotations" aria-hidden="true">
                {neighbourLabels.map(label => <text key={label.name} className="df-map-neighbour" x={label.x} y={label.y} style={{ fontSize: 8.5 * s }}>{label.name}</text>)}
                {context?.lakes.filter(lake => lake.label && !seenLakes.has(lake.name) && seenLakes.add(lake.name)).map(lake => {
                  const [x, y] = insideFrame(project(lake.label), lake.name, 7.5 * s * 0.55);
                  return <text key={lake.name} className="df-map-lake-label" x={x} y={y} style={{ fontSize: 7.5 * s }}>{lake.name}</text>;
                })}
                {context?.capital && (() => {
                  const [x, y] = project(context.capital.point);
                  return (
                    <g className="df-map-capital" transform={`translate(${x} ${y})`}>
                      <rect x={-3 * s} y={-3 * s} width={6 * s} height={6 * s} transform="rotate(45)" style={{ strokeWidth: 1.5 * s }} />
                      <text x={7 * s} y={-5 * s} style={{ fontSize: 8.5 * s, strokeWidth: 3 * s }}>{context.capital.name}</text>
                    </g>
                  );
                })()}
                {topThree.map((r, i) => {
                  const f = regionFeatures.find(feature => key(feature.name) === key(r.name));
                  if (!f) return null;
                  const [cx, cy] = project(f.point);
                  return (
                    <g key={r.name} className="df-map-label" transform={`translate(${cx} ${cy}) scale(${s})`}>
                      <circle r="7.5" />
                      <text className="rank" dy="0.35em">{i + 1}</text>
                      {(!multiple || zoomed) && <text className="name" x="11" dy="0.35em">{f.name}</text>}
                    </g>
                  );
                })}
              </g>
            </g>
          </g>
        </svg>

        <div className="df-map-zoom" role="group" aria-label={`Zoom ${country} map`}>
          <button type="button" onClick={() => buttonZoom(1.6)} disabled={view.k >= MAX_ZOOM} aria-label="Zoom in"><i className="bi bi-plus-lg" aria-hidden="true" /></button>
          <button type="button" onClick={() => buttonZoom(1 / 1.6)} disabled={!zoomed} aria-label="Zoom out"><i className="bi bi-dash-lg" aria-hidden="true" /></button>
          <button type="button" onClick={() => animateTo(IDENTITY)} disabled={!zoomed} aria-label="Reset map view"><i className="bi bi-arrows-angle-contract" aria-hidden="true" /></button>
        </div>
        <div className={`df-map-hint ${hint ? 'is-visible' : ''}`} aria-hidden="true">
          Hold <kbd>Ctrl</kbd> and scroll to zoom · double-click a region to zoom in
        </div>
      </div>
    </figure>
  );
}
