// Official DGT incidents (DATEX II v3, "SituationPublication") for the Alicante area.
// Feed: https://nap.dgt.es — Punto de Acceso Nacional de tráfico. ~5 MB of XML with
// every active incident on Spanish interurban roads, refreshed by the DGT every minute.
//
// The DGT server does not allow browser (CORS) requests, so this runs at build time:
// the GitHub Pages workflow downloads the feed every 15 minutes and publishes the
// incidents around Alicante as data/alerts.json next to the app.

export interface DgtAlert {
  id: string;
  type: 'obra' | 'accidente' | 'corte' | 'retencion' | 'evento';
  severity: 'alta' | 'media' | 'baja';
  title: string;
  street: string;
  zone: string;
  description: string;
  lat: number;
  lng: number;
  source: string;
  timestamp: string;
  updatedAt?: string;
  endsAt?: string;
  durationEstimate?: string;
  delayMin: number;
}

const DGT_FEED_URL = 'https://nap.dgt.es/datex2/v3/dgt/SituationPublication/datex2_v37.xml';
const FETCH_TIMEOUT_MS = 25000;

// Alicante metropolitan area: city, Sant Vicent, San Joan, El Campello, Mutxamel,
// the airport and the A-7 / A-31 / A-70 / N-332 accesses.
const BBOX = { minLat: 38.25, maxLat: 38.52, minLng: -0.72, maxLng: -0.33 };

const tag = (xml: string, name: string): string | undefined => {
  const m = xml.match(new RegExp(`<${name}>([^<]*)</${name}>`));
  return m ? m[1].trim() : undefined;
};

const MANAGEMENT_ES: Record<string, string> = {
  laneClosures: 'Carril cortado',
  carriagewayClosures: 'Calzada cortada',
  roadClosed: 'Carretera cortada',
  singleAlternateLineTraffic: 'Paso alternativo',
  narrowLanes: 'Carriles estrechados',
  newRoadworksLayout: 'Desvío por obras',
  lanesDeviated: 'Carriles desviados',
  intermittentShortTermClosures: 'Cortes intermitentes',
  doNotUseSpecifiedLanesOrCarriageways: 'Carriles no utilizables',
  useOfSpecifiedLanesOrCarriagewaysAllowed: 'Uso restringido de carriles',
  weightRestrictionInOperation: 'Restricción de peso',
};

const LANE_ES: Record<string, string> = {
  allLanesCompleteCarriageway: 'a todos los carriles',
  rightLane: 'al carril derecho',
  leftLane: 'al carril izquierdo',
  middleLane: 'al carril central',
  centralReservation: 'a la mediana',
  tidalFlowLane: 'al carril reversible',
};

const DIRECTION_ES: Record<string, string> = {
  northBound: 'sentido norte',
  southBound: 'sentido sur',
  eastBound: 'sentido este',
  westBound: 'sentido oeste',
  northEastBound: 'sentido noreste',
  northWestBound: 'sentido noroeste',
  southEastBound: 'sentido sureste',
  southWestBound: 'sentido suroeste',
  bothWays: 'ambos sentidos',
};

