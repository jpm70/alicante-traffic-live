// Where the app reads the DGT data files from (alerts, traffic, history, radars).
//
// The files are refreshed by a light workflow (.github/workflows/data.yml) that publishes
// them in the `data` branch of the repository; the deployed app reads them from there
// (VITE_DATA_BASE, set when the site is built for GitHub Pages). A copy made at build time
// also ships with the site, under data/: it is the reserve when the branch cannot be read,
// and the only source in development, in the tests and in any other build.
//
// Whatever the source, the app looks at the date inside the file (see dataAge.ts), so an
// old reserve copy is shown as old.

export type DataFile = 'alerts' | 'traffic' | 'history' | 'radars';

const trimSlash = (url: string) => url.replace(/\/+$/, '');

export const REMOTE_DATA_BASE: string = trimSlash(String(import.meta.env.VITE_DATA_BASE || ''));
export const BUNDLED_DATA_BASE: string = `${trimSlash(import.meta.env.BASE_URL || '/')}/data`;

// URLs to try, in order. The "?t=" avoids the HTTP cache (no `cache: 'no-store'`: offline,
// Firefox fails such requests before the service worker can answer with its stored copy).
export function dataFileUrls(name: DataFile, remoteBase: string = REMOTE_DATA_BASE, bundledBase: string = BUNDLED_DATA_BASE, now: number = Date.now()): string[] {
  const bases = remoteBase ? [remoteBase, bundledBase] : [bundledBase];
  return bases.map((base) => `${trimSlash(base)}/${name}.json?t=${now}`);
}

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // No custom headers: the data branch is read cross-origin and must stay a simple request
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// First source that answers with data the caller accepts. Throws when none does.
export async function loadDataFile<T>(
  name: DataFile,
  isValid: (data: unknown) => boolean = () => true,
  options: { timeoutMs?: number; urls?: string[] } = {}
): Promise<T> {
  const urls = options.urls ?? dataFileUrls(name);
  // The reserve copy is on the same server as the app: it gets the full time, the branch
  // a shorter one so that a slow answer does not hold the screen
  const timeoutMs = options.timeoutMs ?? 15000;
  let lastError: unknown = new Error(`No hay fuente para ${name}.json`);
  for (let i = 0; i < urls.length; i++) {
    const isReserve = i === urls.length - 1;
    try {
      const data = await fetchJson(urls[i], isReserve ? timeoutMs : Math.min(timeoutMs, 8000));
      if (!isValid(data)) throw new Error(`${name}.json con formato no válido`);
      return data as T;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}
