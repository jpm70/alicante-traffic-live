// Real traffic history built from the DGT detector measurements.
//
// Every run of the data workflow (every 15 min) adds the measured speed of each
// measuring point to a profile with one value per 15-minute slot of the day, separately
// for weekdays and weekends. Each value is a running mean that weighs the last ~20
// samples (≈ 4 weeks of weekdays), so it follows seasonal changes.
//
// The file is published with the site (data/history.json). The next run starts from the
// published copy, so no commits are needed; if that copy cannot be read the run fails and
// the previous deployment (with its history) stays online.

export const SLOTS = 96;
const MAX_WEIGHT = 20;

export interface StationSample {
  road: string;
  km: number | null;
  dir: '+' | '-' | null;
  lat: number;
  lng: number;
  speed: number | null;
  time: string | null; // ISO with the local (Madrid) offset, as published by the DGT
}

export interface StationProfile {
  road: string;
  km: number | null;
  dir: '+' | '-' | null;
  lat: number;
  lng: number;
  weekday: (number | null)[];
  weekdayN: number[];
  weekend: (number | null)[];
  weekendN: number[];
}

export interface TrafficHistory {
  version: 1;
  since: string; // first sample
  updatedAt: string;
  lastMeasurement: string | null; // DGT publication time of the last sample added
  samples: number; // runs added
  stations: Record<string, StationProfile>;
}

export const stationKey = (s: Pick<StationSample, 'road' | 'km' | 'dir'>) => `${s.road}|${s.km}|${s.dir}`;

// Slot and day type from the local time written in the timestamp ("2026-10-15T13:11:00+02:00")
export function slotOf(localIso: string): { slot: number; dayType: 'weekday' | 'weekend' } | null {
  const m = localIso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number) as unknown as number[];
  const weekday = new Date(Date.UTC(y, mo - 1, d)).getUTCDay(); // 0 = Sunday
  return { slot: h * 4 + Math.floor(mi / 15), dayType: weekday === 0 || weekday === 6 ? 'weekend' : 'weekday' };
}

export function emptyHistory(nowIso: string): TrafficHistory {
  return { version: 1, since: nowIso, updatedAt: nowIso, lastMeasurement: null, samples: 0, stations: {} };
}

// Adds one publication of measurements. Pure: returns a new history.
export function updateHistory(history: TrafficHistory, stations: StationSample[], publishedAt: string | null, nowIso: string): TrafficHistory {
  // The same DGT publication must not be counted twice (two runs within its validity)
  if (publishedAt && history.lastMeasurement && Date.parse(publishedAt) <= Date.parse(history.lastMeasurement)) {
    return history;
  }
  const next: TrafficHistory = JSON.parse(JSON.stringify(history));
  let added = 0;
  for (const s of stations) {
    if (s.speed === null || !s.time) continue;
    const when = slotOf(s.time);
    if (!when) continue;
    const key = stationKey(s);
    const profile = (next.stations[key] ||= {
      road: s.road,
      km: s.km,
      dir: s.dir,
      lat: s.lat,
      lng: s.lng,
      weekday: new Array(SLOTS).fill(null),
      weekdayN: new Array(SLOTS).fill(0),
      weekend: new Array(SLOTS).fill(null),
      weekendN: new Array(SLOTS).fill(0),
    });
    const values = when.dayType === 'weekday' ? profile.weekday : profile.weekend;
    const counts = when.dayType === 'weekday' ? profile.weekdayN : profile.weekendN;
    const n = Math.min(counts[when.slot] + 1, MAX_WEIGHT);
    const old = values[when.slot];
    values[when.slot] = Math.round((old === null ? s.speed : old + (s.speed - old) / n) * 10) / 10;
    counts[when.slot] = Math.min(counts[when.slot] + 1, 9999);
    added++;
  }
  if (added === 0) return history;
  next.samples += 1;
  next.updatedAt = nowIso;
  next.lastMeasurement = publishedAt;
  if (next.samples === 1) next.since = nowIso;
  return next;
}
