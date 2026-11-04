// Builds src/data/applicationMapContext.json: neighbouring land, lakes and capitals drawn around each dashboard map.
// Source: Natural Earth 1:50m admin-0 countries and lakes (public domain), https://github.com/nvkelso/natural-earth-vector
// Usage: node scripts/build-map-context.mjs <ne_50m_admin_0_countries.geojson> <ne_50m_lakes.geojson>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [countriesFile, lakesFile] = process.argv.slice(2);
if (!countriesFile || !lakesFile) throw new Error('Pass the Natural Earth countries and lakes GeoJSON files.');
const regions = JSON.parse(fs.readFileSync(path.join(root, 'src/data/applicationRegions.json'), 'utf8'));
const countries = JSON.parse(fs.readFileSync(countriesFile, 'utf8')).features;
const lakes = JSON.parse(fs.readFileSync(lakesFile, 'utf8')).features;

// Must match the projection in ApplicationRegionMap.jsx.
const VIEW = { width: 560, height: 325, pad: 12 };
const CAPITALS = { Kenya: ['Nairobi', [36.82, -1.29]], Nigeria: ['Abuja', [7.49, 9.06]], Ghana: ['Accra', [-0.19, 5.6]], Zambia: ['Lusaka', [28.32, -15.39]] };

// The lon/lat rectangle that fills the whole map frame, not just the country.
function frameFor([left, bottom, right, top]) {
  const cos = Math.cos((top + bottom) / 2 * Math.PI / 180);
  const scale = Math.min((VIEW.width - 2 * VIEW.pad) / ((right - left) * cos), (VIEW.height - 2 * VIEW.pad) / (top - bottom));
  const ox = (VIEW.width - (right - left) * cos * scale) / 2;
  const oy = (VIEW.height - (top - bottom) * scale) / 2;
  const margin = 0.02 * (right - left);
  return [left - ox / (cos * scale) - margin, top - (VIEW.height - oy) / scale - margin, left + (VIEW.width - ox) / (cos * scale) + margin, top + oy / scale + margin];
}

// Sutherland-Hodgman clipping of one ring to an axis-aligned rectangle.
function clipRing(ring, [l, b, r, t]) {
  const edges = [[p => p[0] >= l, (p, q) => cut(p, q, 0, l)], [p => p[0] <= r, (p, q) => cut(p, q, 0, r)], [p => p[1] >= b, (p, q) => cut(p, q, 1, b)], [p => p[1] <= t, (p, q) => cut(p, q, 1, t)]];
  function cut(p, q, axis, value) {
    const k = (value - p[axis]) / (q[axis] - p[axis]);
    return axis === 0 ? [value, p[1] + k * (q[1] - p[1])] : [p[0] + k * (q[0] - p[0]), value];
  }
  let out = ring;
  for (const [inside, intersect] of edges) {
    const input = out;
    out = [];
    input.forEach((current, i) => {
      const previous = input[(i + input.length - 1) % input.length];
      if (inside(current)) {
        if (!inside(previous)) out.push(intersect(previous, current));
        out.push(current);
      } else if (inside(previous)) out.push(intersect(previous, current));
    });
    if (!out.length) return [];
  }
  return out;
}

// Douglas-Peucker on a closed ring: split at the point furthest from the start so neither half begins and ends on the same point.
function simplify(ring, tolerance) {
  const open = ring.length > 1 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1] ? ring.slice(0, -1) : ring;
  if (open.length < 4) return open;
  let far = 1;
  open.forEach((p, i) => { if (Math.hypot(p[0] - open[0][0], p[1] - open[0][1]) > Math.hypot(open[far][0] - open[0][0], open[far][1] - open[0][1])) far = i; });
  return [...simplifyLine(open.slice(0, far + 1), tolerance).slice(0, -1), ...simplifyLine([...open.slice(far), open[0]], tolerance).slice(0, -1)];
}

function simplifyLine(points, tolerance) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, z] = stack.pop();
    let worst = -1, index = -1;
    const [x1, y1] = points[a], [x2, y2] = points[z];
    const length = Math.hypot(x2 - x1, y2 - y1) || 1e-12;
    for (let i = a + 1; i < z; i++) {
      const d = Math.abs((x2 - x1) * (y1 - points[i][1]) - (x1 - points[i][0]) * (y2 - y1)) / length;
      if (d > worst) { worst = d; index = i; }
    }
    if (worst > tolerance) { keep[index] = 1; stack.push([a, index], [index, z]); }
  }
  return points.filter((_, i) => keep[i]);
}

