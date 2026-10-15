import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDgtFeed } from '../../scripts/dgtIncidents';
import { parseRadarFeed, decodeFeed } from '../../scripts/dgtRadars';
import { withDisplayTimes } from '../../src/data/trafficAlerts';

const fixture = (name: string) => readFileSync(path.join(__dirname, '..', 'fixtures', name));

describe('DGT incidents (DATEX II v3.7)', () => {
  const { alerts, publishedAt } = parseDgtFeed(fixture('dgt-situations.xml').toString('utf8'));

  it('keeps only real, active incidents around Alicante', () => {
    // Fixture: accident + roadworks in Alicante, one incident in Madrid, one "test" record
    expect(alerts.map((a) => a.id)).toEqual(['dgt-24701458', 'dgt-21842278']);
    expect(publishedAt).toMatch(/^2026-10-15T/);
  });

  it('classifies and describes them in Spanish', () => {
    const [accident, works] = alerts;
    expect(accident).toMatchObject({ type: 'accidente', severity: 'alta', street: 'A-70 · km 12.276', zone: 'Alacant/Alicante' });
    expect(works).toMatchObject({ type: 'obra', street: 'AP-7 · km 698.0' });
    expect(works.description).toContain('AP-7');
    expect(works.endsAt).toBeTruthy();
    for (const a of alerts) {
      expect(a.lat).toBeGreaterThan(38.25);
      expect(a.lng).toBeLessThan(-0.33);
      expect(a.delayMin).toBeGreaterThan(0);
    }
  });

  it('formats times in the browser', () => {
    const now = Date.parse('2026-10-15T08:00:00+02:00');
    const a = withDisplayTimes({ ...alerts[0], updatedAt: '2026-10-15T07:48:00+02:00', endsAt: undefined }, now);
    expect(a.timestamp).toBe('Hace 12 min');
    const b = withDisplayTimes({ ...alerts[0], updatedAt: '2026-10-14T08:00:00+02:00', endsAt: '2026-10-15T14:30:00+02:00' }, now);
    expect(b.timestamp).toBe('Hace 24 h');
    expect(b.durationEstimate).toMatch(/^Hasta las \d{2}:\d{2}$/);
  });
});

describe('DGT speed cameras (DATEX II v1, ISO-8859-1)', () => {
  const { radars, publishedAt } = parseRadarFeed(decodeFeed(fixture('dgt-radares.xml')));

  it('decodes the Latin-1 file', () => {
    expect(decodeFeed(fixture('dgt-radares.xml'))).toContain('CASTELLÓN');
  });

  it('keeps only the province of Alicante', () => {
    // Fixture: A-70 cabin (Alicante), a Castellón cabin, a Zaragoza section and the same
    // section relabelled as province 03
    expect(radars.map((r) => r.id)).toEqual(['CABINACINEMOMETRO_120597', 'CVM_TEST03']);
    expect(publishedAt).toMatch(/^2025-12-18T/);
  });

  it('reads cabins and average-speed sections', () => {
    expect(radars[0]).toEqual({ id: 'CABINACINEMOMETRO_120597', type: 'fijo', road: 'A-70', km: 8.4, lat: 38.413906, lng: -0.4326693 });
    expect(radars[1]).toMatchObject({ type: 'tramo', road: 'Z-40', km: 26.6, endKm: 29.7, lat: 41.6088, endLat: 41.6192 });
  });
});
