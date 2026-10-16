// Address search for the origin and destination boxes.
//
// Streets come from our own index (public/geo/streets.json, built from OpenStreetMap by
// scripts/build-streets.ts): instant, in Spanish or Valencian, accents and street types
// optional ("maisonnave", "avda alfonso sabio", "plaza luceros"). Places (hospitals,
// shopping centres...) and house numbers come from Photon, OpenStreetMap's
// search-as-you-type geocoder (Nominatim's usage policy forbids autocomplete).
import { ALICANTE_LANDMARKS } from '../data/cameras';
import { fetchWithTimeout } from './routing';

// [display name, official name if different, aliases, municipality, lat, lng, weight]
export type StreetEntry = [string, string, string[], number, number, number, number];

export interface StreetIndex {
  version: 1;
  generatedAt: string;
  municipalities: string[];
  streets: StreetEntry[];
}

export interface PlaceSuggestion {
  id: string;
  kind: 'street' | 'place' | 'landmark';
  label: string; // what the user reads (Spanish name when there is one)
  detail: string; // municipality, official name, zone...
  lat: number;
  lng: number;
  // Streets: names Photon may know the street by, to find a house number on it
  streetNames?: string[];
  municipality?: string;
}

// Words that only say what kind of street it is, and articles: optional when searching
const STREET_TYPES = new Set([
  'calle', 'c', 'cl', 'cll', 'carrer', 'cr', 'avenida', 'avda', 'av', 'avd', 'avinguda', 'avgda', 'plaza', 'pza', 'pl', 'placa', 'plaça',
  'paseo', 'pso', 'passeig', 'pg', 'camino', 'cami', 'cm', 'ronda', 'rda', 'travesia', 'travessera', 'glorieta', 'rotonda', 'pasaje',
  'passatge', 'bulevar', 'boulevard', 'callejon', 'carrero', 'partida', 'urbanizacion', 'urbanitzacio', 'carretera', 'ctra', 'autovia',
  'senda', 'sendero', 'vereda',
]);
// Same kind of street in Spanish and Valencian, and its abbreviations
const STREET_KIND: Record<string, string> = {
  calle: 'calle', c: 'calle', cl: 'calle', cll: 'calle', carrer: 'calle', cr: 'calle',
  avenida: 'avenida', avda: 'avenida', av: 'avenida', avd: 'avenida', avinguda: 'avenida', avgda: 'avenida',
  plaza: 'plaza', pza: 'plaza', pl: 'plaza', placa: 'plaza',
  paseo: 'paseo', pso: 'paseo', passeig: 'paseo', pg: 'paseo',
  camino: 'camino', cami: 'camino', cm: 'camino', carretera: 'carretera', ctra: 'carretera',
};
const kindOf = (s: string) => STREET_KIND[normalize(s).split(' ')[0]] || null;

const STOPWORDS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'els', 'les', 'lo', 'd', 'l', 'y', 'i', 'a', 'en', 'al']);

export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim();

// Significant words of a name or query; falls back to all words when only types/articles
export function keyTokens(s: string): string[] {
  const all = normalize(s).split(' ').filter(Boolean);
  const key = all.filter((t) => !STREET_TYPES.has(t) && !STOPWORDS.has(t));
  return key.length ? key : all;
}

// "maisonnave 10" → words ["maisonnave"], house number "10". A number alone, or one in
// the middle ("2 de mayo"), is part of the name.
export function parseQuery(q: string): { tokens: string[]; number: string | null } {
  const tokens = keyTokens(q);
  const last = tokens[tokens.length - 1];
  if (tokens.length > 1 && /^\d+[a-z]?$/.test(last || '')) return { tokens: tokens.slice(0, -1), number: last };
  return { tokens, number: null };
}

// How well the query words match a name: every query word must start a word of the name
function matchScore(query: string[], name: string[]): number {
  if (!query.length) return 0;
  let score = 100;
  for (let i = 0; i < query.length; i++) {
    const q = query[i];
    const exact = name.indexOf(q);
    if (exact !== -1) score += 12;
    else if (name.some((w) => w.startsWith(q))) score += 4;
    else return 0;
  }
  if (name[0]?.startsWith(query[0])) score += 20;
  // The whole name typed: "san vicente" is Calle San Vicente before Carretera de San Vicente del Raspeig
  if (name.length === query.length && query.every((q, i) => name[i] === q)) score += 25;
  return score - Math.max(0, name.length - query.length) * 3;
}

interface PreparedStreet {
  entry: StreetEntry;
  names: string[][]; // key tokens of the display name, the official name and the aliases
  primary: number; // how many of them are the street's own names (the rest are aliases)
}

const prepared = new WeakMap<StreetIndex, PreparedStreet[]>();

function prepare(index: StreetIndex): PreparedStreet[] {
  let list = prepared.get(index);
  if (!list) {
    list = index.streets.map((entry) => {
      const own = [entry[0], entry[1]].filter(Boolean);
      return { entry, names: [...own, ...entry[2]].map(keyTokens), primary: own.length };
    });
    prepared.set(index, list);
  }
  return list;
}

