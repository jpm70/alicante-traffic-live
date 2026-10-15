// Downloads the official DGT incidents and writes public/data/alerts.json.
// Run by the GitHub Pages workflow every 15 minutes and by `npm run dev` locally.
// It never fails the build: if the DGT is unreachable it keeps the previous file
// (or writes an empty list flagged with the error) so the site still deploys.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { downloadDgtAlerts } from './dgtIncidents';

const OUTPUT = path.resolve('public', 'data', 'alerts.json');
const SOURCE = 'DGT · Punto de Acceso Nacional (DATEX II)';

async function main() {
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  try {
    const { alerts, publishedAt } = await downloadDgtAlerts();
    const payload = { success: true, source: SOURCE, updatedAt: publishedAt, generatedAt: new Date().toISOString(), alerts };
    await writeFile(OUTPUT, JSON.stringify(payload));
    console.log(`DGT: ${alerts.length} incidencias en el área de Alicante (${publishedAt})`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`DGT no disponible: ${message}`);
    let previous: any = null;
    try {
      previous = JSON.parse(await readFile(OUTPUT, 'utf8'));
    } catch {
      // no previous file
    }
    if (previous?.success) {
      console.warn('Se mantiene el último alerts.json válido.');
      return;
    }
    const payload = {
      success: false,
      source: SOURCE,
      updatedAt: new Date().toISOString(),
      generatedAt: new Date().toISOString(),
      alerts: [],
      error: 'No se pudo consultar el servicio de incidencias de la DGT',
    };
    await writeFile(OUTPUT, JSON.stringify(payload));
  }
}

main();
