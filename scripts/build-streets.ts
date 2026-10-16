// Street index for the address search (public/geo/streets.json).
//
// Every named street of the municipalities around Alicante, with its Spanish name, its
// official (often Valencian) name and its alternative names, one point on the street and
// its municipality. Searching it in the browser is instant and works with either language
// ("Avenida de Maisonnave" or "Avinguda de Maisonnave"); public geocoders only know one of
// them, and Nominatim does not allow search-as-you-type.
//
// Refreshed monthly by .github/workflows/buildings.yml, or by hand with `npm run streets`.
// If Overpass does not answer, the published index is left as it is.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Slightly wider than the 3D buildings: Elche's airport area, Agost, Busot...
export const STREETS_BBOX = { minLat: 38.26, maxLat: 38.5, minLng: -0.66, maxLng: -0.36 };

const ENDPOINTS = process.env.OVERPASS_ENDPOINTS?.split(',') || [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const ATTEMPTS = Number(process.env.STREETS_ATTEMPTS) || 8;
const USER_AGENT = 'AlicanteTraficoEnVivo/1.0 (+https://github.com/jpm70/alicante-traffic-live)';
const OUT_FILE = path.resolve(process.env.STREETS_OUT || path.join('public', 'geo', 'streets.json'));

// Ways that are not streets a driver can be sent to
const SKIP_HIGHWAY = /^(platform|proposed|construction|abandoned|disused|razed|elevator|bus_stop|corridor)$/;
// Weight of a way in the ranking: main roads first when two streets share a name
const HIGHWAY_WEIGHT: Record<string, number> = {
  motorway: 6, trunk: 6, primary: 5, secondary: 4, tertiary: 3, residential: 2, living_street: 2, unclassified: 2, pedestrian: 2,
};
const ALIAS_TAGS = ['name:ca', 'name:va', 'alt_name', 'alt_name:es', 'alt_name:ca', 'old_name', 'old_name:es', 'loc_name', 'short_name'];

export interface OverpassElement {
  type: 'relation' | 'way' | 'node';
  tags?: Record<string, string>;
  center?: { lat: number; lon: number };
}

// [display name (Spanish when tagged), official name if different, aliases, municipality, lat, lng, weight]
export type StreetEntry = [string, string, string[], number, number, number, number];

export interface StreetIndex {
  version: 1;
  generatedAt: string;
  attribution: string;
  municipalities: string[];
  streets: StreetEntry[];
}

// "Alacant / Alicante" → "Alicante" (the relation's Spanish name, else the part after the slash)
export function municipalityName(tags: Record<string, string> = {}): string {
  const name = tags['name:es'] || (tags.name?.includes(' / ') ? tags.name.split(' / ').pop()!.trim() : tags.name || '');
  return name.charAt(0).toUpperCase() + name.slice(1); // "el Campello" → "El Campello"
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Overpass output: each municipality relation followed by its named ways (with centers)
export function buildStreetIndex(elements: OverpassElement[], generatedAt: string): StreetIndex {
  const municipalities: string[] = [];
  type Group = { display: string; official: string; aliases: Set<string>; muni: number; points: { lat: number; lng: number }[]; weight: number };
  const groups = new Map<string, Group>();
  let muni = -1;

  for (const el of elements) {
    if (el.type === 'relation') {
      const name = municipalityName(el.tags);
      muni = municipalities.indexOf(name);
      if (muni === -1) muni = municipalities.push(name) - 1;
      continue;
    }
    const tags = el.tags || {};
    if (el.type !== 'way' || muni === -1 || !tags.name || !el.center || SKIP_HIGHWAY.test(tags.highway || '')) continue;
    const official = tags.name.trim();
    const display = (tags['name:es'] || official).trim();
    const key = `${muni}|${fold(official)}`;
    const group = groups.get(key) || { display, official, aliases: new Set<string>(), muni, points: [], weight: 0 };
    for (const tag of ALIAS_TAGS) {
      for (const alias of (tags[tag] || '').split(';')) if (alias.trim()) group.aliases.add(alias.trim());
    }
    group.points.push({ lat: el.center.lat, lng: el.center.lon });
    group.weight += HIGHWAY_WEIGHT[tags.highway] || 1;
    groups.set(key, group);
  }

  const round = (v: number) => Math.round(v * 1e5) / 1e5;
  const streets: StreetEntry[] = [...groups.values()].map((g) => {
    // A point on the street: the way center nearest to the mean of all its ways
    const mean = {
      lat: g.points.reduce((a, p) => a + p.lat, 0) / g.points.length,
      lng: g.points.reduce((a, p) => a + p.lng, 0) / g.points.length,
    };
    const point = g.points.reduce((best, p) =>
      (p.lat - mean.lat) ** 2 + (p.lng - mean.lng) ** 2 < (best.lat - mean.lat) ** 2 + (best.lng - mean.lng) ** 2 ? p : best
    );
    const seen = new Set([fold(g.display), fold(g.official)]);
    const aliases = [...g.aliases].filter((a) => !seen.has(fold(a)) && seen.add(fold(a)));
    return [g.display, fold(g.official) === fold(g.display) ? '' : g.official, aliases, g.muni, round(point.lat), round(point.lng), g.weight];
  });
  streets.sort((a, b) => a[3] - b[3] || a[0].localeCompare(b[0], 'es'));

  return {
    version: 1,
    generatedAt,
    attribution: '© colaboradores de OpenStreetMap (ODbL)',
    municipalities,
    streets,
  };
}

async function download(): Promise<OverpassElement[]> {
  const { minLat, minLng, maxLat, maxLng } = STREETS_BBOX;
  const bbox = `${minLat},${minLng},${maxLat},${maxLng}`;
  const q =
    `[out:json][timeout:300];` +
    `rel["boundary"="administrative"]["admin_level"="8"](${bbox})->.munis;` +
    `foreach.munis->.m(.m out tags;.m map_to_area->.a;way(area.a)["highway"]["name"](${bbox});out tags center qt;);`;
  let lastError: unknown;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const endpoint = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT, Accept: 'application/json' },
        body: `data=${encodeURIComponent(q)}`,
        signal: AbortSignal.timeout(330000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.elements) || data.elements.length === 0) throw new Error('respuesta vacía');
      return data.elements;
    } catch (err) {
      lastError = err;
      console.log(`Overpass (${new URL(endpoint).host}) no respondió: ${err instanceof Error ? err.message : err}; reintento ${attempt + 1}/${ATTEMPTS}`);
      await new Promise((r) => setTimeout(r, Math.min(60000, 5000 * (attempt + 1))));
    }
  }
  throw lastError;
}

async function main() {
  let elements: OverpassElement[];
  try {
    // STREETS_INPUT: an Overpass answer saved earlier (no download)
    elements = process.env.STREETS_INPUT
      ? JSON.parse(await readFile(process.env.STREETS_INPUT, 'utf8')).elements
      : await download();
  } catch {
    console.error('Overpass no respondió: el índice de calles publicado no se cambia.');
    process.exitCode = 1;
    return;
  }
  const index = buildStreetIndex(elements, new Date().toISOString());
  // A broken answer (one municipality only, say) must not replace a good index
  if (index.streets.length < 1000) {
    console.error(`Solo ${index.streets.length} calles: respuesta incompleta, no se cambia el índice.`);
    process.exitCode = 1;
    return;
  }
  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(index));
  console.log(`${index.streets.length} calles en ${index.municipalities.length} municipios → ${path.relative(process.cwd(), OUT_FILE)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
