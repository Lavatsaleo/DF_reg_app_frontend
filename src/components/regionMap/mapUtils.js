// Shared helpers for the dashboard's regional map: projection, colour scales and the measures it can show.
export const VIEW = { width: 560, height: 325, pad: 12 };
export const key = value => String(value || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export const number = n => Number(n || 0).toLocaleString();
export const share = (part, whole) => (whole ? Math.round(part / whole * 100) : 0);
export const SEXES = ['Female', 'Male', 'Not stated'];
export const SEX_CLASS = { Female: 'female', Male: 'male', 'Not stated': 'unrecorded' };
export const PATHWAY_NAMES = { PHYSICAL_ACADEMY: 'Physical Academy', VIRTUAL_ACADEMY: 'Virtual Academy', DIGITAL_ENTREPRENEURSHIP: 'Digital Entrepreneurship' };
export const LEVEL = { Kenya: 'counties', Nigeria: 'states & FCT', Ghana: 'regions', Zambia: 'provinces' };
export const SINGULAR = { Kenya: 'county', Nigeria: 'state', Ghana: 'region', Zambia: 'province' };
export const monthLabel = (m, month = 'short') => new Intl.DateTimeFormat('en', { month, year: 'numeric', timeZone: 'UTC' }).format(new Date(m + '-01T00:00:00Z'));

// Percentages from very few applications swing wildly, so those regions are hatched instead of coloured.
export const MIN_FOR_SHARE = 10;

// One-hue sequential ramps, light to dark. Each measure has its own hue so a glance tells you which view is on.
export const MEASURES = {
  count: {
    label: 'Applications',
    legend: 'Applications per region',
    ramp: ['#ffeeb8', '#ffd457', '#f0ad00', '#b98200', '#6f4e00'],
    value: region => region.count,
    format: value => number(value),
  },
  women: {
    label: 'Share who are women',
    legend: 'Share of applicants who are women',
    ramp: ['#fde3d3', '#f8b285', '#ee7f3b', '#c4561a', '#7a330b'],
    value: region => share(region.bySex?.Female || 0, region.count),
    format: value => `${value}%`,
    percent: true,
  },
  disability: {
    label: 'Share with a disability',
    legend: 'Share of applicants who reported a disability',
    ramp: ['#e4f0d0', '#bcd98f', '#8db92e', '#5e8a1c', '#34530d'],
    value: region => share(region.withDisability || 0, region.count),
    format: value => `${value}%`,
    percent: true,
  },
};

const NICE = [1, 2, 2.5, 3, 4, 5, 6, 8, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000];
const niceSteps = function* () { for (let power = 1; ; power *= 1000) for (const f of NICE) yield f * power; };

// Equal-width classes on a round step so the legend reads cleanly (1–60, 61–120… or 30–34%, 35–39%…).
// Counts start at 1, because 0 is "no applications". Percentages start just below the lowest region,
// so that regions which differ by a few points still get different colours.
export function buildScale(measure, max, min = 0) {
  const { ramp, percent } = measure;
  let step = 1, start = percent ? 0 : 1;
  for (const s of niceSteps()) {
    if (!Number.isInteger(s)) continue;
    const from = percent ? Math.floor(min / s) * s : 1;
    if (from + s * ramp.length > max) { step = s; start = from; break; }
  }
  const classes = ramp.map((colour, i) => ({ colour, from: start + i * step, to: start + (i + 1) * step - 1 })).filter(c => c.from <= Math.max(max, start));
  const colourFor = value => ramp[Math.min(classes.length - 1, Math.max(0, Math.floor((value - start) / step)))];
  return { step, start, classes, top: start + classes.length * step, colourFor };
}

export function projector(bounds) {
  const [left, bottom, right, top] = bounds;
  const cos = Math.cos((top + bottom) / 2 * Math.PI / 180);
  const scale = Math.min((VIEW.width - 2 * VIEW.pad) / ((right - left) * cos), (VIEW.height - 2 * VIEW.pad) / (top - bottom));
  const ox = (VIEW.width - (right - left) * cos * scale) / 2;
  const oy = (VIEW.height - (top - bottom) * scale) / 2;
  const project = ([lon, lat]) => [ox + (lon - left) * cos * scale, oy + (top - lat) * scale];
  const ringPath = ring => ring.map((point, i) => `${i ? 'L' : 'M'}${project(point).map(v => v.toFixed(1)).join(',')}`).join(' ') + 'Z';
  const featurePath = f => (f.type === 'Polygon' ? [f.coordinates] : f.coordinates).map(poly => poly.map(ringPath).join(' ')).join(' ');
  const ringsPath = rings => rings.map(ringPath).join(' ');
  return { project, featurePath, ringsPath };
}

// Bounding box of a projected path, used to zoom to a region.
export function pathBox(feature, project) {
  const polys = feature.type === 'Polygon' ? [feature.coordinates] : feature.coordinates;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  polys.forEach(poly => poly[0].forEach(point => {
    const [x, y] = project(point);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }));
  return { x0, y0, x1, y1 };
}
