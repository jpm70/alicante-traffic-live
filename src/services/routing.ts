import { TrafficCamera, CAMERAS } from '../data/cameras';
import { TrafficAlert } from '../data/trafficAlerts';
import { BUS_TAXI_STREET_KEYWORDS } from '../data/publicTransport';
import {
  LatLng,
  getDistanceMeters,
  distanceToPolyline,
  makeLocalProjection,
  buildRouteIndex,
  pointAtDistance,
} from './geometry';

export { getDistanceMeters } from './geometry';

export interface RoutePoint {
  lat: number;
  lng: number;
}

// One OSRM step: the maneuver that starts it plus the stretch of road until the next one
export interface RouteStep {
  type: string; // depart, turn, new name, continue, roundabout, rotary, merge, on ramp, off ramp, fork, end of road, arrive...
  modifier?: string; // left, right, slight left, sharp right, straight, uturn
  exit?: number; // roundabout exit number
  name: string;
  ref?: string;
  distance: number; // meters
  duration: number; // seconds
  location: LatLng; // maneuver point
  geometry: LatLng[];
}

export interface RouteTrafficCamera extends TrafficCamera {
  status: 'fluido' | 'denso' | 'retencion';
  delayContributionMin: number;
  speedKmH: number;
  streetName?: string;
}

export interface CalculatedRoute {
  id: string;
  name: string;
  description: string;
  distanceKm: number;
  baseMinutes: number;
  // Estimated delay at the cameras on the route (time-of-day model)
  cameraDelayMinutes: number;
  // Camera estimate + official incidents
  trafficDelayMinutes: number;
  totalMinutes: number;
  status: 'fluido' | 'moderado' | 'concurrido' | 'critico';
  isFastest: boolean;
  timeSavingsMinutes: number;
  coordinates: LatLng[]; // [lat, lng] for Leaflet
  cameras: RouteTrafficCamera[];
  color: string;
  hasBusTaxiLane?: boolean;
  busTaxiSavingsMinutes?: number;
  // Turn-by-turn steps returned by the routing engine (empty for approximate routes)
  steps: RouteStep[];
  // True when no routing server answered and the line is only a straight estimate
  isApproximate: boolean;
  routingProvider?: string;
  // Official DGT incidents located on this route
  incidents: TrafficAlert[];
  incidentDelayMinutes: number;
}

export interface RouteCalculationOptions {
  rushHourForced?: boolean;
  busTaxiLaneActive?: boolean;
  incidents?: TrafficAlert[];
  // Only the direct route (used for GPS re-routing, where latency matters)
  quick?: boolean;
}

// ---------------------------------------------------------------------------
// Camera matching
// ---------------------------------------------------------------------------

// Camera coordinates in the municipal dataset are rounded to 3-4 decimals (±50 m),
// so a tight buffer misses cameras that are really on the route, and the old 380 m
// buffer swallowed cameras on parallel streets. We accept a camera when it is very
// close, or reasonably close AND its name matches the street the route is using.
const CAMERA_NEAR_METERS = 60;
const CAMERA_NAME_MATCH_METERS = 160;

const STOP_WORDS = new Set([
  'avenida', 'avda', 'calle', 'plaza', 'paseo', 'rambla', 'glorieta', 'rotonda', 'carrer', 'placa',
  'del', 'de', 'la', 'las', 'los', 'el', 'y', 'con', 'cruce', 'acceso', 'salida', 'entrada', 'tunel',
  'doctor', 'dr', 'pintor', 'general', 'gran', 'alicante', 'alacant', 'sentido', 'norte', 'sur',
]);

export function normalizeStreet(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function streetTokens(text: string): string[] {
  return normalizeStreet(text)
    .split(' ')
    .filter((t) => t.length >= 4 && !STOP_WORDS.has(t));
}

function namesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const tb = new Set(streetTokens(b));
  return streetTokens(a).some((t) => tb.has(t));
}

