import { describe, expect, it } from 'vitest';
import { ROUTE_STATUS_LABEL, ROUTE_STATUS_STYLE, cameraStatusLabel, countLabel } from '../../src/services/text';

describe('textos de estado', () => {
  it('escribe los estados con tilde y mayúscula inicial', () => {
    expect(ROUTE_STATUS_LABEL.critico).toBe('Crítico');
    expect(ROUTE_STATUS_LABEL.fluido).toBe('Fluido');
    expect(cameraStatusLabel('retencion')).toBe('con retención');
    expect(cameraStatusLabel('denso')).toBe('denso');
  });

  it('da un color distinto a cada estado de ruta', () => {
    const colors = Object.values(ROUTE_STATUS_STYLE).map((s) => s.text);
    expect(new Set(colors).size).toBe(4);
    expect(ROUTE_STATUS_STYLE.fluido.text).toContain('emerald');
    expect(ROUTE_STATUS_STYLE.critico.text).toContain('rose');
  });
});

describe('countLabel', () => {
  it('usa el singular solo con 1', () => {
    expect(countLabel(1, 'cámara', 'cámaras')).toBe('1 cámara');
    expect(countLabel(0, 'cámara', 'cámaras')).toBe('0 cámaras');
    expect(countLabel(6, 'cámara', 'cámaras')).toBe('6 cámaras');
  });
});
