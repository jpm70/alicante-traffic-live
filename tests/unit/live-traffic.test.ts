import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDetectorInventory, parseDetectorMeasurements, aggregateStations } from '../../scripts/dgtDetectors';
import { decodeFeed } from '../../scripts/dgtRadars';
import { liveStatus, liveDelayMinutes, stationsAlongRoute, LiveStation } from '../../src/services/liveTraffic';
import { applyIncidents, CalculatedRoute } from '../../src/services/routing';

const fixture = (name: string) => decodeFeed(readFileSync(path.join(__dirname, '..', 'fixtures', name)));

describe('DGT road detectors (DATEX II v1)', () => {
  const inventory = parseDetectorInventory(fixture('dgt-detectores-inventario.xml'));
  const { detectors, publishedAt } = parseDetectorMeasurements(fixture('dgt-detectores-medidas.xml'), inventory);

  it('keeps the detectors of the province of Alicante', () => {
    // Fixture: 4 lanes of the A-31 at km 235.6 (2 per direction), an A-7 detector with
    // no vehicles, and a detector in Madrid
    expect([...inventory.keys()].sort()).toEqual(['DET_130290', 'DET_130348', 'DET_130350', 'DET_130352', 'DET_130354']);
    expect(detectors).toHaveLength(5);
    expect(publishedAt).toMatch(/^2026-10-15T/);
  });

  it('reads speed, flow, occupancy and direction', () => {
    const lane = detectors.find((d) => d.id === 'DET_130352')!;
    expect(lane).toMatchObject({ road: 'A-31', km: 235.6, dir: '-', speed: 83, flow: 960, occupancy: 8 });
    // No vehicles: no speed, not a traffic jam
    expect(detectors.find((d) => d.id === 'DET_130290')).toMatchObject({ road: 'A-7', speed: null, flow: 0 });
  });

  it('discards implausible speeds reported by a detector', () => {
    const glitch = fixture('dgt-detectores-medidas.xml').replace('<_0:averageVehicleSpeed>83.0<', '<_0:averageVehicleSpeed>190.0<');
    const lane = parseDetectorMeasurements(glitch, inventory).detectors.find((d) => d.id === 'DET_130352')!;
    expect(lane.speed).toBeNull();
    expect(lane.flow).toBe(960);
  });

  it('merges the lanes of each point and direction', () => {
    const stations = aggregateStations(detectors);
    expect(stations).toHaveLength(3);
    const down = stations.find((s) => s.road === 'A-31' && s.dir === '-')!;
    const up = stations.find((s) => s.road === 'A-31' && s.dir === '+')!;
    // Flow-weighted: (83·960 + 111·540) / 1500 = 93
    expect(down).toMatchObject({ speed: 93, flow: 1500, occupancy: 5.5 });
    expect(up).toMatchObject({ speed: 94, flow: 1440, occupancy: 4.5 });
  });
});

describe('measured traffic on a route', () => {
  it('classifies measured speeds', () => {
    expect(liveStatus({ speed: 95, occupancy: 6 })).toBe('fluido');
    expect(liveStatus({ speed: 55, occupancy: 10 })).toBe('denso');
    expect(liveStatus({ speed: 90, occupancy: 30 })).toBe('denso');
    expect(liveStatus({ speed: 25, occupancy: 10 })).toBe('retencion');
    expect(liveStatus({ speed: null, occupancy: 0 })).toBe('sin-datos');
  });

  it('turns slow speeds into delay over the stretch each detector covers', () => {
    expect(liveDelayMinutes(100)).toBe(0);
    expect(liveDelayMinutes(null)).toBe(0);
    // 1 km at 30 km/h instead of 90 km/h: 2 - 0.67 = 1.3 min
    expect(liveDelayMinutes(30)).toBe(1.3);
  });

  // A motorway running east, kilometre points increasing towards the east
  const coordinates: [number, number][] = [
    [38.34, -0.56],
    [38.34, -0.54],
    [38.34, -0.52],
  ];
  const station = (id: string, km: number, dir: '+' | '-', lng: number, speed: number, latOffset = 0): LiveStation => ({
    id, road: 'A-31', km, dir, lat: 38.34 + latOffset, lng, speed, flow: 1000, occupancy: 8, time: null,
  });
  const stations = [
    station('w+', 230, '+', -0.555, 95, -0.0002),
    station('w-', 230, '-', -0.555, 20, 0.0002),
    station('e+', 232, '+', -0.525, 35, -0.0002),
    station('e-', 232, '-', -0.525, 100, 0.0002),
  ];
  const route = {
    id: 'r', name: 'r', description: '', distanceKm: 3.5, baseMinutes: 3, cameraDelayMinutes: 0, trafficDelayMinutes: 0,
    totalMinutes: 3, status: 'fluido', isFastest: false, timeSavingsMinutes: 0, cameras: [], color: '#fff',
    isApproximate: false, incidents: [], incidentDelayMinutes: 0, coordinates,
    steps: [{ type: 'depart', name: 'Autovía de Alicante', ref: 'A-31', distance: 3500, duration: 180, location: coordinates[0], geometry: coordinates }],
  } as unknown as CalculatedRoute;

  it('uses only the carriageway in the direction of travel', () => {
    const found = stationsAlongRoute(route, stations);
    // Driving east = increasing kilometre points: the '+' stations
    expect(found.map((f) => f.station.id)).toEqual(['w+', 'e+']);
    expect(found[1].status).toBe('retencion');

    // Same road driven the other way: the '-' stations
    const reversed = { ...route, coordinates: [...coordinates].reverse(), steps: [{ ...route.steps[0], geometry: [...coordinates].reverse() }] } as CalculatedRoute;
    expect(stationsAlongRoute(reversed, stations).map((f) => f.station.id)).toEqual(['e-', 'w-']);
  });

  it('ignores detectors of another road', () => {
    const local = { ...route, steps: [{ ...route.steps[0], name: 'Calle Mayor', ref: undefined }] } as CalculatedRoute;
    expect(stationsAlongRoute(local, stations)).toEqual([]);
  });

  it('adds the measured delay to the route', () => {
    const [applied] = applyIncidents([route], [], stations);
    expect(applied.liveStations).toHaveLength(2);
    // 35 km/h on 1 km: 60/35 - 60/90 = 1.05 min, rounded to 1
    expect(applied.liveDelayMinutes).toBe(1);
    expect(applied.totalMinutes).toBe(4);
    expect(applied.status).toBe('concurrido');
  });
});
