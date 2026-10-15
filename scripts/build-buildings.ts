// Pre-generates OpenStreetMap building footprints for the Alicante metropolitan area
// as small static tiles (public/buildings/15/x/y.json + index.json).
//
// Why: the public Overpass servers are often saturated (20-60 s per query, 504s), so
// asking them from a phone while driving rarely works. Buildings change slowly, so
// they are downloaded once here and served from GitHub Pages next to the app.
// They are refreshed monthly by .github/workflows/buildings.yml, or by hand with
// `npm run buildings` (it can take more than an hour when Overpass is busy).
//
// If Overpass does not answer for part of the area, the buildings already published for
// that part are kept, so a bad day never deletes buildings from the map.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

// City, Sant Vicent, Sant Joan, Mutxamel, El Campello, the airport and the A-7/A-31/A-70 accesses
export const BUILDINGS_BBOX = { minLat: 38.28, maxLat: 38.48, minLng: -0.62, maxLng: -0.38 };
export const BUILDINGS_ZOOM = 15;

const CELL_DEG = 0.025; // query cell: small enough for a busy Overpass server
const ENDPOINTS = process.env.OVERPASS_ENDPOINTS?.split(',') || [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const ATTEMPTS = Number(process.env.BUILDINGS_ATTEMPTS) || 12;
const USER_AGENT = 'AlicanteTraficoEnVivo/1.0 (+https://github.com/jpm70/alicante-traffic-live)';
// Published tiles (read to keep the parts Overpass could not refresh) and output folder
const PUBLISHED_DIR = path.resolve('public', 'buildings');
const OUT_DIR = path.resolve(process.env.BUILDINGS_OUT || PUBLISHED_DIR);
// Each downloaded cell is kept here, so an interrupted run resumes where it stopped
const CACHE_DIR = path.resolve(process.env.BUILDINGS_CACHE || path.join('.cache', 'buildings'));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const lng2tile = (lng: number, z: number) => Math.floor(((lng + 180) / 360) * 2 ** z);
const lat2tile = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};

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

async function query(minLat: number, minLng: number, maxLat: number, maxLng: number): Promise<any> {
  const q =
    `[out:json][timeout:120];` +
    `way["building"]["building"!~"^(roof|construction|ruins|no)$"]["location"!="underground"](${minLat},${minLng},${maxLat},${maxLng});` +
    `out geom qt;`;
  let lastError: unknown;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const endpoint = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT, Accept: 'application/json' },
        body: `data=${encodeURIComponent(q)}`,
        signal: AbortSignal.timeout(180000),
      });
      if (!res.ok) throw new Error(`${endpoint} ${res.status}`);
      return await res.json();
    } catch (err) {
      lastError = err;
      await sleep(Math.min(60000, 5000 * (attempt + 1)));
    }
  }
  throw lastError;
}

// Buildings currently published, as compact records with their centroid
async function loadPublished(): Promise<{ rec: number[]; lat: number; lng: number }[]> {
  try {
    const index = JSON.parse(await readFile(path.join(PUBLISHED_DIR, 'index.json'), 'utf8'));
    const out: { rec: number[]; lat: number; lng: number }[] = [];
    for (const key of index.tiles as string[]) {
      const recs: number[][] = JSON.parse(await readFile(path.join(PUBLISHED_DIR, String(index.zoom), `${key}.json`), 'utf8'));
      for (const rec of recs) {
        let lat = rec[1];
        let lng = rec[2];
        let sLat = lat;
        let sLng = lng;
        let n = 1;
        for (let i = 3; i + 1 < rec.length; i += 2) {
          lat += rec[i];
          lng += rec[i + 1];
          sLat += lat;
          sLng += lng;
          n++;
        }
        out.push({ rec, lat: sLat / n / 1e6, lng: sLng / n / 1e6 });
      }
    }
    return out;
  } catch {
    return [];
  }
}

