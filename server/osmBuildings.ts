// Building footprints along a route, from OpenStreetMap through the Overpass API.
// Proxied by our backend so that: Overpass gets an identifying User-Agent (it rejects
// anonymous clients), responses are cached, and phones receive a compact payload.

export interface BuildingFootprint {
  h: number; // height in meters
  p: [number, number][]; // outer ring [lat, lng], not closed
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const USER_AGENT = 'AlicanteTraficoEnVivo/1.0 (+https://github.com/jpm70/alicante-traffic-live)';
const REQUEST_TIMEOUT_MS = 30000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 60;

// Only serve the Alicante province area: this endpoint is not a general Overpass proxy
const ALLOWED = { minLat: 37.8, maxLat: 39.0, minLng: -1.2, maxLng: 0.4 };

const cache = new Map<string, { at: number; data: BuildingFootprint[] }>();

export class BuildingsRequestError extends Error {}

export function validateBuildingsRequest(body: any): { line: [number, number][]; radius: number; limit: number } {
  const line = body?.line;
  if (!Array.isArray(line) || line.length < 2 || line.length > 200) {
    throw new BuildingsRequestError('line debe tener entre 2 y 200 puntos');
  }
  const clean: [number, number][] = [];
  for (const pt of line) {
    const lat = Number(pt?.[0]);
    const lng = Number(pt?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new BuildingsRequestError('coordenadas no válidas');
    if (lat < ALLOWED.minLat || lat > ALLOWED.maxLat || lng < ALLOWED.minLng || lng > ALLOWED.maxLng) {
      throw new BuildingsRequestError('solo se sirven edificios de la provincia de Alicante');
    }
    clean.push([Math.round(lat * 1e6) / 1e6, Math.round(lng * 1e6) / 1e6]);
  }
  const radius = Math.min(200, Math.max(20, Number(body?.radius) || 100));
  const limit = Math.min(8000, Math.max(100, Number(body?.limit) || 4000));
  return { line: clean, radius, limit };
}

function estimateHeight(tags: Record<string, string> = {}): number {
  const h = parseFloat(tags.height || tags['building:height'] || '');
  if (Number.isFinite(h) && h > 0) return Math.min(200, Math.max(3, h));
  const levels = parseFloat(tags['building:levels'] || '');
  if (Number.isFinite(levels) && levels > 0) return Math.min(200, levels * 3.2 + 1);
  switch (tags.building) {
    case 'house':
    case 'detached':
    case 'semidetached_house':
    case 'terrace':
      return 7;
    case 'garage':
    case 'garages':
    case 'shed':
    case 'kiosk':
    case 'hut':
      return 3;
    case 'industrial':
    case 'warehouse':
    case 'retail':
      return 9;
    default:
      return 14; // typical 4-5 floor block in Alicante's Ensanche
  }
}

// Overpass gives each client only a couple of slots: never run more than two queries
// at once from this server, whatever the number of users.
const MAX_PARALLEL_QUERIES = 2;
let running = 0;
const waiting: (() => void)[] = [];
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL_QUERIES) await new Promise<void>((resolve) => waiting.push(resolve));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function postOverpass(endpoint: string, query: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function queryOverpass(query: string): Promise<any> {
  return withSlot(async () => {
    let lastError: unknown = null;
    for (const endpoint of OVERPASS_ENDPOINTS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await postOverpass(endpoint, query);
          // 429/504 = busy: wait a moment and retry once before trying the next server
          if ((res.status === 429 || res.status === 504) && attempt === 0) {
            await sleep(2500);
            continue;
          }
          if (!res.ok) throw new Error(`${endpoint} respondió ${res.status}`);
          return await res.json();
        } catch (err) {
          lastError = err;
          break;
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Overpass no disponible');
  });
}

function parseElements(data: any, seen: Set<number>, out: BuildingFootprint[], limit: number) {
  for (const el of data?.elements || []) {
    if (out.length >= limit) return;
    if (el.type !== 'way' || !Array.isArray(el.geometry) || el.geometry.length < 4) continue;
    if (seen.has(el.id)) continue;
    seen.add(el.id);
    const ring: [number, number][] = el.geometry.map((g: { lat: number; lon: number }) => [
      Math.round(g.lat * 1e6) / 1e6,
      Math.round(g.lon * 1e6) / 1e6,
    ]);
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) ring.pop();
    if (ring.length < 3) continue;
    out.push({ h: Math.round(estimateHeight(el.tags) * 10) / 10, p: ring });
  }
}

// Long routes are queried in stretches: small queries rarely time out on the public
// Overpass servers, and a failed stretch only leaves a gap instead of no buildings.
const POINTS_PER_CHUNK = 25;

// Identical requests in flight share one Overpass round (e.g. two tabs of the same route)
const inflight = new Map<string, Promise<BuildingFootprint[]>>();

export function getBuildingsAlongLine(line: [number, number][], radius: number, limit: number): Promise<BuildingFootprint[]> {
  const key = JSON.stringify([line, radius, limit]);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return Promise.resolve(hit.data);
  const pending = inflight.get(key);
  if (pending) return pending;
  const promise = fetchBuildings(key, line, radius, limit).finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

async function fetchBuildings(key: string, line: [number, number][], radius: number, limit: number): Promise<BuildingFootprint[]> {

  const chunks: [number, number][][] = [];
  for (let i = 0; i < line.length - 1; i += POINTS_PER_CHUNK - 1) {
    chunks.push(line.slice(i, i + POINTS_PER_CHUNK));
  }

  // Two stretches at a time: Overpass allows a couple of parallel slots per client
  const results: (any | null)[] = new Array(chunks.length).fill(null);
  let failures = 0;
  let lastError: unknown = null;
  let nextChunk = 0;
  const worker = async () => {
    while (nextChunk < chunks.length) {
      const i = nextChunk++;
      const coords = chunks[i].map(([lat, lng]) => `${lat},${lng}`).join(',');
      const query =
        `[out:json][timeout:25];` +
        `way["building"]["building"!~"^(roof|construction|ruins|no)$"]["location"!="underground"](around:${radius},${coords});` +
        `out geom qt ${limit};`;
      try {
        results[i] = await queryOverpass(query);
      } catch (err) {
        failures++;
        lastError = err;
      }
    }
  };
  await Promise.all([worker(), worker()]);
  if (failures > 0) console.warn(`Overpass: ${failures}/${chunks.length} tramos sin edificios:`, (lastError as Error)?.message);

  const buildings: BuildingFootprint[] = [];
  const seen = new Set<number>();
  for (const data of results) {
    if (data) parseElements(data, seen, buildings, limit);
  }

  if (failures === chunks.length) {
    throw lastError instanceof Error ? lastError : new Error('Overpass no disponible');
  }
  // Only cache complete answers; partial ones are retried on the next request
  if (failures === 0) {
    cache.set(key, { at: Date.now(), data: buildings });
    if (cache.size > CACHE_MAX_ENTRIES) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
  }
  return buildings;
}
