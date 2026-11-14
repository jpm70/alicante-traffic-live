// Real traffic measured by the DGT road detectors (data/traffic.json, generated every
// 15 minutes by scripts/update-dgt-data.ts). Covers the A-70 ring road and the A-31
// around Alicante; city streets keep the time-of-day estimate.
import type { CalculatedRoute } from './routing';
import { RouteIndex, buildRouteIndex, projectOnRoute } from './geometry';
import { fetchWithTimeout } from './routing';
import { routeUsesRoad } from './radars';
import { LIVE_SPEED_MAX_AGE_MIN, isOlderThan } from './dataAge';

export interface LiveStation {
  id: string;
  road: string;
  km: number | null;
  dir: '+' | '-' | null; // '+' = traffic towards increasing kilometre points
  lat: number;
  lng: number;
  speed: number | null; // km/h
  flow: number | null; // vehicles/hour
  occupancy: number | null; // %
  time: string | null;
  // Measurement too old to describe the road now: its speed has been removed
  stale?: boolean;
}

export interface LiveTrafficResponse {
  success: boolean;
  source: string;
  updatedAt: string | null;
  stations: LiveStation[];
}

export type LiveStatus = 'fluido' | 'denso' | 'retencion' | 'sin-datos';

export interface RouteLiveStation {
  station: LiveStation;
  alongMeters: number;
  status: LiveStatus;
  delayMinutes: number;
}

export const TRAFFIC_URL = `${import.meta.env.BASE_URL}data/traffic.json`;

export async function loadLiveTraffic(): Promise<LiveTrafficResponse | null> {
  try {
    const res = await fetchWithTimeout(`${TRAFFIC_URL}?t=${Date.now()}`, 15000);
    if (!res.ok) return null;
    const data: LiveTrafficResponse = await res.json();
    return Array.isArray(data.stations) ? data : null;
  } catch {
    return null;
  }
}

// The data file can be hours old (see dataAge.ts). Old measurements keep their place on
// the map and in the route's history, but without a speed: they add no delay and do not
// colour the route.
export function withoutStaleSpeeds(stations: LiveStation[], updatedAt: string | null, now: number = Date.now()): LiveStation[] {
  if (!isOlderThan(updatedAt, LIVE_SPEED_MAX_AGE_MIN, now)) return stations;
  return stations.map((s) => ({ ...s, speed: null, flow: null, occupancy: null, stale: true }));
}

// Thresholds for the motorways the detectors are on (A-70, A-31: 80-120 km/h limits)
export function liveStatus(station: Pick<LiveStation, 'speed' | 'occupancy'>): LiveStatus {
  if (station.speed === null) return 'sin-datos';
  const occ = station.occupancy ?? 0;
  if (station.speed < 40 || occ >= 40) return 'retencion';
  if (station.speed < 70 || occ >= 25) return 'denso';
  return 'fluido';
}

// Free-flow speed the routing engine roughly assumes on these motorways, and the stretch
// of road each measuring point represents
const FREE_FLOW_KMH = 90;
const STRETCH_KM = 1;

export function liveDelayMinutes(speed: number | null): number {
  if (speed === null || speed >= FREE_FLOW_KMH) return 0;
  const v = Math.max(5, speed);
  return Math.round(STRETCH_KM * (60 / v - 60 / FREE_FLOW_KMH) * 10) / 10;
}

// Detector on the route: within this distance of the line and on the same road
const ON_ROUTE_METERS = 60;

export function stationsAlongRoute(
  route: Pick<CalculatedRoute, 'coordinates' | 'isApproximate'> & Partial<Pick<CalculatedRoute, 'steps'>>,
  stations: LiveStation[],
  index?: RouteIndex
): RouteLiveStation[] {
  if (route.isApproximate || route.coordinates.length < 2 || stations.length === 0) return [];
  const idx = index || buildRouteIndex(route.coordinates);

  const near: { station: LiveStation; along: number; offset: number }[] = [];
  for (const station of stations) {
    const p = projectOnRoute(idx, station.lat, station.lng);
    if (p.offsetMeters > ON_ROUTE_METERS) continue;
    if (!routeUsesRoad(route, station.road, station.lat, station.lng)) continue;
    near.push({ station, along: p.alongMeters, offset: p.offsetMeters });
  }

  // Each road has a station per direction at the same kilometre point. Work out which
  // direction the route drives: kilometre points increasing or decreasing with distance.
  const byRoad = new Map<string, typeof near>();
  for (const n of near) {
    if (!byRoad.has(n.station.road)) byRoad.set(n.station.road, []);
    byRoad.get(n.station.road)!.push(n);
  }

  const chosen: typeof near = [];
  for (const items of byRoad.values()) {
    const kms = [...new Map(items.filter((i) => i.station.km !== null).map((i) => [i.station.km!, i])).values()].sort((a, b) => a.along - b.along);
    let dir: '+' | '-' | null = null;
    if (kms.length >= 2) {
      dir = kms[kms.length - 1].station.km! > kms[0].station.km! ? '+' : '-';
    }
    // One station per kilometre point: the matching direction, or the closest carriageway
    const perKm = new Map<string, (typeof near)[number]>();
    for (const i of items) {
      if (dir && i.station.dir && i.station.dir !== dir) continue;
      const key = String(i.station.km);
      const prev = perKm.get(key);
      if (!prev || i.offset < prev.offset) perKm.set(key, i);
    }
    chosen.push(...perKm.values());
  }

  return chosen
    .map(({ station, along }) => ({
      station,
      alongMeters: along,
      status: liveStatus(station),
      delayMinutes: liveDelayMinutes(station.speed),
    }))
    .sort((a, b) => a.alongMeters - b.alongMeters);
}

export function describeStation(s: LiveStation): string {
  const km = s.km !== null ? ` km ${String(s.km).replace('.', ',')}` : '';
  return `${s.road}${km}`;
}