async function main() {
  const { minLat, maxLat, minLng, maxLng } = BUILDINGS_BBOX;
  const published = await loadPublished();
  const tiles = new Map<string, number[][]>();
  const seen = new Set<number>();
  let cells = 0;
  const failedCells: string[] = [];
  const refreshedCells: number[][] = [];
  const totalCells = Math.ceil((maxLat - minLat) / CELL_DEG) * Math.ceil((maxLng - minLng) / CELL_DEG);

  for (let lat = minLat; lat < maxLat - 1e-9; lat += CELL_DEG) {
    for (let lng = minLng; lng < maxLng - 1e-9; lng += CELL_DEG) {
      cells++;
      const box = [+lat.toFixed(4), +lng.toFixed(4), +Math.min(maxLat, lat + CELL_DEG).toFixed(4), +Math.min(maxLng, lng + CELL_DEG).toFixed(4)] as const;
      const cacheFile = path.join(CACHE_DIR, `${box.join('_')}.json`);
      let data: any = null;
      try {
        data = JSON.parse(await readFile(cacheFile, 'utf8'));
      } catch {
        try {
          data = await query(...box);
          await mkdir(CACHE_DIR, { recursive: true });
          await writeFile(cacheFile, JSON.stringify(data));
          await sleep(1500); // be gentle with the public server
        } catch (err) {
          failedCells.push(box.join(','));
          console.warn(`celda ${cells}/${totalCells}: sin respuesta de Overpass (${(err as Error).message}); se reintentará en la próxima ejecución`);
          continue;
        }
      }
      refreshedCells.push([...box]);
      let added = 0;
      for (const el of data.elements || []) {
        if (el.type !== 'way' || !Array.isArray(el.geometry) || el.geometry.length < 4 || seen.has(el.id)) continue;
        seen.add(el.id);
        const ring = el.geometry.map((g: { lat: number; lon: number }) => [Math.round(g.lat * 1e6), Math.round(g.lon * 1e6)]);
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (first[0] === last[0] && first[1] === last[1]) ring.pop();
        if (ring.length < 3) continue;
        // Tile of the first vertex; compact record: [height dm, lat0, lng0, dlat1, dlng1, ...]
        const cLat = ring.reduce((s: number, p: number[]) => s + p[0], 0) / ring.length / 1e6;
        const cLng = ring.reduce((s: number, p: number[]) => s + p[1], 0) / ring.length / 1e6;
        const key = `${lng2tile(cLng, BUILDINGS_ZOOM)}/${lat2tile(cLat, BUILDINGS_ZOOM)}`;
        const rec = [Math.round(estimateHeight(el.tags) * 10), ring[0][0], ring[0][1]];
        for (let i = 1; i < ring.length; i++) rec.push(ring[i][0] - ring[i - 1][0], ring[i][1] - ring[i - 1][1]);
        if (!tiles.has(key)) tiles.set(key, []);
        tiles.get(key)!.push(rec);
        added++;
      }
      console.log(`celda ${cells}/${totalCells}: +${added} edificios (total ${seen.size})`);
    }
  }

  // Keep the published buildings of every part Overpass could not refresh: anything not
  // downloaded again whose centre is not inside a refreshed cell (where the new data
  // rules, so demolished buildings do disappear)
  let kept = 0;
  if (failedCells.length && published.length) {
    const fresh = new Set<string>();
    for (const recs of tiles.values()) for (const r of recs) fresh.add(`${r[1]},${r[2]}`);
    for (const b of published) {
      if (fresh.has(`${b.rec[1]},${b.rec[2]}`)) continue;
      const refreshed = refreshedCells.some(([s, w, n, e]) => b.lat >= s && b.lat < n && b.lng >= w && b.lng < e);
      if (refreshed) continue;
      const key = `${lng2tile(b.lng, BUILDINGS_ZOOM)}/${lat2tile(b.lat, BUILDINGS_ZOOM)}`;
      if (!tiles.has(key)) tiles.set(key, []);
      tiles.get(key)!.push(b.rec);
      kept++;
    }
  }
  if (failedCells.length === totalCells) {
    console.error('Overpass no respondió para ninguna zona: no se cambia nada.');
    process.exitCode = 1;
    return;
  }

  await rm(OUT_DIR, { recursive: true, force: true });
  for (const [key, recs] of tiles) {
    const file = path.join(OUT_DIR, String(BUILDINGS_ZOOM), `${key}.json`);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(recs));
  }
  await writeFile(
    path.join(OUT_DIR, 'index.json'),
    JSON.stringify({
      zoom: BUILDINGS_ZOOM,
      bbox: BUILDINGS_BBOX,
      tiles: [...tiles.keys()].sort(),
      buildings: seen.size + kept,
      generatedAt: new Date().toISOString(),
      attribution: '© OpenStreetMap contributors (ODbL)',
    })
  );
  console.log(`Listo: ${seen.size + kept} edificios en ${tiles.size} teselas`);
  if (failedCells.length) {
    console.warn(`${failedCells.length} de ${totalCells} zonas sin respuesta de Overpass: se mantienen sus ${kept} edificios publicados.`);
  }
}

main().catch((err) => {
  console.error('Error generando edificios:', err);
  process.exit(1);
});