function matchCamerasToRoute(
  coordinates: LatLng[],
  steps: RouteStep[],
  allCameras: TrafficCamera[]
): { camera: TrafficCamera; streetName?: string }[] {
  if (coordinates.length < 2) return [];

  // Bounding box prefilter
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const [lat, lng] of coordinates) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  const pad = 0.003;

  const matched: { camera: TrafficCamera; streetName?: string; along: number }[] = [];
  const index = buildRouteIndex(coordinates);

  for (const cam of allCameras) {
    if (cam.lat < minLat - pad || cam.lat > maxLat + pad || cam.lng < minLng - pad || cam.lng > maxLng + pad) continue;

    const d = distanceToPolyline(cam.lat, cam.lng, coordinates);
    if (d > CAMERA_NAME_MATCH_METERS) continue;

    // Street the route is using next to the camera
    let streetName: string | undefined;
    let bestStepDist = Infinity;
    for (const step of steps) {
      if (!step.name || step.geometry.length < 2) continue;
      const sd = distanceToPolyline(cam.lat, cam.lng, step.geometry);
      if (sd < bestStepDist) {
        bestStepDist = sd;
        streetName = step.name;
      }
    }

    const accept = d <= CAMERA_NEAR_METERS || (streetName !== undefined && namesMatch(cam.name, streetName));
    if (!accept) continue;

    // Order cameras by their position along the route
    let along = 0;
    let best = Infinity;
    for (let i = 0; i < coordinates.length; i++) {
      const dd = getDistanceMeters(cam.lat, cam.lng, coordinates[i][0], coordinates[i][1]);
      if (dd < best) {
        best = dd;
        along = index.cumulative[i];
      }
    }
    matched.push({ camera: cam, streetName, along });
  }

  return matched.sort((a, b) => a.along - b.along);
}

// Kept for other consumers: cameras within a buffer of a polyline
export function getCamerasAlongPolyline(
  polyline: LatLng[],
  allCameras: TrafficCamera[],
  bufferMeters = CAMERA_NEAR_METERS
): TrafficCamera[] {
  return allCameras.filter((cam) => distanceToPolyline(cam.lat, cam.lng, polyline) <= bufferMeters);
}

// ---------------------------------------------------------------------------
// Traffic estimate per camera
// ---------------------------------------------------------------------------
// There is no public feed with live traffic speeds for Alicante's urban streets,
// so congestion is ESTIMATED from the time of day and the historically conflictive
// points. It is deterministic for a given camera and 2-hour block so the result
// does not flicker between recalculations. The UI labels it as an estimate.
export function evaluateCameraTraffic(
  cam: TrafficCamera,
  hour = new Date().getHours(),
  isRushHourForced = false
): RouteTrafficCamera {
  let hash = 0;
  const str = cam.id + (cam.zona || '') + Math.floor(hour / 2);
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const normalized = Math.abs(hash % 100);

  // Rush hour windows (8:00-9:59, 13:00-15:59, 19:00-21:59)
  const isNaturalRushHour = (hour >= 8 && hour <= 9) || (hour >= 13 && hour <= 15) || (hour >= 19 && hour <= 21);
  const rush = isRushHourForced || isNaturalRushHour;

  const lowerName = cam.name.toLowerCase();
  const isProne = ['soler', 'novelda', 'maisonnave', 'esplá', 'galdós', 'a 31', 'lafora', 'n-332'].some((k) =>
    lowerName.includes(k)
  );

  let status: 'fluido' | 'denso' | 'retencion' = 'fluido';
  let delay = 0;
  let speedKmH = 48;

  if (rush) {
    if (isProne && normalized > 40) {
      status = 'retencion';
      delay = 2.5;
      speedKmH = 15;
    } else if (normalized > 55) {
      status = 'denso';
      delay = 1.2;
      speedKmH = 26;
    } else {
      delay = 0.2;
      speedKmH = 42;
    }
  } else if (isProne && normalized > 75) {
    status = 'denso';
    delay = 1.0;
    speedKmH = 28;
  } else if (normalized > 88) {
    status = 'retencion';
    delay = 2.0;
    speedKmH = 18;
  } else {
    speedKmH = 50;
  }

  return { ...cam, status, delayContributionMin: Math.round(delay * 10) / 10, speedKmH };
}

// ---------------------------------------------------------------------------
// Routing engine (OSRM)
// ---------------------------------------------------------------------------
interface RawRoute {
  coordinates: LatLng[];
  distanceKm: number;
  baseMinutes: number;
  steps: RouteStep[];
  provider: string;
}

// Public OSRM servers with CORS enabled. The demo server is tried first; the FOSSGIS
// mirror answers when the demo server is slow, rate limited (429) or down.
const OSRM_PROVIDERS = [
  { name: 'OSRM', baseUrl: 'https://router.project-osrm.org/route/v1/driving' },
  { name: 'FOSSGIS OSRM', baseUrl: 'https://routing.openstreetmap.de/routed-car/route/v1/driving' },
];

const OSRM_TIMEOUT_MS = 8000;

