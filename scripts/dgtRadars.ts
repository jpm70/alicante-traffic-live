// Official DGT speed-camera inventory (DATEX II v1 "PredefinedLocationsPublication"):
// fixed radar cabins and average-speed sections. Spain except the Basque Country and
// Catalonia. The DGT updates it a few times a year.
// Note: a cabin does not always hold a radar (they are rotated between cabins), and
// mobile radars and municipal (Policía Local) radars are not in this inventory.

export interface Radar {
  id: string;
  type: 'fijo' | 'tramo';
  road: string;
  km: number | null; // kilometre point of the cabin or of the section start
  lat: number;
  lng: number;
  // Average-speed sections: end of the section
  endLat?: number;
  endLng?: number;
  endKm?: number | null;
}

export const DGT_RADARS_URL = 'https://nap.dgt.es/datex2/dgt/PredefinedLocationsPublication/radares/content.xml';

// INE province codes kept by the app (03 = Alicante)
const PROVINCES = new Set(['3', '03']);

// The file declares UTF-8 but has been served in ISO-8859-1; accept both
export function decodeFeed(bytes: ArrayBuffer | Uint8Array): string {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data);
  } catch {
    return new TextDecoder('latin1').decode(data);
  }
}

const tag = (xml: string, name: string): string | undefined => {
  const m = xml.match(new RegExp(`<_0:${name}>([^<]*)</_0:${name}>`));
  return m ? m[1].trim() : undefined;
};

const kmFrom = (meters?: string) => {
  const v = parseFloat(meters || '');
  return Number.isFinite(v) ? Math.round(v / 100) / 10 : null;
};

function coords(block: string): { lat: number; lng: number } | null {
  const lat = parseFloat(tag(block, 'latitude') || '');
  const lng = parseFloat(tag(block, 'longitude') || '');
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

export function parseRadarFeed(xml: string): { radars: Radar[]; publishedAt: string | null } {
  const publishedAt = tag(xml.slice(0, 3000), 'publicationTime') || null;
  // Each top-level entry starts with <_0:predefinedLocation id="GUID_...">
  const starts = [...xml.matchAll(/<_0:predefinedLocation id="GUID_([^"]+)">/g)];
  const radars: Radar[] = [];

  starts.forEach((m, i) => {
    const block = xml.slice(m.index!, i + 1 < starts.length ? starts[i + 1].index : undefined);
    const provinces = [...block.matchAll(/<_0:provinceINEIdentifier>(\d+)</g)].map((p) => p[1]);
    if (!provinces.some((p) => PROVINCES.has(p))) return;

    const id = m[1];
    const road = tag(block, 'roadNumber') || tag(block, 'value') || '';
    const isSection = /^CVM_/.test(id) || /xsi:type="_0:Linear"/.test(block);

    if (isSection) {
      // In DATEX "from" is the start of the section and "to" the end
      const fromBlock = block.match(/<_0:from [\s\S]*?<\/_0:from>/)?.[0] || '';
      const toBlock = block.match(/<_0:to [\s\S]*?<\/_0:to>/)?.[0] || '';
      const start = coords(fromBlock);
      const end = coords(toBlock);
      if (!start || !end) return;
      const kms = [...block.matchAll(/<_0:referencePointDistance>([^<]+)</g)].map((k) => kmFrom(k[1]));
      radars.push({ id, type: 'tramo', road, km: kms[0] ?? null, lat: start.lat, lng: start.lng, endLat: end.lat, endLng: end.lng, endKm: kms[1] ?? null });
    } else {
      const point = coords(block);
      if (!point) return;
      radars.push({ id, type: 'fijo', road, km: kmFrom(tag(block, 'referencePointDistance')), lat: point.lat, lng: point.lng });
    }
  });

  return { radars, publishedAt };
}

export async function downloadDgtRadars(timeoutMs = 60000): Promise<{ radars: Radar[]; publishedAt: string | null }> {
  const res = await fetch(DGT_RADARS_URL, { signal: AbortSignal.timeout(timeoutMs), redirect: 'follow' });
  if (!res.ok) throw new Error(`DGT respondió ${res.status}`);
  return parseRadarFeed(decodeFeed(await res.arrayBuffer()));
}
