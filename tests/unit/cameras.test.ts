import { describe, expect, it } from 'vitest';
import { CAMERAS, PRESET_ROUTES, TrafficCamera, ZONES } from '../../src/data/cameras';
import { junctionOf, matchCamerasToRoute, namesMatch, RouteStep } from '../../src/services/routing';
import { spreadSharedPositions } from '../../src/services/cameraLayout';
import { getDistanceMeters } from '../../src/services/geometry';
import { applyPositions, parseJunctions, positionFor } from '../../scripts/update-camera-positions';

const cam = (id: string, name: string, lat: number, lng: number): TrafficCamera => ({ id, name, zona: 'Centro Ciudad', url: `https://example.test/${id}.jpg?itok=x`, lat, lng, index: 0 });

// Junction C15 with four cameras, junction C16 with two cameras without a street name
const JUNCTION_A: [number, number] = [38.3458, -0.4862];
const JUNCTION_B: [number, number] = [38.3458, -0.4802];
const cameras = [
  cam('C15F2', 'Avda. Alfonso X El Sabio', ...JUNCTION_A),
  cam('C15F3', 'C/ Calderón de la Barca', ...JUNCTION_A),
  cam('C15F4', 'A. El Sabio - San Vicente', ...JUNCTION_A),
  cam('C15F5', 'Rambla de Méndez Núñez', ...JUNCTION_A),
  cam('C16F3', 'Cámara - C16F3', ...JUNCTION_B),
  cam('C16F2', 'Cámara - C16F2', ...JUNCTION_B),
  cam('C99M1', 'Avda. de Denia', 38.36, -0.46), // far from the route
];
// Route east along the avenue, through both junctions (OSRM names the street in Valencian)
const route: [number, number][] = [[38.3458, -0.49], [38.3458, -0.4862], [38.3458, -0.4802], [38.3458, -0.476]];
const steps: RouteStep[] = [{ type: 'depart', name: "Avinguda d'Alfons el Savi", distance: 1200, duration: 180, location: route[0], geometry: route }];

describe('cámaras en la ruta', () => {
  it('de un cruce elige las que miran a la calle de la ruta, aunque el nombre venga en valenciano', () => {
    const found = matchCamerasToRoute(route, steps, cameras);
    const atA = found.filter((f) => junctionOf(f.camera.id) === 'C15').map((f) => f.camera.id);
    // 'A. El Sabio - San Vicente' abbreviates the avenue: it cannot be recognised by name
    expect(atA).toEqual(['C15F2']);
    expect(found.find((f) => f.camera.id === 'C15F2')!.streetName).toBe("Avinguda d'Alfons el Savi");
  });

  it('si ninguna cámara del cruce nombra la calle, una sola representa al cruce', () => {
    const found = matchCamerasToRoute(route, steps, cameras);
    expect(found.filter((f) => junctionOf(f.camera.id) === 'C16').map((f) => f.camera.id)).toEqual(['C16F2']);
  });

  it('ordena por el avance en la ruta y deja fuera los cruces lejanos', () => {
    const ids = matchCamerasToRoute(route, steps, cameras).map((f) => f.camera.id);
    expect(ids).toEqual(['C15F2', 'C16F2']);
    expect(matchCamerasToRoute([], steps, cameras)).toEqual([]);
  });

  it('empareja nombres en castellano y en valenciano por el comienzo de la palabra', () => {
    expect(namesMatch('C/ Reyes Católicos', 'Carrer dels Reis Catòlics')).toBe(true);
    expect(namesMatch('Avda. de la Estación', "Avinguda de l'Estació")).toBe(true);
    expect(namesMatch('Avda. Denia', 'Avinguda de Dénia')).toBe(true);
    expect(namesMatch('Avda. Novelda', 'Avinguda de Dénia')).toBe(false);
    expect(namesMatch('Cámara - C21F4', 'Avinguda de Dénia')).toBe(false);
  });
});

