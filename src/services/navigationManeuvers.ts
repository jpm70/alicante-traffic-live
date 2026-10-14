import { CalculatedRoute, RoutePoint, getDistanceMeters } from './routing';

export interface NavigationManeuver {
  id: string;
  type:
    | 'start'
    | 'straight'
    | 'turn-right'
    | 'turn-left'
    | 'slight-right'
    | 'slight-left'
    | 'u-turn'
    | 'destination';
  instruction: string;
  streetName: string;
  distanceFromPreviousMeters: number;
  accumulatedDistanceMeters: number;
  point: [number, number]; // [lat, lng]
}

// Calculate initial bearing between two points in degrees (0 = North, 90 = East)
export function getBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  const bearing = ((theta * 180) / Math.PI + 360) % 360;
  return bearing;
}

// Normalize angle difference to -180 .. +180
function getAngleDifference(b1: number, b2: number): number {
  let diff = (b2 - b1 + 180) % 360 - 180;
  return diff < -180 ? diff + 360 : diff;
}

// Generate sequential turn-by-turn maneuvers along the route polyline
export function generateRouteManeuvers(
  route: CalculatedRoute,
  origin: RoutePoint & { name: string },
  destination: RoutePoint & { name: string }
): NavigationManeuver[] {
  const coords = route.coordinates;
  if (!coords || coords.length < 2) {
    return [
      {
        id: 'start-0',
        type: 'start',
        instruction: `Inicia la marcha hacia ${destination.name}`,
        streetName: route.name,
        distanceFromPreviousMeters: 0,
        accumulatedDistanceMeters: 0,
        point: coords[0] || [origin.lat, origin.lng],
      },
      {
        id: 'end-1',
        type: 'destination',
        instruction: `Llegada al destino: ${destination.name}`,
        streetName: destination.name,
        distanceFromPreviousMeters: route.distanceKm * 1000,
        accumulatedDistanceMeters: route.distanceKm * 1000,
        point: coords[coords.length - 1] || [destination.lat, destination.lng],
      },
    ];
  }

  const maneuvers: NavigationManeuver[] = [];

  // Step 0: Start
  maneuvers.push({
    id: 'm-0',
    type: 'start',
    instruction: `Sal desde ${origin.name} e incorpórate al corredor ${route.name}`,
    streetName: route.name,
    distanceFromPreviousMeters: 0,
    accumulatedDistanceMeters: 0,
    point: coords[0],
  });

  // Calculate cumulative distance and find sharp heading changes
  let accumulatedDist = 0;
  let lastManeuverIndex = 0;
  let lastManeuverDist = 0;

  for (let i = 1; i < coords.length - 1; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const next = coords[i + 1];

    const segDist = getDistanceMeters(prev[0], prev[1], curr[0], curr[1]);
    accumulatedDist += segDist;

    // Minimum 120m spacing between turn instructions to avoid alert spam
    if (accumulatedDist - lastManeuverDist < 120) continue;

    const bearingIn = getBearing(prev[0], prev[1], curr[0], curr[1]);
    const bearingOut = getBearing(curr[0], curr[1], next[0], next[1]);
    const turnAngle = getAngleDifference(bearingIn, bearingOut);

    // Identify significant turns
    if (Math.abs(turnAngle) > 25) {
      let type: NavigationManeuver['type'] = 'straight';
      let turnDesc = 'Continúa';

      if (turnAngle >= 65 && turnAngle <= 135) {
        type = 'turn-right';
        turnDesc = 'Gira a la derecha';
      } else if (turnAngle >= 25 && turnAngle < 65) {
        type = 'slight-right';
        turnDesc = 'Gira ligeramente a la derecha';
      } else if (turnAngle <= -65 && turnAngle >= -135) {
        type = 'turn-left';
        turnDesc = 'Gira a la izquierda';
      } else if (turnAngle <= -25 && turnAngle > -65) {
        type = 'slight-left';
        turnDesc = 'Gira ligeramente a la izquierda';
      } else if (Math.abs(turnAngle) > 135) {
        type = 'u-turn';
        turnDesc = 'Cambio de sentido en rotonda';
      }

      // Check if nearest camera provides a street context
      const nearestCam = route.cameras.find((c) => {
        const d = getDistanceMeters(curr[0], curr[1], c.lat, c.lng);
        return d < 200;
      });

      const street = nearestCam ? nearestCam.name : `Corredor ${route.name}`;
      const instruction = `${turnDesc} hacia ${street}`;

      maneuvers.push({
        id: `m-${maneuvers.length}`,
        type,
        instruction,
        streetName: street,
        distanceFromPreviousMeters: Math.round(accumulatedDist - lastManeuverDist),
        accumulatedDistanceMeters: Math.round(accumulatedDist),
        point: curr,
      });

      lastManeuverIndex = i;
      lastManeuverDist = accumulatedDist;
    }
  }

  // Final step: Destination
  const lastPoint = coords[coords.length - 1];
  const finalSegDist = getDistanceMeters(
    coords[coords.length - 2][0],
    coords[coords.length - 2][1],
    lastPoint[0],
    lastPoint[1]
  );
  accumulatedDist += finalSegDist;

  maneuvers.push({
    id: `m-dest`,
    type: 'destination',
    instruction: `Has llegado a tu destino: ${destination.name}`,
    streetName: destination.name,
    distanceFromPreviousMeters: Math.round(accumulatedDist - lastManeuverDist),
    accumulatedDistanceMeters: Math.round(accumulatedDist),
    point: lastPoint,
  });

  return maneuvers;
}
