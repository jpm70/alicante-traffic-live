// Updates the position of the municipal traffic cameras (src/data/cameras.ts) from the
// City Council's own mobility map.
//
// https://movilidad.alicante.es/asmpois is the public data file behind that map. Its
// "agrfis" entries are the junctions with cameras ("C01 Plaza de la Estrella"...): each one
// has the exact position of the junction and the list of its cameras. A camera has no
// position of its own: the cameras of a junction share the junction's point and look down
// different streets, so that is the position written here.
//
// Run by hand (`npm run cameras`) when the Council adds or moves cameras. It only rewrites
// "lat" and "lng"; names, zones and image URLs are left as they are. Cameras the Council
// publishes that are not in the app yet are listed, not added.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SOURCE_URL = 'https://movilidad.alicante.es/asmpois';
const CAMERAS_FILE = path.resolve('src', 'data', 'cameras.ts');

interface Poi {
  title: string;
  content_type: string;
  lat?: number;
  lon?: number;
  images?: { original?: string; title?: string }[];
}

export interface Junction {
  code: string; // "C01"
  title: string; // "C01 Plaza de la Estrella"
  lat: number;
  lng: number;
  cameras: { id: string; title: string }[];
}

const CAMERA_ID = /\/camara\/(C\d{2}[A-Z]\d+)\.jpg/i;

export function parseJunctions(pois: Poi[]): Junction[] {
  const junctions: Junction[] = [];
  for (const poi of pois) {
    if (poi.content_type !== 'agrfis') continue;
    if (!Number.isFinite(poi.lat) || !Number.isFinite(poi.lon)) continue;
    const cameras: Junction['cameras'] = [];
    for (const image of poi.images || []) {
      const id = image.original?.match(CAMERA_ID)?.[1];
      if (id) cameras.push({ id: id.toUpperCase(), title: (image.title || '').trim() });
    }
    if (cameras.length === 0) continue;
    junctions.push({
      code: poi.title.match(/^C\d{2}/)?.[0] || cameras[0].id.slice(0, 3),
      title: poi.title.trim(),
      lat: poi.lat!,
      lng: poi.lon!,
      cameras,
    });
  }
  return junctions;
}

// Position of every camera id: its junction's point. A camera the Council no longer lists
// keeps working if its junction code ("C25" of "C25M4") is still published.
export function positionFor(id: string, junctions: Junction[]): { lat: number; lng: number; junction: string; inferred: boolean } | null {
  const own = junctions.find((j) => j.cameras.some((c) => c.id === id));
  if (own) return { lat: own.lat, lng: own.lng, junction: own.title, inferred: false };
  const byCode = junctions.find((j) => j.code === id.slice(0, 3));
  if (byCode) return { lat: byCode.lat, lng: byCode.lng, junction: byCode.title, inferred: true };
  return null;
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

function metersBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = Math.PI / 180;
  const x = (bLng - aLng) * rad * Math.cos(((aLat + bLat) / 2) * rad);
  const y = (bLat - aLat) * rad;
  return Math.sqrt(x * x + y * y) * 6371000;
}

// Rewrites the "lat"/"lng" of each camera block. Pure, so it can be tested.
export function applyPositions(source: string, junctions: Junction[]) {
  const moved: { id: string; meters: number; junction: string; inferred: boolean }[] = [];
  const missing: string[] = [];
  const known = new Set<string>();
  const block = /("id": "([^"]+)",[\s\S]*?"lat": )(-?[\d.]+)(,\s*"lng": )(-?[\d.]+)/g;
  const output = source.replace(block, (whole, head: string, id: string, lat: string, mid: string, lng: string) => {
    known.add(id);
    const position = positionFor(id, junctions);
    if (!position) {
      missing.push(id);
      return whole;
    }
    moved.push({ id, meters: Math.round(metersBetween(Number(lat), Number(lng), position.lat, position.lng)), junction: position.junction, inferred: position.inferred });
    return `${head}${round6(position.lat)}${mid}${round6(position.lng)}`;
  });
  const published = junctions.flatMap((j) => j.cameras.map((c) => ({ ...c, junction: j.title })));
  const notInApp = published.filter((c) => !known.has(c.id));
  return { output, moved, missing, notInApp };
}

async function main() {
  const res = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(60000), headers: { 'User-Agent': 'AlicanteTraficoEnVivo/1.0' } });
  if (!res.ok) throw new Error(`movilidad.alicante.es respondió ${res.status}`);
  const junctions = parseJunctions(await res.json());
  if (junctions.length < 20) throw new Error(`Solo ${junctions.length} cruces con cámaras: el formato ha cambiado, no se toca nada`);

  const source = await readFile(CAMERAS_FILE, 'utf8');
  const { output, moved, missing, notInApp } = applyPositions(source, junctions);
  if (moved.length === 0) throw new Error('No se reconoció ninguna cámara en src/data/cameras.ts');
  await writeFile(CAMERAS_FILE, output);

  const meters = moved.map((m) => m.meters).sort((a, b) => a - b);
  console.log(`Cruces con cámaras publicados: ${junctions.length}`);
  console.log(`Cámaras recolocadas: ${moved.length} (desplazamiento mediano ${meters[Math.floor(meters.length / 2)]} m, máximo ${meters[meters.length - 1]} m)`);
  const inferred = moved.filter((m) => m.inferred);
  if (inferred.length) console.log(`Colocadas por el código de su cruce (el Ayuntamiento ya no las lista): ${inferred.map((m) => `${m.id} → ${m.junction}`).join('; ')}`);
  if (missing.length) console.log(`Sin cruce publicado, se dejan como estaban: ${missing.join(', ')}`);
  if (notInApp.length) console.log(`Publicadas por el Ayuntamiento y aún no incluidas en la app (${notInApp.length}): ${notInApp.map((c) => `${c.id} (${c.title || c.junction})`).join('; ')}`);
}

// Only when run as a script (the tests import the functions above)
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts', 'update-camera-positions.ts')) {
  main().catch((err) => {
    console.error((err as Error).message);
    process.exitCode = 1;
  });
}