// index.html sends no Referer at all (the municipal camera server rejects foreign
// referers), but the OpenStreetMap services (Overpass, Nominatim) reject anonymous
// browser requests without one. For them we send just our origin.
export const OSM_REQUEST_INIT: RequestInit = { referrerPolicy: 'strict-origin-when-cross-origin' };

// AbortSignal.timeout() does not exist on Safari < 16 and some car browsers; this works everywhere.
export async function fetchWithTimeout(url: string, timeoutMs: number, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Only CORS-safelisted headers here: a custom header (e.g. User-Agent) triggers a
    // preflight that OSRM rejects, which broke routing completely in Firefox.
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function parseOsrmRoute(r: any, provider: string): RawRoute {
  const steps: RouteStep[] = [];
  const legs: any[] = r.legs || [];
  legs.forEach((leg, legIdx) => {
    for (const s of leg.steps || []) {
      const type: string = s.maneuver?.type || 'continue';
      // Hide the intermediate arrive/depart created by via-points
      if (type === 'arrive' && legIdx < legs.length - 1) continue;
      if (type === 'depart' && legIdx > 0) continue;
      steps.push({
        type,
        modifier: s.maneuver?.modifier,
        exit: s.maneuver?.exit,
        name: s.name || '',
        ref: s.ref || undefined,
        distance: s.distance || 0,
        duration: s.duration || 0,
        location: [s.maneuver.location[1], s.maneuver.location[0]],
        geometry: (s.geometry?.coordinates || []).map((c: [number, number]) => [c[1], c[0]] as LatLng),
      });
    }
  });

  return {
    coordinates: r.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as LatLng),
    distanceKm: Math.round((r.distance / 1000) * 10) / 10,
    baseMinutes: Math.max(1, Math.round(r.duration / 60)),
    steps,
    provider,
  };
}

async function fetchOsrmRoutes(coords: LatLng[], alternatives: boolean): Promise<RawRoute[]> {
  const coordString = coords.map((c) => `${c[1].toFixed(6)},${c[0].toFixed(6)}`).join(';');
  const query = `overview=full&geometries=geojson&steps=true&alternatives=${alternatives}`;

  for (const provider of OSRM_PROVIDERS) {
    try {
      const res = await fetchWithTimeout(`${provider.baseUrl}/${coordString}?${query}`, OSRM_TIMEOUT_MS);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.code !== 'Ok' || !Array.isArray(data.routes) || data.routes.length === 0) {
        // NoRoute / NoSegment are answers, not outages: another server will say the same
        if (data.code === 'NoRoute' || data.code === 'NoSegment') return [];
        continue;
      }
      return data.routes.map((r: any) => parseOsrmRoute(r, provider.name));
    } catch {
      // timeout / network error: try the next provider
    }
  }
  return [];
}

// Two candidate routes that share almost all their geometry are the same route
function isNearDuplicate(a: RawRoute, b: RawRoute): boolean {
  if (Math.abs(a.distanceKm - b.distanceKm) > Math.max(0.3, b.distanceKm * 0.08)) return false;
  const index = buildRouteIndex(a.coordinates);
  const samples = 25;
  let shared = 0;
  for (let i = 0; i <= samples; i++) {
    const p = pointAtDistance(index, (index.totalMeters * i) / samples);
    if (distanceToPolyline(p.lat, p.lng, b.coordinates) < 30) shared++;
  }
  return shared / (samples + 1) > 0.85;
}

// Strategic corridor anchor points in Alicante for cross-city trips
const CORRIDOR_WAYPOINTS = [
  {
    id: 'corridor-litoral',
    name: 'Ruta Litoral / Av. de Dénia',
    description: 'Paseo Marítimo, Postiguet y conexión Dénia',
    color: '#06b6d4',
    point: [38.349, -0.471] as LatLng,
  },
  {
    id: 'corridor-granvia',
    name: 'Ruta Gran Vía (Ronda Interior)',
    description: 'Avda. Pintor Xavier Soler y Avda. Colombia',
    color: '#3b82f6',
    point: [38.366, -0.476] as LatLng,
  },
  {
    id: 'corridor-viaparque',
    name: 'Ruta Vía Parque / Rondas',
    description: 'Bulevar Teulada, Avda. Jaime I y enlace A-70',
    color: '#a855f7',
    point: [38.368, -0.499] as LatLng,
  },
];

const ALT_COLORS = ['#3b82f6', '#a855f7'];

