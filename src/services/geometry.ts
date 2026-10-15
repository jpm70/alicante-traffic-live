// Geometric helpers shared by routing, GPS navigation and the 3D views.
// All coordinates are [lat, lng] pairs (Leaflet order).

export type LatLng = [number, number];

const EARTH_RADIUS_M = 6371e3;
const toRad = (deg: number) => (deg * Math.PI) / 180;

// Haversine distance in meters
export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Initial bearing between two points in degrees (0 = North, 90 = East)
export function getBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lon2 - lon1);
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Signed difference b2 - b1 normalised to -180..180
export function angleDifference(b1: number, b2: number): number {
  return ((((b2 - b1) % 360) + 540) % 360) - 180;
}

// Local equirectangular projection (meters) around a reference point.
// Accurate to well under 1 m over a city-sized area, which is all we need.
export function makeLocalProjection(refLat: number, refLng: number) {
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos(toRad(refLat));
  return {
    toXY(lat: number, lng: number): { x: number; y: number } {
      return { x: (lng - refLng) * mPerDegLng, y: (lat - refLat) * mPerDegLat };
    },
    toLatLng(x: number, y: number): LatLng {
      return [refLat + y / mPerDegLat, refLng + x / mPerDegLng];
    },
  };
}

// Distance from point P to segment AB in meters plus the projection parameter t (0..1)
export function pointToSegment(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): { distance: number; t: number } {
  const proj = makeLocalProjection(aLat, aLng);
  const p = proj.toXY(pLat, pLng);
  const b = proj.toXY(bLat, bLng);
  const len2 = b.x * b.x + b.y * b.y;
  if (len2 === 0) return { distance: Math.hypot(p.x, p.y), t: 0 };
  const t = Math.max(0, Math.min(1, (p.x * b.x + p.y * b.y) / len2));
  return { distance: Math.hypot(p.x - t * b.x, p.y - t * b.y), t };
}

export function distanceToPolyline(lat: number, lng: number, line: LatLng[]): number {
  if (line.length === 0) return Infinity;
  if (line.length === 1) return getDistanceMeters(lat, lng, line[0][0], line[0][1]);
  let min = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    const d = pointToSegment(lat, lng, line[i][0], line[i][1], line[i + 1][0], line[i + 1][1]).distance;
    if (d < min) min = d;
  }
  return min;
}

// ---------------------------------------------------------------------------
// Route index: cumulative distances for along-route lookups
// ---------------------------------------------------------------------------
export interface RouteIndex {
  coords: LatLng[];
  cumulative: number[]; // meters from start to each vertex
  totalMeters: number;
}

export function buildRouteIndex(coords: LatLng[]): RouteIndex {
  const cumulative: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    cumulative.push(
      cumulative[i - 1] + getDistanceMeters(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1])
    );
  }
  return { coords, cumulative, totalMeters: cumulative[cumulative.length - 1] || 0 };
}

// Position and travel bearing at a given distance along the route
export function pointAtDistance(index: RouteIndex, meters: number): { lat: number; lng: number; bearing: number; segIdx: number } {
  const { coords, cumulative, totalMeters } = index;
  if (coords.length === 0) return { lat: 0, lng: 0, bearing: 0, segIdx: 0 };
  if (coords.length === 1) return { lat: coords[0][0], lng: coords[0][1], bearing: 0, segIdx: 0 };

  const d = Math.max(0, Math.min(totalMeters, meters));
  // Binary search for the segment containing d
  let lo = 0;
  let hi = cumulative.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] <= d) lo = mid;
    else hi = mid;
  }
  // Skip zero-length segments so the bearing is meaningful
  let a = lo;
  let b = Math.min(lo + 1, coords.length - 1);
  while (b < coords.length - 1 && cumulative[b] - cumulative[a] < 0.01) b++;
  const segLen = cumulative[b] - cumulative[a];
  const t = segLen > 0 ? (d - cumulative[a]) / segLen : 0;
  const lat = coords[a][0] + (coords[b][0] - coords[a][0]) * t;
  const lng = coords[a][1] + (coords[b][1] - coords[a][1]) * t;
  return { lat, lng, bearing: getBearing(coords[a][0], coords[a][1], coords[b][0], coords[b][1]), segIdx: a };
}

// Project a free position (e.g. a GPS fix) onto the route.
// `hintMeters` restricts the search to a window around the last known progress,
// which avoids snapping to the opposite carriageway or to a later loop of the route.
export function projectOnRoute(
  index: RouteIndex,
  lat: number,
  lng: number,
  hintMeters?: number
): { alongMeters: number; offsetMeters: number; bearing: number } {
  const { coords, cumulative } = index;
  if (coords.length < 2) return { alongMeters: 0, offsetMeters: Infinity, bearing: 0 };

  const windowBack = 150;
  const windowAhead = 1500;
  let best = { alongMeters: 0, offsetMeters: Infinity, bearing: 0 };

  const search = (restrict: boolean) => {
    for (let i = 0; i < coords.length - 1; i++) {
      if (restrict && hintMeters !== undefined) {
        if (cumulative[i + 1] < hintMeters - windowBack || cumulative[i] > hintMeters + windowAhead) continue;
      }
      const { distance, t } = pointToSegment(lat, lng, coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
      if (distance < best.offsetMeters) {
        best = {
          alongMeters: cumulative[i] + t * (cumulative[i + 1] - cumulative[i]),
          offsetMeters: distance,
          bearing: getBearing(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]),
        };
      }
    }
  };

  search(true);
  // Nothing close inside the window (e.g. first fix or a big jump): search everywhere
  if (best.offsetMeters > 80) search(false);
  return best;
}

// Douglas-Peucker simplification (tolerance in meters)
export function simplifyPolyline(coords: LatLng[], toleranceMeters: number): LatLng[] {
  if (coords.length <= 2) return coords.slice();
  const keep = new Uint8Array(coords.length);
  keep[0] = 1;
  keep[coords.length - 1] = 1;
  const stack: [number, number][] = [[0, coords.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = pointToSegment(coords[i][0], coords[i][1], coords[s][0], coords[s][1], coords[e][0], coords[e][1]).distance;
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx !== -1 && maxD > toleranceMeters) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return coords.filter((_, i) => keep[i]);
}
