// Map orientation of the GPS navigator: north up (the map stays still and the car arrow
// turns) or heading up (the map turns so the road ahead is always up).

export type MapOrientation = 'north-up' | 'heading-up';

export const MAP_ORIENTATION_STORAGE_KEY = 'alicante_gps_orientation';

export function loadMapOrientation(): MapOrientation {
  try {
    return localStorage.getItem(MAP_ORIENTATION_STORAGE_KEY) === 'heading-up' ? 'heading-up' : 'north-up';
  } catch {
    return 'north-up';
  }
}

export function saveMapOrientation(value: MapOrientation): void {
  try {
    localStorage.setItem(MAP_ORIENTATION_STORAGE_KEY, value);
  } catch {
    // Private mode: the choice only lasts for this trip
  }
}

// Next value of a CSS rotation (degrees) that must end at `target` (mod 360) turning the
// short way. CSS transitions interpolate the raw number, so going from 359° to 1° has to
// become 361°, not 1°, or the map/arrow spins a full turn backwards.
export function unwrapRotation(previous: number, target: number): number {
  const delta = ((((target - previous) % 360) + 540) % 360) - 180;
  return previous + delta;
}

// Side of the square that still covers a w×h viewport when rotated by any angle
export const rotatedCoverSide = (width: number, height: number) => Math.ceil(Math.hypot(width, height));