function describeMainStreets(steps: RouteStep[]): string {
  const byStreet = new Map<string, number>();
  for (const s of steps) {
    const label = s.name || s.ref;
    if (!label) continue;
    byStreet.set(label, (byStreet.get(label) || 0) + s.distance);
  }
  const top = [...byStreet.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([n]) => n);
  return top.length ? `Por ${top.join(' y ')}` : 'Trazado por callejero';
}

export async function calculateAlternativeRoutes(
  origin: RoutePoint,
  destination: RoutePoint,
  options: RouteCalculationOptions = {}
): Promise<CalculatedRoute[]> {
  const { rushHourForced = false, busTaxiLaneActive = false, incidents = [], quick = false } = options;
  const start: LatLng = [origin.lat, origin.lng];
  const end: LatLng = [destination.lat, destination.lng];

  const directDistMeters = getDistanceMeters(start[0], start[1], end[0], end[1]);
  const directDistKm = directDistMeters / 1000;
  const isLocalTrip = directDistKm < 3.5;

  const candidates: Array<{ id: string; name: string; description: string; color: string; raw: RawRoute; approximate: boolean }> = [];
  const addCandidate = (c: (typeof candidates)[number]) => {
    if (candidates.some((existing) => isNearDuplicate(c.raw, existing.raw))) return;
    candidates.push(c);
  };

  // 1. Direct route plus the engine's own alternatives
  const directRoutes = await fetchOsrmRoutes([start, end], !quick);

  if (directRoutes.length > 0) {
    directRoutes.slice(0, 3).forEach((raw, i) => {
      addCandidate({
        id: i === 0 ? 'route-direct' : `route-osrm-alt-${i}`,
        name: i === 0 ? (isLocalTrip ? 'Ruta Directa' : 'Ruta Principal') : i === 1 ? 'Ruta Alternativa' : 'Ruta Secundaria',
        description: describeMainStreets(raw.steps),
        color: i === 0 ? '#06b6d4' : ALT_COLORS[(i - 1) % ALT_COLORS.length],
        raw,
        approximate: false,
      });
    });
  } else {
    // No routing server reachable: show an honest straight-line estimate instead of
    // pretending it is a street route.
    const estKm = Math.max(0.4, Math.round(directDistKm * 1.3 * 10) / 10);
    addCandidate({
      id: 'route-direct',
      name: 'Trazado aproximado',
      description: 'Sin conexión con el servidor de rutas: línea recta orientativa',
      color: '#94a3b8',
      raw: {
        coordinates: [start, end],
        distanceKm: estKm,
        baseMinutes: Math.max(1, Math.round(estKm * 2.2)),
        steps: [],
        provider: 'none',
      },
      approximate: true,
    });
  }

  const routingAvailable = directRoutes.length > 0;

  // 2. Local trips with a single option: try a parallel street ~25% to the side
  if (!quick && routingAvailable && isLocalTrip && candidates.length === 1) {
    const proj = makeLocalProjection(start[0], start[1]);
    const e = proj.toXY(end[0], end[1]);
    const len = Math.hypot(e.x, e.y) || 1;
    const offset = Math.min(400, len * 0.25);
    const mid = { x: e.x / 2 - (e.y / len) * offset, y: e.y / 2 + (e.x / len) * offset };
    const localAlt = await fetchOsrmRoutes([start, proj.toLatLng(mid.x, mid.y), end], false);
    if (localAlt.length > 0 && localAlt[0].distanceKm <= (directDistKm + 0.3) * 1.5) {
      addCandidate({
        id: 'route-local-alt',
        name: 'Ruta Alternativa Local',
        description: describeMainStreets(localAlt[0].steps),
        color: '#3b82f6',
        raw: localAlt[0],
        approximate: false,
      });
    }
  }

  // 3. Cross-city trips: test the main Alicante corridors when the detour is reasonable
  if (!quick && routingAvailable && !isLocalTrip) {
    for (const corridor of CORRIDOR_WAYPOINTS) {
      if (candidates.length >= 3) break;
      const d1 = getDistanceMeters(start[0], start[1], corridor.point[0], corridor.point[1]);
      const d2 = getDistanceMeters(corridor.point[0], corridor.point[1], end[0], end[1]);
      if ((d1 + d2) / directDistMeters > 1.35) continue;

      const corridorRoutes = await fetchOsrmRoutes([start, corridor.point, end], false);
      if (corridorRoutes.length > 0) {
        addCandidate({
          id: corridor.id,
          name: corridor.name,
          description: corridor.description,
          color: corridor.color,
          raw: corridorRoutes[0],
          approximate: false,
        });
      }
    }
  }

  const hour = new Date().getHours();

  // 4. Cameras, estimated congestion and official incidents for each candidate
  const results: CalculatedRoute[] = candidates.map((candidate) => {
    const { coordinates, distanceKm, baseMinutes, steps } = candidate.raw;

    const evaluatedCams = matchCamerasToRoute(coordinates, steps, CAMERAS).map(({ camera, streetName }) => ({
      ...evaluateCameraTraffic(camera, hour, rushHourForced),
      streetName,
    }));

    // Bus-taxi lanes: decided by the real street names of the route, not by its label
    const usesBusLane = (name?: string) => {
      if (!name) return false;
      const n = normalizeStreet(name);
      return BUS_TAXI_STREET_KEYWORDS.some((kw) => n.includes(kw));
    };
    const hasBusTaxi = steps.some((s) => usesBusLane(s.name));

    let delaySum = evaluatedCams.reduce((sum, c) => sum + c.delayContributionMin, 0);
    let busTaxiSavings = 0;
    if (busTaxiLaneActive && hasBusTaxi) {
      // Vehicles allowed in the reserved lane skip ~65% of the delay on those streets
      const laneDelay = evaluatedCams
        .filter((c) => usesBusLane(c.streetName) || usesBusLane(c.name))
        .reduce((sum, c) => sum + c.delayContributionMin, 0);
      busTaxiSavings = Math.round(laneDelay * 0.65);
      delaySum = Math.max(0, delaySum - busTaxiSavings);
    }

    return {
      id: candidate.id,
      name: candidate.name,
      description: candidate.description,
      distanceKm,
      baseMinutes,
      cameraDelayMinutes: Math.round(delaySum),
      trafficDelayMinutes: Math.round(delaySum),
      totalMinutes: Math.max(baseMinutes + Math.round(delaySum), 1),
      status: 'fluido' as CalculatedRoute['status'],
      isFastest: false,
      timeSavingsMinutes: 0,
      coordinates,
      cameras: evaluatedCams,
      color: candidate.color,
      hasBusTaxiLane: hasBusTaxi,
      busTaxiSavingsMinutes: busTaxiSavings,
      steps,
      isApproximate: candidate.approximate,
      routingProvider: candidate.raw.provider,
      incidents: [],
      incidentDelayMinutes: 0,
    };
  });

  return applyIncidents(results, incidents);
}

