import { afterEach, describe, expect, it, vi } from 'vitest';
import { dataFileUrls, loadDataFile } from '../../src/services/dataSource';

const REMOTE = 'https://raw.githubusercontent.com/jpm70/alicante-traffic-live/data';
const BUNDLED = '/alicante-traffic-live/data';
const urls = dataFileUrls('alerts', REMOTE, BUNDLED, 123);

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('origen de los datos de la DGT', () => {
  it('primero la rama data y después la copia publicada con la web', () => {
    expect(urls).toEqual([`${REMOTE}/alerts.json?t=123`, `${BUNDLED}/alerts.json?t=123`]);
    // Without a data branch configured (development, tests) only the bundled copy
    expect(dataFileUrls('traffic', '', '/data', 5)).toEqual(['/data/traffic.json?t=5']);
    expect(dataFileUrls('history', `${REMOTE}/`, `${BUNDLED}/`, 5)[0]).toBe(`${REMOTE}/history.json?t=5`);
  });

  it('usa la rama data cuando responde, sin pedir la copia de reserva', async () => {
    const fetchMock = vi.fn(async () => json({ alerts: [1, 2] }));
    vi.stubGlobal('fetch', fetchMock);
    const data = await loadDataFile<{ alerts: number[] }>('alerts', (d) => Array.isArray((d as { alerts?: unknown }).alerts), { urls });
    expect(data.alerts).toEqual([1, 2]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(urls[0]);
    // A simple request: no custom headers that would need a CORS preflight
    expect(Object.keys(init)).toEqual(['signal']);
  });

  it('salta a la copia de reserva si la rama falla, da un 404 o trae datos no válidos', async () => {
    for (const remote of [
      async () => { throw new TypeError('Failed to fetch'); },
      async () => json({ message: 'Not Found' }, 404),
      async () => json({ unexpected: true }),
      async () => new Response('<html>no es JSON</html>', { status: 200 }),
    ]) {
      const fetchMock = vi.fn(async (url: string) => (url === urls[0] ? remote() : json({ alerts: [9] })));
      vi.stubGlobal('fetch', fetchMock);
      const data = await loadDataFile<{ alerts: number[] }>('alerts', (d) => Array.isArray((d as { alerts?: unknown }).alerts), { urls });
      expect(data.alerts).toEqual([9]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    }
  });

  it('falla solo cuando no responde ninguna de las dos', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({}, 500)));
    await expect(loadDataFile('alerts', () => true, { urls })).rejects.toThrow('HTTP 500');
  });
});