function parseSituation(situationXml: string): DgtAlert | null {
  if (!/<com:validityStatus>active</.test(situationXml)) return null;
  if (/<com:informationStatus>(test|technicalExercise)</.test(situationXml)) return null;

  const lat = parseFloat(tag(situationXml, 'loc:latitude') || '');
  const lng = parseFloat(tag(situationXml, 'loc:longitude') || '');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < BBOX.minLat || lat > BBOX.maxLat || lng < BBOX.minLng || lng > BBOX.maxLng) return null;

  const id = situationXml.match(/<sit:situation id="([^"]+)"/)?.[1] || `${lat},${lng}`;
  const recordType = situationXml.match(/<sit:situationRecord xsi:type="sit:([A-Za-z]+)"/)?.[1] || '';
  const cause = tag(situationXml, 'sit:causeType') || '';
  const management = tag(situationXml, 'sit:roadOrCarriagewayOrLaneManagementType');
  const lane = tag(situationXml, 'loc:laneUsage');
  const roadName = tag(situationXml, 'loc:roadName') || 'Vía sin nombre';
  const km = tag(situationXml, 'lse:kilometerPoint');
  const municipality = tag(situationXml, 'lse:municipality') || 'Alicante';
  const direction = tag(situationXml, 'loc:tpegDirection');
  const severityRaw = tag(situationXml, 'sit:severity') || tag(situationXml, 'sit:overallSeverity');
  const versionTime = tag(situationXml, 'sit:situationRecordVersionTime');
  const endTime = tag(situationXml, 'com:overallEndTime');
  const sourceId = tag(situationXml, 'com:sourceIdentification');

  const fullClosure = management === 'roadClosed' || management === 'carriagewayClosures' ||
    (management === 'laneClosures' && lane === 'allLanesCompleteCarriageway');

  let type: DgtAlert['type'];
  let title: string;
  if (cause === 'accident') {
    type = 'accidente';
    title = 'Accidente';
  } else if (fullClosure) {
    type = 'corte';
    title = MANAGEMENT_ES[management!] || 'Vía cortada';
  } else if (cause === 'abnormalTraffic' || recordType === 'AbnormalTraffic') {
    type = 'retencion';
    title = 'Tráfico lento / retención';
  } else if (cause === 'roadMaintenance') {
    type = 'obra';
    title = management && MANAGEMENT_ES[management] ? `Obras · ${MANAGEMENT_ES[management]}` : 'Obras en la vía';
  } else if (cause === 'vehicleObstruction') {
    type = 'evento';
    title = 'Vehículo detenido en la vía';
  } else if (cause === 'obstruction') {
    type = 'evento';
    title = 'Obstáculo en la calzada';
  } else {
    type = 'evento';
    title = 'Incidencia';
  }

  let severity: DgtAlert['severity'];
  if (type === 'accidente' || fullClosure || severityRaw === 'highest' || severityRaw === 'high') severity = 'alta';
  else if (type === 'retencion' || management === 'singleAlternateLineTraffic' || severityRaw === 'medium') severity = 'media';
  else severity = 'baja';

  const parts: string[] = [];
  if (management && MANAGEMENT_ES[management]) parts.push(MANAGEMENT_ES[management]);
  if (lane && LANE_ES[lane] && !fullClosure) parts.push(`afecta ${LANE_ES[lane]}`);
  if (direction && DIRECTION_ES[direction]) parts.push(DIRECTION_ES[direction]);
  const description = (parts.length ? parts.join(', ') : title) + `. ${roadName}${km ? ` km ${km}` : ''} (${municipality}).`;

  return {
    id: `dgt-${id}`,
    type,
    severity,
    title,
    street: `${roadName}${km ? ` · km ${km}` : ''}`,
    zone: municipality,
    description: description.charAt(0).toUpperCase() + description.slice(1),
    lat,
    lng,
    source: sourceId && sourceId !== 'DGT' ? `DGT (${sourceId})` : 'DGT',
    timestamp: '',
    updatedAt: versionTime,
    endsAt: endTime,
    // Rough extra minutes for route ranking: full closures and accidents weigh most
    delayMin: severity === 'alta' ? 6 : severity === 'media' ? 3 : 1,
  };
}

export function parseDgtFeed(xml: string): { alerts: DgtAlert[]; publishedAt: string } {
  const publishedAt = tag(xml.slice(0, 4000), 'com:publicationTime') || new Date().toISOString();
  const alerts: DgtAlert[] = [];
  const re = /<sit:situation id="[^"]*">[\s\S]*?<\/sit:situation>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    // Cheap prefilter before the regex-heavy parse
    if (!m[0].includes('Alacant/Alicante')) continue;
    const alert = parseSituation(m[0]);
    if (alert) alerts.push(alert);
  }

  const rank = { alta: 0, media: 1, baja: 2 };
  alerts.sort((a, b) => rank[a.severity] - rank[b.severity] || (Date.parse(b.updatedAt || '') || 0) - (Date.parse(a.updatedAt || '') || 0));
  return { alerts, publishedAt };
}

export async function downloadDgtAlerts(): Promise<{ alerts: DgtAlert[]; publishedAt: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(DGT_FEED_URL, { signal: controller.signal, redirect: 'follow' });
    if (!res.ok) throw new Error(`DGT respondió ${res.status}`);
    return parseDgtFeed(await res.text());
  } finally {
    clearTimeout(timer);
  }
}
