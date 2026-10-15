import { CalculatedRoute, RoutePoint, RouteStep } from './routing';
import { getDistanceMeters, getBearing, angleDifference } from './geometry';

export { getBearing } from './geometry';

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
    | 'roundabout'
    | 'destination';
  instruction: string;
  streetName: string;
  distanceFromPreviousMeters: number;
  accumulatedDistanceMeters: number;
  point: [number, number]; // [lat, lng]
}

const ORDINALS = ['primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava'];

function stepStreet(step: RouteStep, fallback: string): string {
  if (step.name && step.ref) return `${step.name} (${step.ref})`;
  return step.name || step.ref || fallback;
}

function turnFromModifier(modifier?: string): { type: NavigationManeuver['type']; verb: string } {
  switch (modifier) {
    case 'right':
    case 'sharp right':
      return { type: 'turn-right', verb: 'Gira a la derecha' };
    case 'slight right':
      return { type: 'slight-right', verb: 'Gira ligeramente a la derecha' };
    case 'left':
    case 'sharp left':
      return { type: 'turn-left', verb: 'Gira a la izquierda' };
    case 'slight left':
      return { type: 'slight-left', verb: 'Gira ligeramente a la izquierda' };
    case 'uturn':
      return { type: 'u-turn', verb: 'Cambia de sentido' };
    default:
      return { type: 'straight', verb: 'Continúa recto' };
  }
}

// Spanish instruction for one OSRM step
function describeStep(step: RouteStep, destinationName: string): { type: NavigationManeuver['type']; instruction: string; street: string } {
  const street = stepStreet(step, '');
  const onto = street ? ` por ${street}` : '';

  switch (step.type) {
    case 'depart':
      return { type: 'start', instruction: `Sal${onto}`, street };
    case 'arrive':
      return { type: 'destination', instruction: `Has llegado a tu destino: ${destinationName}`, street: destinationName };
    case 'roundabout':
    case 'rotary':
    case 'roundabout turn': {
      const exitName = step.exit && step.exit <= ORDINALS.length ? ORDINALS[step.exit - 1] : null;
      const instruction = exitName
        ? `En la rotonda, toma la ${exitName} salida${onto}`
        : `En la rotonda, sigue${onto}`;
      return { type: 'roundabout', instruction, street };
    }
    case 'exit roundabout':
    case 'exit rotary':
      return { type: 'straight', instruction: `Sal de la rotonda${onto}`, street };
    case 'merge':
      return { type: turnFromModifier(step.modifier).type, instruction: `Incorpórate${onto}`, street };
    case 'on ramp':
      return { type: turnFromModifier(step.modifier).type, instruction: `Toma el acceso${onto}`, street };
    case 'off ramp':
      return { type: turnFromModifier(step.modifier).type, instruction: `Toma la salida${onto}`, street };
    case 'fork': {
      const side = step.modifier?.includes('left') ? 'izquierda' : 'derecha';
      return { type: turnFromModifier(step.modifier).type, instruction: `En la bifurcación, mantente a la ${side}${onto}`, street };
    }
    case 'new name':
    case 'continue':
      if (!step.modifier || step.modifier === 'straight') {
        return { type: 'straight', instruction: `Continúa${onto}`, street };
      }
    // falls through: a 'continue' with a modifier is a real turn
    default: {
      const { type, verb } = turnFromModifier(step.modifier);
      return { type, instruction: `${verb}${onto}`, street };
    }
  }
}

function maneuversFromSteps(
  route: CalculatedRoute,
  origin: RoutePoint & { name: string },
  destination: RoutePoint & { name: string }
): NavigationManeuver[] {
  const maneuvers: NavigationManeuver[] = [];
  let accumulated = 0;
  let lastManeuverDist = 0;

  route.steps.forEach((step, i) => {
    const { type, instruction, street } = describeStep(step, destination.name);
    const isEdge = i === 0 || step.type === 'arrive';
    // Street-name changes without a real turn are not worth an announcement
    const isMeaningful = isEdge || type !== 'straight' || step.type === 'merge' || step.type === 'fork';

    if (isMeaningful) {
      maneuvers.push({
        id: `m-${i}`,
        type,
        instruction: i === 0 ? `Sal desde ${origin.name}${step.name ? ` por ${street}` : ''}` : instruction,
        streetName: street,
        distanceFromPreviousMeters: Math.round(accumulated - lastManeuverDist),
        accumulatedDistanceMeters: Math.round(accumulated),
        point: step.location,
      });
      lastManeuverDist = accumulated;
    }
    accumulated += step.distance;
  });

  // Make sure the list always ends with the destination
  if (maneuvers.length === 0 || maneuvers[maneuvers.length - 1].type !== 'destination') {
    const last = route.coordinates[route.coordinates.length - 1] || [destination.lat, destination.lng];
    maneuvers.push({
      id: 'm-dest',
      type: 'destination',
      instruction: `Has llegado a tu destino: ${destination.name}`,
      streetName: destination.name,
      distanceFromPreviousMeters: Math.round(accumulated - lastManeuverDist),
      accumulatedDistanceMeters: Math.round(accumulated),
      point: last,
    });
  }
  return maneuvers;
}