export function searchStreets(index: StreetIndex, query: string, limit = 8): PlaceSuggestion[] {
  const { tokens } = parseQuery(query);
  if (!tokens.length || tokens.join('').length < 2) return [];
  const kind = kindOf(query); // "calle mayor": Calle Mayor before Paseo Mayor
  const scored: { s: PreparedStreet; score: number }[] = [];
  for (const s of prepare(index)) {
    // An alias ("Gran Vía" names fifteen streets of the ring road) counts a bit less
    const best = Math.max(...s.names.map((n, i) => Math.max(0, matchScore(tokens, n) - (i >= s.primary ? 25 : 0))));
    if (best > 0) {
      const sameKind = kind && (kindOf(s.entry[0]) === kind || kindOf(s.entry[1]) === kind) ? 15 : 0;
      scored.push({ s, score: best + sameKind + Math.log2(1 + s.entry[6]) * 4 + (s.entry[3] === 0 ? 4 : 0) });
    }
  }
  scored.sort((a, b) => b.score - a.score || a.s.entry[0].localeCompare(b.s.entry[0], 'es'));
  return scored.slice(0, limit).map(({ s }) => {
    const [display, official, aliases, muni, lat, lng] = s.entry;
    const municipality = index.municipalities[muni] || '';
    return {
      id: `street:${muni}:${display}`,
      kind: 'street' as const,
      label: display,
      detail: official ? `${municipality} · ${official}` : municipality,
      lat,
      lng,
      streetNames: [display, official, ...aliases].filter(Boolean),
      municipality,
    };
  });
}

export function searchLandmarks(query: string, limit = 5): PlaceSuggestion[] {
  const tokens = keyTokens(query);
  return ALICANTE_LANDMARKS.map((l) => ({ l, score: matchScore(tokens, keyTokens(`${l.name} ${l.zone}`)) }))
    .filter((x) => !tokens.length || x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, tokens.length ? limit : ALICANTE_LANDMARKS.length)
    .map(({ l }) => ({ id: `landmark:${l.name}`, kind: 'landmark' as const, label: l.name, detail: l.zone, lat: l.lat, lng: l.lng }));
}

let indexPromise: Promise<StreetIndex | null> | null = null;

export function loadStreetIndex(): Promise<StreetIndex | null> {
  indexPromise ||= fetchWithTimeout(`${import.meta.env.BASE_URL}geo/streets.json`, 20000)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => (data?.version === 1 ? (data as StreetIndex) : null))
    .catch(() => null)
    .then((index) => {
      if (!index) indexPromise = null; // try again on the next search
      return index;
    });
  return indexPromise;
}

// --- Photon (https://photon.komoot.io): places and house numbers -------------------

const PHOTON_URL = 'https://photon.komoot.io/api/';
// Search area: the Alicante metropolitan area; results are biased towards a point
// (Luceros, or the street whose house number is wanted)
const PHOTON_BBOX = '-0.75,38.20,-0.30,38.55';
const LUCEROS = { lat: 38.3452, lng: -0.481 };

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: Record<string, string | undefined>;
}

async function photon(q: string, limit: number, near: { lat: number; lng: number }, signal?: AbortSignal): Promise<PhotonFeature[]> {
  const params = `q=${encodeURIComponent(q)}&limit=${limit}&bbox=${PHOTON_BBOX}&lat=${near.lat}&lon=${near.lng}`;
  const res = await fetchWithTimeout(`${PHOTON_URL}?${params}`, 6000, { signal });
  if (!res.ok) throw new Error(`Photon HTTP ${res.status}`);
  return (await res.json()).features || [];
}

// Photon answer → place suggestions. Streets are left out (our index has them in both
// languages) and so are bus/tram stops, which flood every search.
export function photonPlaces(features: PhotonFeature[], limit = 5): PlaceSuggestion[] {
  const out: PlaceSuggestion[] = [];
  const seen = new Set<string>();
  for (const f of features) {
    const p = f.properties;
    if (!p.name || p.osm_key === 'highway' || p.osm_key === 'public_transport' || /^(bus_stop|tram_stop|platform|stop_position)$/.test(p.osm_value || '')) continue;
    const town = p.city || p.town || p.village || '';
    const municipality = town.includes(' / ') ? town.split(' / ').pop()!.trim() : town;
    const key = normalize(`${p.name} ${municipality}`);
    if (seen.has(key)) continue;
    seen.add(key);
    const [lng, lat] = f.geometry.coordinates;
    const where = [p.street && `${p.street}${p.housenumber ? ` ${p.housenumber}` : ''}`, municipality].filter(Boolean).join(', ');
    out.push({ id: `place:${p.osm_type}${p.osm_id}`, kind: 'place', label: p.name, detail: where, lat, lng, municipality });
    if (out.length >= limit) break;
  }
  return out;
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  return photonPlaces(await photon(query, 15, LUCEROS, signal));
}

// Point of a house number on a street chosen from our index. Photon knows the street by
// its official (Valencian) name, so all its names are tried. Null when it is not mapped.
export async function findHouseNumber(street: PlaceSuggestion, number: string, signal?: AbortSignal): Promise<{ lat: number; lng: number } | null> {
  const names = street.streetNames || [street.label];
  const wanted = new Set(names.map((n) => keyTokens(n).join(' ')));
  for (const name of names.slice(0, 3)) {
    const features = await photon(`${name} ${number}`, 10, street, signal).catch((): PhotonFeature[] => []);
    const hit = features.find((f) => {
      const p = f.properties;
      if (normalize(p.housenumber || '') !== normalize(number) || !p.street) return false;
      const [lng, lat] = f.geometry.coordinates;
      // Same street name and near the street (several towns share street names)
      return wanted.has(keyTokens(p.street).join(' ')) && Math.abs(lat - street.lat) < 0.03 && Math.abs(lng - street.lng) < 0.03;
    });
    if (hit) return { lat: hit.geometry.coordinates[1], lng: hit.geometry.coordinates[0] };
  }
  return null;
}
