import { useEffect, useRef, useState } from 'react';

const SEXES = ['Female', 'Male', 'Not stated'];
const SEX_CLASS = { Female: 'female', Male: 'male', 'Not stated': 'unrecorded' };
const number = n => Number(n || 0).toLocaleString();
const monthLabel = (m, month = 'short') => new Intl.DateTimeFormat('en', { month, year: 'numeric', timeZone: 'UTC' }).format(new Date(m + '-01T00:00:00Z'));
const shortMonth = m => new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(new Date(m + '-01T00:00:00Z'));
const HEIGHT = 300;
const PAD = { top: 24, right: 56, bottom: 40, left: 48 };

// Round the top of the axis up to 1, 2, 2.5 or 5 times a power of ten so the ticks are clean numbers.
function niceTicks(max, count = 5) {
  const power = 10 ** Math.max(0, Math.floor(Math.log10(max / count)));
  const step = [1, 2, 2.5, 5, 10].map(f => f * power).find(s => Number.isInteger(s) && Math.ceil(max / s) <= count) || 10 * power;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

function useWidth(ref) {
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

export default function ApplicationTrendChart({ monthly, split, view, onViewChange }) {
  const frameRef = useRef(null);
  const width = useWidth(frameRef);
  const [active, setActive] = useState(null);
  // Only keyboard moves are announced; announcing every pointer move would flood a screen reader.
  const [announce, setAnnounce] = useState(false);

  // Each series is one line: the total, or one line per gender when the split is on.
  const series = split
    ? SEXES.filter(sex => monthly.some(m => m.bySex?.[sex])).map(sex => ({ id: sex, label: sex, className: SEX_CLASS[sex], values: monthly.map(m => m.bySex?.[sex] || 0) }))
    : [{ id: 'all', label: 'All applications', className: 'total', values: monthly.map(m => m.count) }];
  if (view === 'cumulative') series.forEach(s => { let run = 0; s.values = s.values.map(v => (run += v)); });

  const totals = monthly.map(m => m.count);
  const ticks = niceTicks(Math.max(1, ...series.flatMap(s => s.values)));
  const top = ticks[ticks.length - 1];
  const plotWidth = width - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const x = i => PAD.left + (monthly.length === 1 ? plotWidth / 2 : (i / (monthly.length - 1)) * plotWidth);
  const y = v => PAD.top + plotHeight - (v / top) * plotHeight;
  // Thin the month labels so they never overlap: about 56px per label.
  const labelEvery = Math.max(1, Math.ceil(monthly.length / Math.max(2, Math.floor(plotWidth / 56))));
  const showDots = monthly.length <= 24;
  const last = monthly.length - 1;

  const peakIndex = totals.indexOf(Math.max(...totals));
  const latest = totals[last] || 0;
  const previous = last > 0 ? totals[last - 1] : null;
  const change = previous ? Math.round((latest - previous) / previous * 100) : null;

  function pointerMove(event) {
    const box = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - box.left) * (width / box.width);
    const index = monthly.length === 1 ? 0 : Math.round(((px - PAD.left) / plotWidth) * (monthly.length - 1));
    setActive(Math.min(last, Math.max(0, index)));
    setAnnounce(false);
    setAnnounce(false);
  }
  function keyDown(event) {
    const moves = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const start = active ?? last;
    setActive(Math.min(last, Math.max(0, start + moves[event.key])));
    setAnnounce(true);
    setAnnounce(true);
  }

  const tipLeft = active === null ? 0 : x(active);
  const tipOnLeft = tipLeft > width * 0.6;
  const description = `Line chart of ${view === 'cumulative' ? 'the running total of applications' : 'applications per month'} from ${monthLabel(monthly[0].name, 'long')} to ${monthLabel(monthly[last].name, 'long')}. Use the left and right arrow keys to read each month. Exact counts are in the table below the chart.`;

  return (
    <div className="df-trend">
      <div className="df-trend-toolbar">
        <dl className="df-trend-summary">
          <div><dt>Peak month</dt><dd>{monthLabel(monthly[peakIndex].name)} <span>{number(totals[peakIndex])}</span></dd></div>
          <div><dt>Latest month</dt><dd>{monthLabel(monthly[last].name)} <span>{number(latest)}</span>
            {change !== null && (change === 0
              ? <small className="flat"><i className="bi bi-arrow-right" aria-hidden="true" />No change from the previous month</small>
              : <small className={change > 0 ? 'up' : 'down'}><i className={`bi ${change > 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}`} aria-hidden="true" />{change > 0 ? '+' : ''}{change}% vs previous month</small>)}
          </dd></div>
        </dl>
        <div className="df-segmented" role="group" aria-label="Trend view">
          <button type="button" aria-pressed={view === 'monthly'} onClick={() => onViewChange('monthly')}>Per month</button>
          <button type="button" aria-pressed={view === 'cumulative'} onClick={() => onViewChange('cumulative')}>Running total</button>
        </div>
      </div>

      {series.length > 1 && (
        <ul className="df-trend-legend" aria-label="Lines">
          {series.map(s => <li key={s.id}><span className={`df-line-key ${s.className}`} aria-hidden="true" />{s.label}</li>)}
        </ul>
      )}

      <div className="df-trend-frame" ref={frameRef}>
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={description}
          tabIndex="0"
          onKeyDown={keyDown}
          onFocus={() => setActive(a => a ?? last)}
          onBlur={() => setActive(null)}
        >
          {ticks.map(t => (
            <g key={t} className="df-trend-grid">
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
              <text x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end">{number(t)}</text>
            </g>
          ))}
          {monthly.map((m, i) => (i % labelEvery === 0 || i === last) && (i === last || last - i >= labelEvery) && (
            <text key={m.name} className="df-trend-axis" x={x(i)} y={HEIGHT - PAD.bottom + 22} textAnchor="middle">
              {i === 0 || m.name.endsWith('-01') ? monthLabel(m.name) : shortMonth(m.name)}
            </text>
          ))}

          {active !== null && <line className="df-trend-crosshair" x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotHeight} />}

          {series.map(s => {
            const points = s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
            return (
              <g key={s.id} className={`df-trend-series ${s.className}`}>
                {series.length === 1 && monthly.length > 1 && <path className="df-trend-area" d={`M${x(0)},${y(0)} L${points.join(' L')} L${x(last)},${y(0)} Z`} />}
                {monthly.length > 1 && <polyline className="df-trend-line" points={points.join(' ')} />}
                {s.values.map((v, i) => (showDots || i === last || i === active) && (
                  <circle key={i} className={`df-trend-dot ${i === active ? 'active' : ''}`} cx={x(i)} cy={y(v)} r={i === active ? 6 : 4} />
                ))}
                {series.length === 1 && active === null && (
                  <text className="df-trend-end-label" x={x(last) + 10} y={y(s.values[last])} dy="0.32em">{number(s.values[last])}</text>
                )}
              </g>
            );
          })}

          <rect className="df-trend-hit" x={PAD.left - 12} y={PAD.top} width={plotWidth + 24} height={plotHeight} onPointerMove={pointerMove} onPointerLeave={() => setActive(null)} />
        </svg>

        {active !== null && (
          <div className={`df-trend-tooltip ${tipOnLeft ? 'left' : ''}`} style={{ left: tipLeft }} aria-hidden="true">
            <p>{monthLabel(monthly[active].name, 'long')}</p>
            {series.map(s => <div key={s.id}><i className={`df-line-key ${s.className}`} /><strong>{number(s.values[active])}</strong><span>{s.label}</span></div>)}
            {view === 'cumulative' && <small>Running total to the end of the month</small>}
          </div>
        )}
        <p className="visually-hidden" aria-live="polite">
          {announce && active !== null ? `${monthLabel(monthly[active].name, 'long')}: ${series.map(s => `${s.label} ${number(s.values[active])}`).join(', ')}` : ''}
        </p>
      </div>

      <details className="df-region-table">
        <summary>View monthly table</summary>
        <div className="table-responsive">
          <table className="table">
            <caption>Applications by submission month for the selected filters</caption>
            <thead><tr><th scope="col">Month</th>{SEXES.map(sex => <th scope="col" key={sex}>{sex}</th>)}<th scope="col">Total</th><th scope="col">Running total</th></tr></thead>
            <tbody>{monthly.map((m, i) => <tr key={m.name}><td>{monthLabel(m.name)}</td>{SEXES.map(sex => <td key={sex}>{number(m.bySex?.[sex])}</td>)}<td>{number(m.count)}</td><td>{number(totals.slice(0, i + 1).reduce((a, b) => a + b, 0))}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
