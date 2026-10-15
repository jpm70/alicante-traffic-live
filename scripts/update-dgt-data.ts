// Downloads the official DGT data the app needs and writes it next to the site:
//   public/data/alerts.json  incidents around Alicante (DATEX II SituationPublication)
//   public/data/radars.json  speed-camera inventory of the province (fixed cabins and sections)
// The DGT servers do not allow browser (CORS) requests, so this runs in the GitHub Pages
// workflow every 15 minutes and in `npm run dev`. It never fails the build: if the DGT is
// unreachable it keeps the previous file, or writes an empty one flagged with the error.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { downloadDgtAlerts } from './dgtIncidents';
import { downloadDgtRadars } from './dgtRadars';

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

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  await Promise.all([updateAlerts(), updateRadars()]);
}

main();
