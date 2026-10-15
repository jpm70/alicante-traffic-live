// Real-time traffic measured by the DGT road detectors (DATEX II v1):
//  - inventory:    PredefinedLocationsPublication/detectores (position, road, km, direction)
//  - measurements: MeasuredDataPublication/detectores (speed km/h, flow veh/h, occupancy %),
//                  refreshed by the DGT every few minutes.
// Coverage around Alicante: the A-70 ring road and the A-31; city streets are not included
// (they belong to the city council, which does not publish this data).
import { decodeFeed } from './dgtRadars';

export interface LiveDetector {
  id: string;
  road: string;
  km: number | null;
  // Carriageway: '+' measures traffic with increasing kilometre points, '-' decreasing
  dir: '+' | '-' | null;
  lat: number;
  lng: number;
  speed: number | null; // km/h, null when the detector reports no vehicles
  flow: number | null; // vehicles per hour
  occupancy: number | null; // % of time the detector is occupied
  time: string | null; // measurement time (ISO)
}

export const DGT_DETECTORS_INVENTORY_URL = 'https://nap.dgt.es/datex2/dgt/PredefinedLocationsPublication/detectores/content.xml';
export const DGT_DETECTORS_DATA_URL = 'https://nap.dgt.es/datex2/dgt/MeasuredDataPublication/detectores/content.xml';

const MAX_PLAUSIBLE_KMH = 160;

// INE province codes kept by the app (03 = Alicante)
const PROVINCES = new Set(['3', '03']);

const tag = (xml: string, name: string): string | undefined => {
  const m = xml.match(new RegExp(`<_0:${name}>([^<]*)</_0:${name}>`));
  return m ? m[1].trim() : undefined;
};

const num = (v?: string): number | null => {
  const n = parseFloat(v || '');
  return Number.isFinite(n) ? n : null;
};

type InventoryEntry = Omit<LiveDetector, 'speed' | 'flow' | 'occupancy' | 'time'>;

export function parseDetectorInventory(xml: string): Map<string, InventoryEntry> {
  const result = new Map<string, InventoryEntry>();
  const starts = [...xml.matchAll(/<_0:predefinedLocation id="GUID_(DET_[^"]+)">/g)];
  starts.forEach((m, i) => {
    const block = xml.slice(m.index!, i + 1 < starts.length ? starts[i + 1].index : undefined);
    const province = tag(block, 'provinceINEIdentifier');
    if (!province || !PROVINCES.has(province)) return;
    const lat = num(tag(block, 'latitude'));
    const lng = num(tag(block, 'longitude'));
    if (lat === null || lng === null) return;
    const rel = tag(block, 'directionRelative');
    const meters = num(tag(block, 'referencePointDistance'));
    result.set(m[1], {
      id: m[1],
      road: tag(block, 'roadNumber') || '',
      km: meters === null ? null : Math.round(meters / 100) / 10,
      dir: rel === 'positive' ? '+' : rel === 'negative' ? '-' : null,
      lat,
      lng,
    });
  });
  return result;
}

export function parseDetectorMeasurements(
  xml: string,
  inventory: Map<string, InventoryEntry>
): { detectors: LiveDetector[]; publishedAt: string | null } {
  const publishedAt = tag(xml.slice(0, 3000), 'publicationTime') || null;
  const detectors: LiveDetector[] = [];
  const re = /<_0:siteMeasurements>[\s\S]*?<\/_0:siteMeasurements>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const block = m[0];
    const id = block.match(/<_0:measurementSiteReference>GUID_(DET_[^<]+)</)?.[1];
    if (!id) continue;
    const site = inventory.get(id);
    if (!site) continue; // outside the province
    const flow = num(tag(block, 'vehicleFlow'));
    let speed = num(tag(block, 'averageVehicleSpeed'));
    // 0 km/h with no vehicles is "no data", not a traffic jam; values above 160 km/h are
    // detector glitches (a few appear in every publication) and are discarded too
    if (speed !== null && (speed <= 0 || speed > MAX_PLAUSIBLE_KMH)) speed = null;
    detectors.push({
      ...site,
      speed,
      flow,
      occupancy: num(tag(block, 'occupancy')),
      time: tag(block, 'measurementTimeDefault') || null,
    });
  }
  return { detectors, publishedAt };
}

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: 'follow' });
  if (!res.ok) throw new Error(`DGT respondió ${res.status}`);
  return decodeFeed(await res.arrayBuffer());
}

export async function downloadDgtDetectors(timeoutMs = 90000): Promise<{ detectors: LiveDetector[]; publishedAt: string | null }> {
  const [inventoryXml, dataXml] = await Promise.all([
    fetchText(DGT_DETECTORS_INVENTORY_URL, timeoutMs),
    fetchText(DGT_DETECTORS_DATA_URL, timeoutMs),
  ]);
  return parseDetectorMeasurements(dataXml, parseDetectorInventory(inventoryXml));
}

// One station per road, kilometre point and direction: the DGT reports each lane as a
// separate detector. Speed is the flow-weighted mean of the lanes that report one.
export function aggregateStations(detectors: LiveDetector[]): LiveDetector[] {
  const groups = new Map<string, LiveDetector[]>();
  for (const d of detectors) {
    const key = `${d.road}|${d.km}|${d.dir}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  }
  const stations: LiveDetector[] = [];
  for (const lanes of groups.values()) {
    const withSpeed = lanes.filter((l) => l.speed !== null);
    const weight = (l: LiveDetector) => Math.max(l.flow ?? 0, 1);
    const totalWeight = withSpeed.reduce((s, l) => s + weight(l), 0);
    const speed = withSpeed.length ? Math.round(withSpeed.reduce((s, l) => s + l.speed! * weight(l), 0) / totalWeight) : null;
    const flows = lanes.filter((l) => l.flow !== null);
    const occ = lanes.filter((l) => l.occupancy !== null);
    stations.push({
      ...lanes[0],
      id: lanes.map((l) => l.id).sort()[0],
      speed,
      flow: flows.length ? flows.reduce((s, l) => s + l.flow!, 0) : null,
      occupancy: occ.length ? Math.round((occ.reduce((s, l) => s + l.occupancy!, 0) / occ.length) * 10) / 10 : null,
      time: lanes.map((l) => l.time).filter(Boolean).sort().pop() || null,
    });
  }
  return stations.sort((a, b) => a.road.localeCompare(b.road) || (a.km ?? 0) - (b.km ?? 0));
}
