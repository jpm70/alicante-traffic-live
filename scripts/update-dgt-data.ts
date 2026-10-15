// Downloads the official DGT data the app needs and writes it next to the site:
//   public/data/alerts.json  incidents around Alicante (DATEX II SituationPublication)
//   public/data/radars.json  speed-camera inventory of the province (fixed cabins and sections)
//   public/data/traffic.json measured speed/flow of the DGT road detectors of the province
//   public/data/history.json typical measured speed per 15-minute slot (see trafficHistory.ts)
// The DGT servers do not allow browser (CORS) requests, so this runs in the GitHub Pages
// workflow every 15 minutes and in `npm run dev`. It never fails the build: if the DGT is
// unreachable it keeps the previous file, or writes an empty one flagged with the error.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { downloadDgtAlerts } from './dgtIncidents';
import { downloadDgtRadars } from './dgtRadars';
import { downloadDgtDetectors, aggregateStations, LiveDetector } from './dgtDetectors';
import { TrafficHistory, emptyHistory, updateHistory } from './trafficHistory';

const DATA_DIR = path.resolve('public', 'data');

async function keepPreviousOr(file: string, fallback: object, reason: string) {
  console.warn(`${path.basename(file)}: ${reason}`);
  try {
    const previous = JSON.parse(await readFile(file, 'utf8'));
    if (previous?.success) {
      console.warn(`Se mantiene el último ${path.basename(file)} válido.`);
      return;
    }
  } catch {
    // no previous file
  }
  await writeFile(file, JSON.stringify(fallback));
}

async function updateAlerts() {
  const file = path.join(DATA_DIR, 'alerts.json');
  const source = 'DGT · Punto de Acceso Nacional (DATEX II)';
  try {
    const { alerts, publishedAt } = await downloadDgtAlerts();
    await writeFile(file, JSON.stringify({ success: true, source, updatedAt: publishedAt, generatedAt: new Date().toISOString(), alerts }));
    console.log(`DGT incidencias: ${alerts.length} en el área de Alicante (${publishedAt})`);
  } catch (err) {
    const now = new Date().toISOString();
    await keepPreviousOr(
      file,
      { success: false, source, updatedAt: now, generatedAt: now, alerts: [], error: 'No se pudo consultar el servicio de incidencias de la DGT' },
      (err as Error).message
    );
  }
}

async function updateRadars() {
  const file = path.join(DATA_DIR, 'radars.json');
  const source = 'DGT · Inventario de radares (NAP)';
  try {
    const { radars, publishedAt } = await downloadDgtRadars();
    await writeFile(file, JSON.stringify({ success: true, source, updatedAt: publishedAt, generatedAt: new Date().toISOString(), radars }));
    console.log(`DGT radares: ${radars.length} en la provincia de Alicante (inventario ${publishedAt})`);
  } catch (err) {
    const now = new Date().toISOString();
    await keepPreviousOr(file, { success: false, source, updatedAt: now, generatedAt: now, radars: [] }, (err as Error).message);
  }
}

async function updateTraffic(): Promise<{ stations: LiveDetector[]; publishedAt: string | null } | null> {
  const file = path.join(DATA_DIR, 'traffic.json');
  const source = 'DGT · Detectores de tráfico (NAP)';
  try {
    const { detectors, publishedAt } = await downloadDgtDetectors();
    const stations = aggregateStations(detectors);
    await writeFile(file, JSON.stringify({ success: true, source, updatedAt: publishedAt, generatedAt: new Date().toISOString(), stations }));
    console.log(`DGT detectores: ${stations.length} puntos de medida (${stations.filter((s) => s.speed !== null).length} con velocidad) (${publishedAt})`);
    return { stations, publishedAt };
  } catch (err) {
    const now = new Date().toISOString();
    // Stale speeds are misleading: on failure publish an empty set instead of keeping old data
    console.warn(`traffic.json: ${(err as Error).message}`);
    await writeFile(file, JSON.stringify({ success: false, source, updatedAt: now, generatedAt: now, stations: [] }));
    return null;
  }
}

// Previous history: the local file (development) or the copy published with the site
// (HISTORY_URL, set by the GitHub Pages workflow). A missing file starts a new history;
// any other problem stops the run so that the published history is never replaced by
// an empty one.
async function loadPreviousHistory(file: string): Promise<TrafficHistory | null> {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    // no local copy
  }
  const url = process.env.HISTORY_URL;
  if (!url) return null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${url}?t=${Date.now()}`, { signal: AbortSignal.timeout(30000) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.version !== 1 || typeof data.stations !== 'object') throw new Error('formato no válido');
      return data;
    } catch (err) {
      if (attempt === 3) throw new Error(`No se pudo leer el histórico publicado (${(err as Error).message})`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  return null;
}

async function updateTrafficHistory(latest: { stations: LiveDetector[]; publishedAt: string | null } | null) {
  const file = path.join(DATA_DIR, 'history.json');
  const now = new Date().toISOString();
  const previous = (await loadPreviousHistory(file)) || emptyHistory(now);
  const next = latest ? updateHistory(previous, latest.stations, latest.publishedAt, now) : previous;
  await writeFile(file, JSON.stringify(next));
  console.log(`Histórico: ${Object.keys(next.stations).length} puntos, ${next.samples} muestras desde ${next.since}`);
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  const [, , traffic] = await Promise.all([updateAlerts(), updateRadars(), updateTraffic()]);
  await updateTrafficHistory(traffic);
}

main().catch((err) => {
  console.error((err as Error).message);
  process.exitCode = 1;
});
