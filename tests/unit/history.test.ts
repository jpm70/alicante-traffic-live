import { describe, expect, it } from 'vitest';
import { slotOf, emptyHistory, updateHistory, stationKey, StationSample } from '../../scripts/trafficHistory';
import { routeHistory, TrafficHistory } from '../../src/services/trafficHistory';
import type { RouteLiveStation, LiveStation } from '../../src/services/liveTraffic';

const sample = (speed: number | null, time: string, km = 20.6): StationSample => ({
  road: 'A-70', km, dir: '-', lat: 38.35, lng: -0.54, speed, time,
});

describe('history slots', () => {
  it('uses the local time written by the DGT', () => {
    // Thursday 15 October 2026, 13:11 in Alicante
    expect(slotOf('2026-10-15T13:11:00+02:00')).toEqual({ slot: 52, dayType: 'weekday' });
    expect(slotOf('2026-10-15T00:00:00+02:00')).toEqual({ slot: 0, dayType: 'weekday' });
    expect(slotOf('2026-10-17T23:59:00+02:00')).toEqual({ slot: 95, dayType: 'weekend' }); // Saturday
    expect(slotOf('no es una fecha')).toBeNull();
  });
});

describe('history updates', () => {
  const t0 = '2026-10-15T11:00:00Z';

  it('adds a publication once and keeps a running mean', () => {
    let h = emptyHistory(t0);
    h = updateHistory(h, [sample(100, '2026-10-15T13:11:00+02:00')], '2026-10-15T13:13:13+02:00', t0);
    // Same publication again (two workflow runs within its validity): ignored
    const again = updateHistory(h, [sample(40, '2026-10-15T13:11:00+02:00')], '2026-10-15T13:13:13+02:00', t0);
    expect(again).toBe(h);

    h = updateHistory(h, [sample(80, '2026-10-15T13:12:00+02:00')], '2026-10-15T13:15:13+02:00', t0);
    const p = h.stations[stationKey(sample(0, ''))];
    expect(p.weekday[52]).toBe(90);
    expect(p.weekdayN[52]).toBe(2);
    expect(p.weekend[52]).toBeNull();
    expect(h.samples).toBe(2);
  });

  it('ignores detectors without speed', () => {
    const h = updateHistory(emptyHistory(t0), [sample(null, '2026-10-15T13:11:00+02:00')], '2026-10-15T13:13:13+02:00', t0);
    expect(h.samples).toBe(0);
    expect(Object.keys(h.stations)).toHaveLength(0);
  });

  it('weighs recent samples once the slot has enough history', () => {
    let h = emptyHistory(t0);
    for (let i = 0; i < 30; i++) {
      h = updateHistory(h, [sample(100, '2026-10-15T08:00:00+02:00')], new Date(Date.parse('2026-10-15T08:00:00+02:00') + i * 60000).toISOString(), t0);
    }
    h = updateHistory(h, [sample(20, '2026-10-15T08:01:00+02:00')], '2026-10-16T08:00:00+02:00', t0);
    // A single jam moves the mean by 1/20 of the difference, not 1/31
    expect(h.stations[stationKey(sample(0, ''))].weekday[32]).toBe(96);
  });
});

describe('route history', () => {
  const station = (km: number, speed: number | null): LiveStation => ({
    id: `s${km}`, road: 'A-70', km, dir: '-', lat: 38.35, lng: -0.54, speed, flow: 1000, occupancy: 5, time: null,
  });
  const onRoute = (s: LiveStation): RouteLiveStation => ({ station: s, alongMeters: 0, status: 'fluido', delayMinutes: 0 });

  it('averages the stations of the route per hour and compares with now', () => {
    let h = emptyHistory('2026-10-01T00:00:00Z');
    h = updateHistory(h, [sample(100, '2026-10-15T08:00:00+02:00', 20.6), sample(80, '2026-10-15T08:30:00+02:00', 22.5)], '2026-10-15T08:31:00+02:00', 'x');
    const history = h as unknown as TrafficHistory;
    const live = [onRoute(station(20.6, 60)), onRoute(station(22.5, 70))];
    const r = routeHistory(live, history, 'weekday', new Date('2026-10-15T08:40:00'))!;
    expect(r.hours[8].typical).toBe(90);
    expect(r.hours[9].typical).toBeNull();
    expect(r.current).toBe(65);
    expect(r.typicalNow).toBe(90);
    expect(r.roads).toEqual(['A-70']);
    expect(routeHistory([], history, 'weekday')).toBeNull();
    expect(routeHistory(live, null, 'weekday')).toBeNull();
  });
});