describe('posiciones oficiales de los cruces', () => {
  const pois = [
    {
      title: 'C01 Plaza de la Estrella', content_type: 'agrfis', lat: 38.343212, lon: -0.494571,
      images: [
        { original: 'https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma/public/camara/C01F4.jpg?itok=a', title: 'Avda Aguilera' },
        { original: 'https://movilidad.alicante.es/sites/default/files/styles/upload_fotograma/public/camara/C01M5.jpg?itok=b', title: 'Oscar Esplá' },
      ],
    },
    { title: 'Parada 1', content_type: 'bus_stop', lat: 38.3, lon: -0.5 },
    { title: 'C02 Sin cámaras', content_type: 'agrfis', lat: 38.3, lon: -0.5, images: [] },
  ];
  const junctions = parseJunctions(pois);

  it('lee los cruces con cámaras del fichero municipal', () => {
    expect(junctions).toHaveLength(1);
    expect(junctions[0]).toMatchObject({ code: 'C01', lat: 38.343212, lng: -0.494571 });
    expect(junctions[0].cameras.map((c) => c.id)).toEqual(['C01F4', 'C01M5']);
  });

  it('coloca cada cámara en su cruce; una que ya no se lista, por el código del cruce', () => {
    expect(positionFor('C01M5', junctions)).toMatchObject({ lat: 38.343212, inferred: false });
    expect(positionFor('C01F9', junctions)).toMatchObject({ lat: 38.343212, inferred: true });
    expect(positionFor('C77M1', junctions)).toBeNull();
  });

  it('reescribe solo lat y lng, e informa de las cámaras que faltan en cada lado', () => {
    const source = `[
  { "id": "C01F4", "name": "Avda Aguilera", "zona": "Centro", "url": "u1", "lat": 38.35, "lng": -0.49, "index": 0 },
  { "id": "C77M1", "name": "Otra", "zona": "Centro", "url": "u2", "lat": 38.3, "lng": -0.5, "index": 1 }
]`;
    const result = applyPositions(source, junctions);
    expect(result.output).toContain('"id": "C01F4", "name": "Avda Aguilera", "zona": "Centro", "url": "u1", "lat": 38.343212, "lng": -0.494571, "index": 0');
    expect(result.output).toContain('"lat": 38.3, "lng": -0.5, "index": 1');
    expect(result.missing).toEqual(['C77M1']);
    expect(result.notInApp.map((c) => c.id)).toEqual(['C01M5']);
    expect(result.moved[0].meters).toBeGreaterThan(700);
  });
});

describe('datos de cámaras publicados con la app', () => {
  it('todas las cámaras de un mismo cruce comparten posición', () => {
    const byJunction = new Map<string, Set<string>>();
    for (const c of CAMERAS) {
      const key = junctionOf(c.id);
      if (!byJunction.has(key)) byJunction.set(key, new Set());
      byJunction.get(key)!.add(`${c.lat},${c.lng}`);
    }
    const split = [...byJunction.entries()].filter(([, points]) => points.size > 1).map(([key]) => key);
    expect(split).toEqual([]);
  });

  it('están dentro del término de Alicante y con precisión de metros', () => {
    for (const c of CAMERAS) {
      expect(c.lat).toBeGreaterThan(38.28);
      expect(c.lat).toBeLessThan(38.43);
      expect(c.lng).toBeGreaterThan(-0.63);
      expect(c.lng).toBeLessThan(-0.35);
    }
    const coarse = CAMERAS.filter((c) => String(c.lat).split('.')[1].length < 5 && String(c.lng).split('.')[1].length < 5);
    expect(coarse.length).toBeLessThan(5);
  });
});

describe('lista de cámaras', () => {
  it('no repite identificadores, numera en orden y usa la imagen grande de cada cámara', () => {
    expect(new Set(CAMERAS.map((c) => c.id)).size).toBe(CAMERAS.length);
    expect(CAMERAS.map((c) => c.index)).toEqual(CAMERAS.map((_, i) => i));
    for (const c of CAMERAS) {
      expect(c.url).toContain(`/styles/upload_fotograma_big/public/camara/${c.id}.jpg?itok=`);
    }
  });

  it('incluye las cámaras que el Ayuntamiento publica y que usan los ejes principales', () => {
    const ids = new Set(CAMERAS.map((c) => c.id));
    for (const id of ['C04F2', 'C06M3', 'C06M4', 'C14M2', 'C14M3', 'C18M3', 'C26F2', 'C26F3', 'C31F2', 'C37F4', 'C48M1', 'C48M2', 'C67M1']) {
      expect(ids.has(id), id).toBe(true);
    }
    // Every camera named by a preset route exists
    const missing = Object.values(PRESET_ROUTES).flatMap((p) => p.cameraIds).filter((id) => !ids.has(id));
    expect(missing).toEqual([]);
  });

  it('el recuento por zona sale de la lista', () => {
    expect(ZONES.reduce((sum, z) => sum + z.count, 0)).toBe(CAMERAS.length);
    expect(ZONES.every((z) => z.count > 0)).toBe(true);
  });
});

describe('cámaras de un cruce en el mapa', () => {
  it('se dibujan separadas alrededor del cruce, sin alejarse', () => {
    const positions = spreadSharedPositions(cameras);
    const atA = cameras.filter((c) => junctionOf(c.id) === 'C15').map((c) => positions.get(c.id)!);
    expect(new Set(atA.map((p) => p.join(','))).size).toBe(4);
    for (const [lat, lng] of atA) {
      const d = getDistanceMeters(lat, lng, ...JUNCTION_A);
      expect(d).toBeGreaterThan(10);
      expect(d).toBeLessThan(25);
    }
    // A camera alone at its point is not moved
    expect(positions.get('C99M1')).toEqual([38.36, -0.46]);
  });
});