// Attach official incidents to each route and recompute delays, status and the
// fastest route. Pure function, so the app can re-apply fresh DGT data without
// asking the routing server again.
export function applyIncidents(routes: CalculatedRoute[], incidents: TrafficAlert[]): CalculatedRoute[] {
  const results = routes.map((route) => {
    const routeIncidents = route.coordinates.length >= 2 && !route.isApproximate
      ? incidents.filter((a) => distanceToPolyline(a.lat, a.lng, route.coordinates) <= 80)
      : [];
    const incidentDelay = routeIncidents.reduce((sum, a) => sum + (a.delayMin || 0), 0);
    const trafficDelayMinutes = route.cameraDelayMinutes + incidentDelay;

    const redCount = route.cameras.filter((x) => x.status === 'retencion').length;
    const yellowCount = route.cameras.filter((x) => x.status === 'denso').length;
    const severeIncident = routeIncidents.some((a) => a.severity === 'alta');

    let status: CalculatedRoute['status'] = 'fluido';
    if (redCount >= 2 || (severeIncident && redCount >= 1)) status = 'critico';
    else if (redCount === 1 || yellowCount >= 3 || severeIncident) status = 'concurrido';
    else if (yellowCount >= 1 || routeIncidents.length > 0) status = 'moderado';

    return {
      ...route,
      incidents: routeIncidents,
      incidentDelayMinutes: incidentDelay,
      trafficDelayMinutes,
      totalMinutes: Math.max(route.baseMinutes + trafficDelayMinutes, 1),
      status,
      isFastest: false,
      timeSavingsMinutes: 0,
    };
  });

  if (results.length > 0) {
    let fastestIdx = 0;
    results.forEach((r, i) => {
      if (r.totalMinutes < results[fastestIdx].totalMinutes) fastestIdx = i;
    });
    const maxMinutes = Math.max(...results.map((r) => r.totalMinutes));
    results[fastestIdx].isFastest = true;
    results[fastestIdx].timeSavingsMinutes = Math.max(0, maxMinutes - results[fastestIdx].totalMinutes);
  }

  return results;
}
