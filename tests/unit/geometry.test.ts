import { describe, expect, it } from 'vitest';
import {
  getDistanceMeters,
  getBearing,
  angleDifference,
  buildRouteIndex,
  pointAtDistance,
  projectOnRoute,
  simplifyPolyline,
  distanceToPolyline,
  LatLng,
} from '../../src/services/geometry';

// A small L-shaped route in Alicante: ~200 m east, then ~200 m north
const route: LatLng[] = [
  [38.3453, -0.4891],
  [38.3453, -0.48681],
  [38.3471, -0.48681],
];

describe('geometry', () => {
  it('measures distances with haversine', () => {
    // 0.001° of latitude is ~111 m
    expect(getDistanceMeters(38.345, -0.489, 38.346, -0.489)).toBeCloseTo(111.2, 0);
    expect(getDistanceMeters(38.345, -0.489, 38.345, -0.489)).toBe(0);
  });

  it('computes compass bearings (0 = north, 90 = east)', () => {
    expect(getBearing(38.345, -0.489, 38.346, -0.489)).toBeCloseTo(0, 1);
    expect(getBearing(38.345, -0.489, 38.345, -0.488)).toBeCloseTo(90, 0);
    expect(angleDifference(350, 10)).toBe(20);
    expect(angleDifference(10, 350)).toBe(-20);
  });

  it('indexes a route and finds points by distance', () => {
    const index = buildRouteIndex(route);
    expect(index.totalMeters).toBeGreaterThan(390);
    expect(index.totalMeters).toBeLessThan(410);

    const start = pointAtDistance(index, 0);
    expect(start.lat).toBeCloseTo(route[0][0], 6);
    const corner = pointAtDistance(index, index.cumulative[1]);
    expect(corner.lng).toBeCloseTo(route[1][1], 5);
    // Past the end clamps to the last point
    const end = pointAtDistance(index, 1e6);
    expect(end.lat).toBeCloseTo(route[2][0], 6);
    // First leg goes east, second leg north
    expect(pointAtDistance(index, 50).bearing).toBeCloseTo(90, 0);
    expect(pointAtDistance(index, index.totalMeters - 10).bearing).toBeCloseTo(0, 0);
  });

  it('projects a GPS fix onto the route', () => {
    const index = buildRouteIndex(route);
    // 10 m south of the middle of the first leg
    const p = projectOnRoute(index, 38.34521, -0.48795);
    expect(p.offsetMeters).toBeGreaterThan(8);
    expect(p.offsetMeters).toBeLessThan(12);
    expect(p.alongMeters).toBeGreaterThan(90);
    expect(p.alongMeters).toBeLessThan(110);
    expect(p.bearing).toBeCloseTo(90, 0);
  });

  it('measures the distance from a point to a polyline', () => {
    expect(distanceToPolyline(38.3462, -0.48681, route)).toBeLessThan(1);
    expect(distanceToPolyline(38.3462, -0.4880, route)).toBeGreaterThan(100);
  });

  it('simplifies polylines without losing corners', () => {
    const dense: LatLng[] = [];
    for (let i = 0; i <= 20; i++) dense.push([38.3453, -0.4891 + (i * 0.00229) / 20]);
    dense.push(route[2]);
    const simple = simplifyPolyline(dense, 2);
    expect(simple.length).toBe(3);
    expect(simple[1][1]).toBeCloseTo(route[1][1], 5);
  });
});