const area = ring => ring.reduce((sum, [x, y], i) => { const [nx, ny] = ring[(i + 1) % ring.length]; return sum + x * ny - nx * y; }, 0) / 2;
const polygons = geometry => (geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates);
const round = ring => ring.map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]);
const intersects = ([l, b, r, t], ring) => ring.some(([x, y]) => x >= l && x <= r && y >= b && y <= t) || (Math.min(...ring.map(p => p[0])) < l && Math.max(...ring.map(p => p[0])) > r);

function clipFeature(geometry, frame, tolerance) {
  const rings = [];
  for (const polygon of polygons(geometry)) {
    for (const ring of polygon) {
      const bbox = [Math.min(...ring.map(p => p[0])), Math.min(...ring.map(p => p[1])), Math.max(...ring.map(p => p[0])), Math.max(...ring.map(p => p[1]))];
      if (bbox[2] < frame[0] || bbox[0] > frame[2] || bbox[3] < frame[1] || bbox[1] > frame[3]) continue;
      const clipped = simplify(clipRing(ring, frame), tolerance);
      if (clipped.length >= 3 && Math.abs(area(clipped)) > tolerance * tolerance * 4) rings.push(round(clipped));
    }
  }
  return rings;
}

function inside([x, y], rings) {
  let hit = false;
  for (const ring of rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

// A label point well inside the visible part of a neighbour: the grid point furthest from its edges and the frame.
function labelPoint(rings, frame, minimum = 0.035) {
  const [l, b, r, t] = frame;
  const edgeDistance = ([x, y]) => {
    let best = Math.min(x - l, r - x, y - b, t - y);
    for (const ring of rings) for (let i = 0; i < ring.length; i++) {
      const [x1, y1] = ring[i], [x2, y2] = ring[(i + 1) % ring.length];
      const dx = x2 - x1, dy = y2 - y1;
      const k = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)));
      best = Math.min(best, Math.hypot(x - (x1 + k * dx), y - (y1 + k * dy)));
    }
    return best;
  };
  let best = null;
  for (let i = 1; i < 30; i++) for (let j = 1; j < 30; j++) {
    const point = [l + (r - l) * i / 30, b + (t - b) * j / 30];
    if (!inside(point, rings)) continue;
    const d = edgeDistance(point);
    if (!best || d > best.d) best = { point, d };
  }
  // Too thin a sliver to carry a readable name.
  return best && best.d > (r - l) * minimum ? best.point.map(v => Math.round(v * 100) / 100) : null;
}

const output = {};
for (const [country, geo] of Object.entries(regions)) {
  const frame = frameFor(geo.bounds);
  const tolerance = (frame[2] - frame[0]) / 900;
  const land = countries
    .filter(f => f.properties.ADMIN !== country)
    .map(f => ({ name: f.properties.NAME, rings: clipFeature(f.geometry, frame, tolerance) }))
    .filter(f => f.rings.length)
    .map(f => ({ ...f, label: labelPoint(f.rings, frame) }));
  const water = lakes
    .map(f => ({ name: f.properties.name || '', rings: clipFeature(f.geometry, frame, tolerance) }))
    .filter(f => f.rings.length && f.rings.some(ring => intersects(frame, ring)))
    .map(f => ({ ...f, label: f.name && Math.abs(f.rings.reduce((n, ring) => n + area(ring), 0)) > (frame[2] - frame[0]) ** 2 * 0.0004 ? labelPoint(f.rings, frame, 0.004) : null }));
  output[country] = { frame: frame.map(v => Math.round(v * 1000) / 1000), land, lakes: water, capital: { name: CAPITALS[country][0], point: CAPITALS[country][1] } };
  console.log(`${country}: ${land.length} neighbours (${land.filter(f => f.label).map(f => f.name).join(', ')}), ${water.length} lakes (${water.filter(f => f.label).map(f => f.name).join(', ')})`);
}
const target = path.join(root, 'src/data/applicationMapContext.json');
fs.writeFileSync(target, JSON.stringify(output));
console.log(`Wrote ${target} (${Math.round(fs.statSync(target).size / 1024)} KB)`);
