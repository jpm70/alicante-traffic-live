// Typical measured speeds (data/history.json, built by scripts/trafficHistory.ts) and their
// comparison with the current measurement for the motorway stretches of a route.
import type { RouteLiveStation } from './liveTraffic';
import { fetchWithTimeout } from './routing';

export interface StationProfile {
  road: string;
  km: number | null;
  dir: '+' | '-' | null;
  weekday: (number | null)[];
  weekdayN: number[];
  weekend: (number | null)[];
  weekendN: number[];
}

export interface TrafficHistory {
  version: 1;
  since: string;
  updatedAt: string;
  samples: number;
  stations: Record<string, StationProfile>;
}

export type DayType = 'weekday' | 'weekend';

export const HISTORY_URL = `${import.meta.env.BASE_URL}data/history.json`;

export async function loadTrafficHistory(): Promise<TrafficHistory | null> {
  try {
    const res = await fetchWithTimeout(`${HISTORY_URL}?t=${Date.now()}`, 15000, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.version === 1 ? data : null;
  } catch {
    return null;
  }
}

const key = (s: { road: string; km: number | null; dir: '+' | '-' | null }) => `${s.road}|${s.km}|${s.dir}`;

export function dayTypeOf(date: Date): DayType {
  const d = date.getDay();
  return d === 0 || d === 6 ? 'weekend' : 'weekday';
}

export interface HourPoint {
  hour: number;
  typical: number | null; // typical speed on the route's measured stretches (km/h)
  samples: number;
}

export interface RouteHistory {
  hours: HourPoint[];
  roads: string[];
  stations: number;
  // Current measured speed (mean of the route's stations) and the typical one now
  current: number | null;
  typicalNow: number | null;
  since: string;
}

// Hourly typical speed for the stations of a route: mean of the stations, each one the
// sample-weighted mean of its four 15-minute slots in that hour.
export function routeHistory(liveStations: RouteLiveStation[] | undefined, history: TrafficHistory | null, dayType: DayType, now = new Date()): RouteHistory | null {
  if (!history || !liveStations || liveStations.length === 0) return null;
  const profiles = liveStations.map((s) => history.stations[key(s.station)]).filter(Boolean) as StationProfile[];
  if (profiles.length === 0) return null;

  const hours: HourPoint[] = [];
  for (let h = 0; h < 24; h++) {
    const perStation: number[] = [];
    let samples = 0;
    for (const p of profiles) {
      const values = dayType === 'weekday' ? p.weekday : p.weekend;
      const counts = dayType === 'weekday' ? p.weekdayN : p.weekendN;
      let sum = 0;
      let n = 0;
      for (let q = 0; q < 4; q++) {
        const v = values[h * 4 + q];
        const c = counts[h * 4 + q];
        if (v !== null && c > 0) {
          sum += v * c;
          n += c;
        }
      }
      if (n > 0) {
        perStation.push(sum / n);
        samples += n;
      }
    }
    hours.push({
      hour: h,
      typical: perStation.length ? Math.round(perStation.reduce((a, b) => a + b, 0) / perStation.length) : null,
      samples,
    });
  }

  const speeds = liveStations.map((s) => s.station.speed).filter((v): v is number => v !== null);
  return {
    hours,
    roads: [...new Set(profiles.map((p) => p.road))],
    stations: profiles.length,
    current: speeds.length ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) : null,
    typicalNow: hours[now.getHours()].typical,
    since: history.since,
  };
}
