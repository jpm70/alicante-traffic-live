import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateAlternativeRoutes, applyIncidents, CalculatedRoute } from '../../src/services/routing';
import { generateRouteManeuvers, nextManeuverIndex, currentStreetName } from '../../src/services/navigationManeuvers';
import { radarsAlongRoute, Radar } from '../../src/services/radars';
import { TrafficAlert } from '../../src/data/trafficAlerts';

const origin = { lat: 38.3453, lng: -0.4891, name: 'Plaza de los Luceros' };
const destination = { lat: 38.3471, lng: -0.48681, name: 'Destino' };

// Minimal OSRM answer: east along Avenida de Alfonso el Sabio, then left (north)
function osrmResponse() {
  const geometry = [
    [-0.4891, 38.3453],
    [-0.48681, 38.3453],
    [-0.48681, 38.3471],
  ];
  return {
    code: 'Ok',
    routes: [
      {
        distance: 400,
        duration: 90,
        geometry: { type: 'LineString', coordinates: geometry },
        legs: [
          {
            steps: [
              { distance: 200, duration: 45, name: 'Avenida de Alfonso el Sabio', maneuver: { type: 'depart', location: geometry[0] }, geometry: { coordinates: geometry.slice(0, 2) } },
              { distance: 200, duration: 45, name: 'Carrer del Teatre', maneuver: { type: 'turn', modifier: 'left', location: geometry[1] }, geometry: { coordinates: geometry.slice(1) } },
              { distance: 0, duration: 0, name: '', maneuver: { type: 'arrive', location: geometry[2] }, geometry: { coordinates: [geometry[2], geometry[2]] } },
            ],
          },
        ],
      },
    ],
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('route calculation', () => {
  it('uses OSRM without custom headers (a User-Agent header made Firefox block every request)', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => new Response(JSON.stringify(osrmResponse()), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const routes = await calculateAlternativeRoutes(origin, destination, { quick: true });
    expect(routes).toHaveLength(1);
    expect(routes[0].isApproximate).toBe(false);
    expect(routes[0].coordinates).toHaveLength(3);
    expect(routes[0].steps.map((s) => s.type)).toEqual(['depart', 'turn', 'arrive']);

    for (const [url, init] of fetchMock.mock.calls) {
      expect(String(url)).toContain('steps=true');
      expect(init?.headers).toBeUndefined();
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it('marks the route as approximate when no routing server answers', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const routes = await calculateAlternativeRoutes(origin, destination, { quick: true });
    expect(routes).toHaveLength(1);
    expect(routes[0].isApproximate).toBe(true);
    expect(routes[0].name).toBe('Trazado aproximado');
    expect(routes[0].coordinates).toHaveLength(2);
  });

  it('falls back to the second OSRM server', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('busy', { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(osrmResponse()), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const routes = await calculateAlternativeRoutes(origin, destination, { quick: true });
    expect(routes[0].isApproximate).toBe(false);
    expect(routes[0].routingProvider).toBe('FOSSGIS OSRM');
  });
});

describe('maneuvers', () => {
  it('builds Spanish instructions from OSRM steps and follows progress', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(osrmResponse()), { status: 200 })));
    const [route] = await calculateAlternativeRoutes(origin, destination, { quick: true });
    const maneuvers = generateRouteManeuvers(route, origin, destination);
    expect(maneuvers.map((m) => m.type)).toEqual(['start', 'turn-left', 'destination']);
    expect(maneuvers[1].instruction).toBe('Gira a la izquierda por Carrer del Teatre');
    expect(maneuvers[1].accumulatedDistanceMeters).toBe(200);

    // The next maneuver depends on the distance driven (it used to stay on step 1)
    expect(nextManeuverIndex(maneuvers, 0)).toBe(1);
    expect(nextManeuverIndex(maneuvers, 150)).toBe(1);
    expect(nextManeuverIndex(maneuvers, 250)).toBe(2);
    expect(currentStreetName(maneuvers, 100, '')).toBe('Avenida de Alfonso el Sabio');
    expect(currentStreetName(maneuvers, 300, '')).toBe('Carrer del Teatre');
  });
});

describe('incidents and speed cameras on the route', () => {
  const base = {
    id: 'r', name: 'r', description: '', distanceKm: 0.4, baseMinutes: 2, cameraDelayMinutes: 0, trafficDelayMinutes: 0,
    totalMinutes: 2, status: 'fluido', isFastest: false, timeSavingsMinutes: 0, cameras: [], color: '#fff', steps: [],
    isApproximate: false, incidents: [], incidentDelayMinutes: 0,
    coordinates: [[38.3453, -0.4891], [38.3453, -0.48681], [38.3471, -0.48681]],
  } as unknown as CalculatedRoute;

  it('adds official incidents on the route and recomputes the fastest', () => {
    const alt = { ...base, id: 'alt', baseMinutes: 4, totalMinutes: 4, coordinates: [[38.35, -0.49], [38.36, -0.49]] } as CalculatedRoute;
    const incident = { id: 'x', lat: 38.3453, lng: -0.4880, delayMin: 6, severity: 'alta' } as TrafficAlert;
    const [r1, r2] = applyIncidents([base, alt], [incident]);
    expect(r1.incidents).toHaveLength(1);
    expect(r1.totalMinutes).toBe(8);
    expect(r1.status).toBe('concurrido');
    expect(r2.isFastest).toBe(true);
  });

  it('places speed cameras along the route', () => {
    const radars: Radar[] = [
      { id: 'on', type: 'fijo', road: 'X', km: 1, lat: 38.34535, lng: -0.4880 },
      { id: 'off', type: 'fijo', road: 'Y', km: 2, lat: 38.3500, lng: -0.4800 },
    ];
    const found = radarsAlongRoute(base, radars);
    expect(found.map((r) => r.radar.id)).toEqual(['on']);
    expect(found[0].alongMeters).toBeGreaterThan(90);
    expect(found[0].alongMeters).toBeLessThan(110);
    expect(radarsAlongRoute({ ...base, isApproximate: true }, radars)).toEqual([]);
  });

  it('ignores cameras on a different road than the one the route uses', () => {
    const geometry = base.coordinates;
    const radar: Radar = { id: 'a70', type: 'fijo', road: 'A-70', km: 8.4, lat: 38.34535, lng: -0.4880 };
    const step = (name: string, ref?: string) => [{ type: 'depart', name, ref, distance: 400, duration: 60, location: geometry[0], geometry }];
    expect(radarsAlongRoute({ ...base, steps: step('Autovía A-70', 'A-70') } as CalculatedRoute, [radar])).toHaveLength(1);
    expect(radarsAlongRoute({ ...base, steps: step('Calle Mayor') } as CalculatedRoute, [radar])).toHaveLength(0);
  });
});