// Geometric fallback for approximate routes (no steps from the routing engine)
function maneuversFromGeometry(
  route: CalculatedRoute,
  origin: RoutePoint & { name: string },
  destination: RoutePoint & { name: string }
): NavigationManeuver[] {
  const coords = route.coordinates;
  const start = coords[0] || [origin.lat, origin.lng];
  const end = coords[coords.length - 1] || [destination.lat, destination.lng];
  const maneuvers: NavigationManeuver[] = [
    {
      id: 'm-0',
      type: 'start',
      instruction: `Sal desde ${origin.name}`,
      streetName: route.name,
      distanceFromPreviousMeters: 0,
      accumulatedDistanceMeters: 0,
      point: start,
    },
  ];

  let accumulated = 0;
  let lastManeuverDist = 0;
  for (let i = 1; i < coords.length - 1; i++) {
    accumulated += getDistanceMeters(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
    if (accumulated - lastManeuverDist < 120) continue;
    const bearingIn = getBearing(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
    const bearingOut = getBearing(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1]);
    const turn = angleDifference(bearingIn, bearingOut);
    if (Math.abs(turn) < 35) continue;
    const modifier = Math.abs(turn) > 150 ? 'uturn' : turn > 0 ? (turn < 60 ? 'slight right' : 'right') : turn > -60 ? 'slight left' : 'left';
    const { type, verb } = turnFromModifier(modifier);
    maneuvers.push({
      id: `m-${maneuvers.length}`,
      type,
      instruction: verb,
      streetName: route.name,
      distanceFromPreviousMeters: Math.round(accumulated - lastManeuverDist),
      accumulatedDistanceMeters: Math.round(accumulated),
      point: coords[i],
    });
    lastManeuverDist = accumulated;
  }

  if (coords.length >= 2) {
    accumulated += getDistanceMeters(coords[coords.length - 2][0], coords[coords.length - 2][1], end[0], end[1]);
  }
  maneuvers.push({
    id: 'm-dest',
    type: 'destination',
    instruction: `Has llegado a tu destino: ${destination.name}`,
    streetName: destination.name,
    distanceFromPreviousMeters: Math.round(accumulated - lastManeuverDist),
    accumulatedDistanceMeters: Math.round(accumulated),
    point: end,
  });
  return maneuvers;
}

// Turn-by-turn maneuvers. Uses the real instructions and street names from the
// routing engine whenever they are available.
export function generateRouteManeuvers(
  route: CalculatedRoute,
  origin: RoutePoint & { name: string },
  destination: RoutePoint & { name: string }
): NavigationManeuver[] {
  if (route.steps && route.steps.length > 0) return maneuversFromSteps(route, origin, destination);
  return maneuversFromGeometry(route, origin, destination);
}

// Index of the next maneuver ahead of the given along-route distance
export function nextManeuverIndex(maneuvers: NavigationManeuver[], alongMeters: number): number {
  for (let i = 0; i < maneuvers.length; i++) {
    if (maneuvers[i].accumulatedDistanceMeters > alongMeters + 5) return i;
  }
  return maneuvers.length - 1;
}

// Street the driver is currently on (the street of the last maneuver already passed)
export function currentStreetName(maneuvers: NavigationManeuver[], alongMeters: number, fallback: string): string {
  let street = fallback;
  for (const m of maneuvers) {
    if (m.accumulatedDistanceMeters <= alongMeters + 5) {
      // Unnamed roads keep the previous street name
      if (m.type !== 'destination' && m.streetName) street = m.streetName;
    } else break;
  }
  return street;
}
