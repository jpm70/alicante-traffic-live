import { describe, expect, it } from 'vitest';
import { ageMinutes, describeAge, escapeHtml, formatUpdatedAt, isOlderThan, LIVE_SPEED_MAX_AGE_MIN } from '../../src/services/dataAge';
import { withoutStaleSpeeds, liveStatus, liveDelayMinutes, LiveStation } from '../../src/services/liveTraffic';

const NOW = Date.parse('2026-11-13T18:30:00+01:00');

describe('antigüedad de los datos de la DGT', () => {
  it('calcula los minutos desde la publicación', () => {
    expect(ageMinutes('2026-11-13T17:44:00+01:00', NOW)).toBe(46);
    expect(ageMinutes('2026-11-13T19:00:00+01:00', NOW)).toBe(0); // clock skew never gives a negative age
    expect(ageMinutes(null, NOW)).toBeNull();
    expect(ageMinutes('no es una fecha', NOW)).toBeNull();
  });

  it('distingue los datos recientes de los antiguos', () => {
    expect(isOlderThan('2026-11-13T18:00:00+01:00', LIVE_SPEED_MAX_AGE_MIN, NOW)).toBe(false);
    expect(isOlderThan('2026-11-13T10:00:00+01:00', LIVE_SPEED_MAX_AGE_MIN, NOW)).toBe(true);
    // Without a date nothing can be said: it is not treated as old
    expect(isOlderThan(null, LIVE_SPEED_MAX_AGE_MIN, NOW)).toBe(false);
  });

  it('describe la antigüedad en minutos, horas y días', () => {
    expect(describeAge(0)).toBe('hace un momento');
    expect(describeAge(12)).toBe('hace 12 min');
    expect(describeAge(300)).toBe('hace 5 h');
    expect(describeAge(3 * 1440)).toBe('hace 3 días');
  });

  it('añade la fecha a la hora cuando el dato no es de hoy', () => {
    expect(formatUpdatedAt('2026-11-13T17:44:00+01:00', NOW)).toMatch(/^\d{2}:\d{2}$/);
    expect(formatUpdatedAt('2026-11-10T17:44:00+01:00', NOW)).toMatch(/10 nov.*\d{2}:\d{2}/);
  });
});

describe('velocidades medidas antiguas', () => {
  const station: LiveStation = { id: 'a', road: 'A-70', km: 20.6, dir: '+', lat: 38.3, lng: -0.5, speed: 25, flow: 900, occupancy: 45, time: '2026-11-13T10:00:00+01:00' };

  it('no se usan: la estación queda sin velocidad y no suma retraso', () => {
    const [stale] = withoutStaleSpeeds([station], '2026-11-13T10:00:00+01:00', NOW);
    expect(stale.stale).toBe(true);
    expect(stale.speed).toBeNull();
    expect(liveStatus(stale)).toBe('sin-datos');
    expect(liveDelayMinutes(stale.speed)).toBe(0);
    // Still the same measuring point: the history of the route keeps working
    expect(stale).toMatchObject({ road: 'A-70', km: 20.6, dir: '+' });
  });

  it('las recientes se dejan como están', () => {
    const fresh = withoutStaleSpeeds([station], '2026-11-13T18:10:00+01:00', NOW);
    expect(fresh[0]).toBe(station);
  });
});

describe('escapeHtml', () => {
  it('neutraliza el HTML de un nombre de lugar', () => {
    const escaped = escapeHtml('<img src=x onerror="alert(1)">');
    expect(escaped).not.toContain('<');
    expect(escaped).not.toContain('"');
    expect(escaped).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  });

  it('deja intactos los nombres normales', () => {
    expect(escapeHtml('Plaça de Calvo Sotelo, Alicante')).toBe('Plaça de Calvo Sotelo, Alicante');
    expect(escapeHtml("Avinguda de la Caixa d'Estalvis")).toBe('Avinguda de la Caixa d&#39;Estalvis');
    expect(escapeHtml(undefined)).toBe('');
  });
});
