import { TrafficCamera, CAMERAS } from '../data/cameras';

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteTrafficCamera extends TrafficCamera {
  status: 'fluido' | 'denso' | 'retencion';
  delayContributionMin: number;
  speedKmH: number;
}

export interface CalculatedRoute {
  id: string;
  name: string;
  description: string;
  distanceKm: number;
  baseMinutes: number;
  trafficDelayMinutes: number;
  totalMinutes: number;
  status: 'fluido' | 'moderado' | 'concurrido' | 'critico';
  isFastest: boolean;
  timeSavingsMinutes: number;
  coordinates: [number, number][]; // [lat, lng] for Leaflet
  cameras: RouteTrafficCamera[];
  color: string;
  hasBusTaxiLane?: boolean;
  busTaxiSavingsMinutes?: number;
}

// Haversine formula in meters
export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Distance from point to line segment in meters
function pointToSegmentDistance(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const dx = bLng - aLng;
  const dy = bLat - aLat;
  if (dx === 0 && dy === 0) {
    return getDistanceMeters(pLat, pLng, aLat, aLng);
  }

  const t = Math.max(0, Math.min(1, ((pLng - aLng) * dx + (pLat - aLat) * dy) / (dx * dx + dy * dy)));
  const projLat = aLat + t * dy;
  const projLng = aLng + t * dx;

  return getDistanceMeters(pLat, pLng, projLat, projLng);
}

// Check if camera is along polyline (within buffer meters)
export function getCamerasAlongPolyline(
  polyline: [number, number][],
  allCameras: TrafficCamera[],
  bufferMeters = 380
): TrafficCamera[] {
  const matched = new Set<string>();
  const result: TrafficCamera[] = [];

  for (const cam of allCameras) {
    let minDistance = Infinity;

    // Sample along polyline segments
    for (let i = 0; i < polyline.length - 1; i++) {
      const d = pointToSegmentDistance(
        cam.lat,
        cam.lng,
        polyline[i][0],
        polyline[i][1],
        polyline[i + 1][0],
        polyline[i + 1][1]
      );
      if (d < minDistance) minDistance = d;
      if (minDistance <= bufferMeters) break;
    }

    if (minDistance <= bufferMeters && !matched.has(cam.id)) {
      matched.add(cam.id);
      result.push(cam);
    }
  }

  return result;
}

// Heuristic traffic status for cameras based on hour and seed
export function evaluateCameraTraffic(
  cam: TrafficCamera,
  hour = new Date().getHours(),
  isRushHourForced = false
): RouteTrafficCamera {
  // Deterministic hash based on ID and current hour block
  let hash = 0;
  const str = cam.id + (cam.zona || '') + Math.floor(hour / 2);
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const normalized = Math.abs(hash % 100);

  // Rush hour factors (8:00 - 9:30, 13:30 - 15:00, 19:00 - 20:30)
  const isNaturalRushHour = (hour >= 8 && hour <= 9) || (hour >= 13 && hour <= 15) || (hour >= 19 && hour <= 21);
  const rush = isRushHourForced || isNaturalRushHour;

  // Prone bottleneck areas in Alicante:
  const isProne =
    cam.name.toLowerCase().includes('soler') ||
    cam.name.toLowerCase().includes('novelda') ||
    cam.name.toLowerCase().includes('maisonnave') ||
    cam.name.toLowerCase().includes('esplá') ||
    cam.name.toLowerCase().includes('galdós') ||
    cam.name.toLowerCase().includes('a 31') ||
    cam.name.toLowerCase().includes('lafora') ||
    cam.name.toLowerCase().includes('n-332');

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
      status = 'fluido';
      delay = 0.2;
      speedKmH = 42;
    }
  } else {
    if (isProne && normalized > 75) {
      status = 'denso';
      delay = 1.0;
      speedKmH = 28;
    } else if (normalized > 88) {
      status = 'retencion';
      delay = 2.0;
      speedKmH = 18;
    } else {
      status = 'fluido';
      delay = 0;
      speedKmH = 50;
    }
  }

  return {
    ...cam,
    status,
    delayContributionMin: Math.round(delay * 10) / 10,
    speedKmH,
  };
}

interface RawOsrmRoute {
  coordinates: [number, number][];
  distanceKm: number;
  baseMinutes: number;
}

