import { describe, expect, it } from 'vitest';
import { rotatedCoverSide, unwrapRotation } from '../../src/services/mapOrientation';

describe('map rotation', () => {
  it('always turns the short way', () => {
    expect(unwrapRotation(0, 90)).toBe(90);
    expect(unwrapRotation(359, 1)).toBe(361); // +2°, not -358°
    expect(unwrapRotation(1, 359)).toBe(-1);
    expect(unwrapRotation(-359, -1)).toBe(-361);
    expect(unwrapRotation(720, 10)).toBe(730);
    expect(unwrapRotation(45, 45)).toBe(45);
  });

  it('keeps the rotated map covering the screen', () => {
    expect(rotatedCoverSide(390, 600)).toBe(716);
    expect(rotatedCoverSide(0, 0)).toBe(0);
  });
});
