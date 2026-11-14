// Where to draw each camera on the map.
//
// The cameras of a junction share the junction's position (the only one the City Council
// publishes), so their markers would sit exactly on top of each other and only one could
// be tapped. For drawing only, they are spread on a small circle around the junction.
// Routes and distances always use the real position in the data.

const RING_METERS = 18;
const METERS_PER_DEGREE_LAT = 111320;

export function spreadSharedPositions<T extends { id: string; lat: number; lng: number }>(cameras: T[]): Map<string, [number, number]> {
  const groups = new Map<string, T[]>();
  for (const cam of cameras) {
    const key = `${cam.lat},${cam.lng}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(cam);
  }

  const positions = new Map<string, [number, number]>();
  for (const group of groups.values()) {
    if (group.length === 1) {
      positions.set(group[0].id, [group[0].lat, group[0].lng]);
      continue;
    }
    // Same order on every render, so a marker does not jump between redraws
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id));
    sorted.forEach((cam, i) => {
      const angle = (2 * Math.PI * i) / sorted.length;
      const dLat = (RING_METERS * Math.cos(angle)) / METERS_PER_DEGREE_LAT;
      const dLng = (RING_METERS * Math.sin(angle)) / (METERS_PER_DEGREE_LAT * Math.cos((cam.lat * Math.PI) / 180));
      positions.set(cam.id, [cam.lat + dLat, cam.lng + dLng]);
    });
  }
  return positions;
}