// Query OSRM with coordinates and optional alternatives
async function fetchOsrmRoutes(
  coords: [number, number][],
  alternatives = true
): Promise<RawOsrmRoute[]> {
  try {
    const coordString = coords.map((c) => `${c[1].toFixed(5)},${c[0].toFixed(5)}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson&alternatives=${alternatives}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'AlicanteTrafficApp/1.0' },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes || !Array.isArray(data.routes)) return [];

    return data.routes.map((r: any) => ({
      coordinates: r.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]),
      distanceKm: Math.round((r.distance / 1000) * 10) / 10,
      baseMinutes: Math.max(1, Math.round(r.duration / 60)),
    }));
  } catch {
    return [];
  }
}

// Fallback interpolation if OSRM is offline
function generateFallbackPath(
  start: [number, number],
  end: [number, number],
  waypoint?: [number, number]
): [number, number][] {
  const points: [number, number][] = [];
  const steps = 15;

  if (waypoint) {
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push([start[0] + (waypoint[0] - start[0]) * t, start[1] + (waypoint[1] - start[1]) * t]);
    }
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      points.push([waypoint[0] + (end[0] - waypoint[0]) * t, waypoint[1] + (end[1] - waypoint[1]) * t]);
    }
  } else {
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push([start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t]);
    }
  }
  return points;
}

// Strategic corridor anchor points in Alicante for cross-city trips
const CORRIDOR_WAYPOINTS = [
  {
    id: 'corridor-litoral',
    name: 'Ruta Litoral / Av. de Dénia',
    description: 'Paseo Marítimo, Postiguet y conexión Dénia',
    color: '#06b6d4', // Cyan
    point: [38.3490, -0.4710] as [number, number], // Postiguet / Litoral
  },
  {
    id: 'corridor-granvia',
    name: 'Ruta Gran Vía (Ronda Interior)',
    description: 'Avda. Pintor Xavier Soler y Avda. Colombia',
    color: '#3b82f6', // Blue
    point: [38.3660, -0.4760] as [number, number], // Gran Vía Pintor Xavier Soler
  },
  {
    id: 'corridor-viaparque',
    name: 'Ruta Vía Parque / Rondas',
    description: 'Bulevar Teulada, Avda. Jaime I y enlace A-70',
    color: '#a855f7', // Purple
    point: [38.3680, -0.4990] as [number, number], // Vía Parque / Teulada
  },
];

export async function calculateAlternativeRoutes(
  origin: RoutePoint,
  destination: RoutePoint,
  isRushHourForced = false,
  busTaxiLaneActive = false
): Promise<CalculatedRoute[]> {
  const start: [number, number] = [origin.lat, origin.lng];
  const end: [number, number] = [destination.lat, destination.lng];

  const directDistMeters = getDistanceMeters(start[0], start[1], end[0], end[1]);
  const directDistKm = directDistMeters / 1000;
  const isLocalTrip = directDistKm < 3.5;

  const rawCandidateRoutes: Array<{
    id: string;
    name: string;
    description: string;
    color: string;
    raw: RawOsrmRoute;
  }> = [];

  // 1. Fetch direct routes from OSRM (natural driving paths between start and end)
  const directOsrm = await fetchOsrmRoutes([start, end], true);

  if (directOsrm.length > 0) {
    // Primary direct route
    rawCandidateRoutes.push({
      id: 'route-direct',
      name: isLocalTrip ? 'Ruta Directa' : 'Ruta Principal',
      description: isLocalTrip
        ? 'Trazado natural más directo por callejero'
        : 'Eje directo principal entre puntos',
      color: '#06b6d4',
      raw: directOsrm[0],
    });

    // If OSRM returned natural alternatives, add them
    if (directOsrm.length > 1) {
      rawCandidateRoutes.push({
        id: 'route-osrm-alt-1',
        name: isLocalTrip ? 'Ruta Alternativa' : 'Ruta Alternativa',
        description: 'Vía alternativa por calles adyacentes',
        color: '#3b82f6',
        raw: directOsrm[1],
      });
    }

    if (directOsrm.length > 2) {
      rawCandidateRoutes.push({
        id: 'route-osrm-alt-2',
        name: 'Ruta Secundaria',
        description: 'Trazado secundario de menor congestión',
        color: '#a855f7',
        raw: directOsrm[2],
      });
    }
  } else {
    // Fallback direct path if OSRM is offline
    const fallbackCoords = generateFallbackPath(start, end);
    const estKm = Math.max(0.4, Math.round(directDistKm * 1.25 * 10) / 10);
    rawCandidateRoutes.push({
      id: 'route-direct',
      name: 'Ruta Directa',
      description: 'Trazado directo por callejero urbano',
      color: '#06b6d4',
      raw: {
        coordinates: fallbackCoords,
        distanceKm: estKm,
        baseMinutes: Math.max(1, Math.round(estKm * 2.2)),
      },
    });
  }

  // 2. If it is a local trip and we only have 1 route, generate a gentle local alternative
  if (isLocalTrip && rawCandidateRoutes.length === 1) {
    const midLat = (start[0] + end[0]) / 2;
    const midLng = (start[1] + end[1]) / 2;
    const dLat = end[0] - start[0];
    const dLng = end[1] - start[1];

    // Slight perpendicular offset of ~250m strictly within the neighborhood
    const localOffsetWp: [number, number] = [midLat - dLng * 0.35, midLng + dLat * 0.35];
    const localAltRoutes = await fetchOsrmRoutes([start, localOffsetWp, end], false);

    if (localAltRoutes.length > 0) {
      const alt = localAltRoutes[0];
      // Only accept if distance is reasonable (less than 1.5x direct)
      if (alt.distanceKm <= (directDistKm + 0.3) * 1.5) {
        rawCandidateRoutes.push({
          id: 'route-local-alt',
          name: 'Ruta Alternativa Local',
          description: 'Desvío por avenida paralela del barrio',
          color: '#3b82f6',
          raw: alt,
        });
      }
    }
  }

  // 3. If it is a cross-city trip (>= 3.5 km), test major Alicante corridors ONLY IF detour is <= 35%
  if (!isLocalTrip) {
    for (const corridor of CORRIDOR_WAYPOINTS) {
      // Check geometric detour ratio
      const d1 = getDistanceMeters(start[0], start[1], corridor.point[0], corridor.point[1]);
      const d2 = getDistanceMeters(corridor.point[0], corridor.point[1], end[0], end[1]);
      const detourRatio = (d1 + d2) / directDistMeters;

      // CRITICAL: Reject if corridor causes an absurd detour!
      if (detourRatio > 1.35) {
        continue;
      }

      // If already have 3 candidates, stop
      if (rawCandidateRoutes.length >= 3) break;

      // Don't duplicate similar routes
      const alreadyHasCorridor = rawCandidateRoutes.some((r) => r.id === corridor.id);
      if (alreadyHasCorridor) continue;

      const corridorRoutes = await fetchOsrmRoutes([start, corridor.point, end], false);
      if (corridorRoutes.length > 0) {
        rawCandidateRoutes.push({
          id: corridor.id,
          name: corridor.name,
          description: corridor.description,
          color: corridor.color,
          raw: corridorRoutes[0],
        });
      }
    }
  }

  // 4. Intersect cameras and calculate traffic delay for each candidate route
  const results: CalculatedRoute[] = rawCandidateRoutes.map((candidate) => {
    const coordinates = candidate.raw.coordinates;
    const distanceKm = candidate.raw.distanceKm;
    const baseMinutes = candidate.raw.baseMinutes;

    // Detect cameras along this route corridor (within 380m)
    const rawCams = getCamerasAlongPolyline(coordinates, CAMERAS, 380);
    const evaluatedCams = rawCams.map((cam) =>
      evaluateCameraTraffic(cam, new Date().getHours(), isRushHourForced)
    );

    // Check if route corridor has bus-taxi priority lanes
    const corridorKeywords = ['maisonnave', 'alfonso', 'rambla', 'denia', 'dénia', 'litoral', 'centro', 'directa', 'principal', 'aguilera'];
    const lowerDesc = (candidate.name + ' ' + candidate.description).toLowerCase();
    const hasBusTaxi = corridorKeywords.some((kw) => lowerDesc.includes(kw));

    // Calculate traffic delay, applying Bus-Taxi lane exemption if active
    let delaySum = evaluatedCams.reduce((sum, item) => sum + item.delayContributionMin, 0);
    let busTaxiSavings = 0;

    if (busTaxiLaneActive && hasBusTaxi && delaySum >= 1) {
      // In Alicante bus-taxi lanes, public transport vehicles avoid 65% of corridor delay
      busTaxiSavings = Math.max(1, Math.round(delaySum * 0.65));
      delaySum = Math.max(0, delaySum - busTaxiSavings);
    }

    const trafficDelayMinutes = Math.round(delaySum);
    const totalMinutes = Math.max(baseMinutes + trafficDelayMinutes, 1);

    // Congestion status
    const redCount = evaluatedCams.filter((x) => x.status === 'retencion').length;
    const yellowCount = evaluatedCams.filter((x) => x.status === 'denso').length;

    let status: 'fluido' | 'moderado' | 'concurrido' | 'critico' = 'fluido';
    if (redCount >= 2) status = 'critico';
    else if (redCount === 1 || yellowCount >= 3) status = 'concurrido';
    else if (yellowCount >= 1) status = 'moderado';

    return {
      id: candidate.id,
      name: candidate.name,
      description: candidate.description,
      distanceKm,
      baseMinutes,
      trafficDelayMinutes,
      totalMinutes,
      status,
      isFastest: false,
      timeSavingsMinutes: 0,
      coordinates,
      cameras: evaluatedCams,
      color: candidate.color,
      hasBusTaxiLane: hasBusTaxi,
      busTaxiSavingsMinutes: busTaxiSavings,
    };
  });

  // 5. Determine winning fastest route
  let minMinutes = Infinity;
  let fastestIdx = 0;

  results.forEach((r, i) => {
    if (r.totalMinutes < minMinutes) {
      minMinutes = r.totalMinutes;
      fastestIdx = i;
    }
  });

  const maxMinutes = Math.max(...results.map((r) => r.totalMinutes));

  results.forEach((r, i) => {
    if (i === fastestIdx) {
      r.isFastest = true;
      r.timeSavingsMinutes = Math.max(0, maxMinutes - r.totalMinutes);
    }
  });

  return results;
}
