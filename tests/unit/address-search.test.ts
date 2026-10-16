import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  StreetIndex,
  findHouseNumber,
  keyTokens,
  normalize,
  parseQuery,
  photonPlaces,
  searchLandmarks,
  searchStreets,
} from '../../src/services/addressSearch';
import { buildStreetIndex, municipalityName, OverpassElement } from '../../scripts/build-streets';

// Real entries of public/geo/streets.json (OpenStreetMap)
const INDEX: StreetIndex = {
  version: 1,
  generatedAt: '2026-10-16T00:00:00Z',
  municipalities: ['Alicante', 'San Vicente del Raspeig', 'San Juan de Alicante'],
  streets: [
    ['Avenida de Maisonnave', 'Avinguda de Maisonnave', [], 0, 38.34337, -0.49207, 14],
    ['Avenida Alfonso El Sabio', 'Avinguda Alfons el Savi', ['Avenida Alfonso X el Sabio', 'Avinguda Alfons X el Savi'], 0, 38.34726, -0.4874, 47],
    ['Calle Alfonso X el Sabio', 'Carrer Alfonso X el Sabio', [], 1, 38.39946, -0.52249, 2],
    ['Plaza de los Luceros', 'Plaça dels Estels', ['Plaça dels Cavalls', 'Plaza de los Caballos'], 0, 38.34573, -0.49047, 35],
    ['Paseo Mayor', 'Passeig Major', [], 0, 38.3, -0.5, 30],
    ['Calle Mayor', 'Carrer Major', [], 0, 38.344, -0.48, 10],
    ['Calle Mayor', 'Carrer Major', [], 2, 38.37, -0.43, 8],
    ['Calle San Vicente', 'Carrer de Sant Vicent', [], 0, 38.35088, -0.4848, 8],
    ['Carretera de San Vicente del Raspeig', 'Carretera de Sant Vicent del Raspeig', [], 0, 38.37, -0.5, 200],
    ['Avenida de Elche', "Avinguda d'Elx", ['Gran Vía'], 0, 38.32121, -0.51316, 413],
    ['Calle Gran Vía', 'Carrer de la Gran Via', ['Gran Vía'], 0, 38.36154, -0.49456, 14],
    ['Calle 2 de Mayo', 'Carrer 2 de Maig', [], 1, 38.39, -0.52, 2],
  ],
};

const labels = (q: string, limit = 3) => searchStreets(INDEX, q, limit).map((s) => `${s.label} · ${s.municipality}`);

describe('query parsing', () => {
  it('ignores accents, case and street types', () => {
    expect(normalize('Plaça dels Estels')).toBe('placa dels estels');
    expect(keyTokens('Avda. de Óscar Esplá')).toEqual(['oscar', 'espla']);
    expect(keyTokens('C/ Castaños')).toEqual(['castanos']);
    // Only a type: the words are kept
    expect(keyTokens('calle')).toEqual(['calle']);
  });

  it('takes a trailing number as the house number', () => {
    expect(parseQuery('avenida maisonnave 10')).toEqual({ tokens: ['maisonnave'], number: '10' });
    expect(parseQuery('Mayor 3B')).toEqual({ tokens: ['mayor'], number: '3b' });
    expect(parseQuery('2 de mayo')).toEqual({ tokens: ['2', 'mayo'], number: null });
    expect(parseQuery('10')).toEqual({ tokens: ['10'], number: null });
  });
});

describe('street search', () => {
  it('finds streets by their Spanish or Valencian name', () => {
    expect(labels('maisonnave')[0]).toBe('Avenida de Maisonnave · Alicante');
    expect(labels('avinguda de maisonnave')[0]).toBe('Avenida de Maisonnave · Alicante');
    expect(labels('alfons el savi')[0]).toBe('Avenida Alfonso El Sabio · Alicante');
    expect(labels('plaza luceros')).toEqual(['Plaza de los Luceros · Alicante']);
    expect(labels('placa estels')).toEqual(['Plaza de los Luceros · Alicante']);
  });

  it('matches while typing (word prefixes) and with aliases', () => {
    expect(labels('maison')[0]).toBe('Avenida de Maisonnave · Alicante');
    expect(labels('alfonso x')).toContain('Avenida Alfonso El Sabio · Alicante');
    expect(labels('m')).toEqual([]); // too short
  });

  it('ranks the whole name typed and the same kind of street first', () => {
    expect(labels('san vicente')[0]).toBe('Calle San Vicente · Alicante');
    expect(labels('calle mayor', 2)).toEqual(['Calle Mayor · Alicante', 'Calle Mayor · San Juan de Alicante']);
    expect(labels('paseo mayor')[0]).toBe('Paseo Mayor · Alicante');
    // "Gran Vía" is an alias of many streets: the street called so comes first
    expect(labels('gran via')[0]).toBe('Calle Gran Vía · Alicante');
  });

  it('shows the official name when it differs', () => {
    const [s] = searchStreets(INDEX, 'luceros');
    expect(s.detail).toBe('Alicante · Plaça dels Estels');
    expect(s.streetNames).toEqual(['Plaza de los Luceros', 'Plaça dels Estels', 'Plaça dels Cavalls', 'Plaza de los Caballos']);
  });

  it('searches the popular places too', () => {
    expect(searchLandmarks('luceros')[0].label).toBe('Plaza de los Luceros');
    expect(searchLandmarks('').length).toBeGreaterThan(10); // all of them before typing
  });
});

const feature = (props: Record<string, string>, lat: number, lng: number) => ({ geometry: { coordinates: [lng, lat] as [number, number] }, properties: props });

describe('places from Photon', () => {
  it('leaves out streets and public transport stops, and repeated places', () => {
    const places = photonPlaces([
      feature({ name: 'Maisonnave-Portugal', osm_key: 'highway', osm_value: 'bus_stop', city: 'Alacant / Alicante' }, 38.34, -0.49),
      feature({ name: 'Avinguda de Maisonnave', osm_key: 'highway', osm_value: 'tertiary', city: 'Alacant / Alicante' }, 38.34, -0.49),
      feature({ name: 'Luceros', osm_key: 'public_transport', osm_value: 'station', city: 'Alacant / Alicante' }, 38.34, -0.49),
      feature({ name: 'Hospital General Universitario de Alicante', osm_key: 'amenity', osm_value: 'hospital', osm_type: 'W', osm_id: '1', street: 'Carrer del Mestre Alonso', city: 'Alacant / Alicante' }, 38.36, -0.48),
      feature({ name: 'Hospital General Universitario de Alicante', osm_key: 'amenity', osm_value: 'hospital', osm_type: 'N', osm_id: '2', city: 'Alacant / Alicante' }, 38.36, -0.48),
    ]);
    expect(places).toEqual([
      expect.objectContaining({ kind: 'place', label: 'Hospital General Universitario de Alicante', detail: 'Carrer del Mestre Alonso, Alicante', lat: 38.36, lng: -0.48 }),
    ]);
  });
});

describe('house numbers', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('finds the number on the chosen street only', async () => {
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      urls.push(url);
      return new Response(JSON.stringify({
        features: [
          // Same number on another street that shares words: not it
          feature({ street: 'Carrer de Sant Vicent del Raspeig', housenumber: '20' }, 38.3874, -0.4924),
          feature({ street: 'Carrer de Sant Vicent', housenumber: '20' }, 38.3512, -0.4851),
        ],
      }));
    });
    const [street] = searchStreets(INDEX, 'san vicente 20');
    expect(await findHouseNumber(street, '20')).toEqual({ lat: 38.3512, lng: -0.4851 });
    // Biased towards the street, with its name and the number
    expect(decodeURIComponent(urls[0])).toContain('q=Calle San Vicente 20');
    expect(urls[0]).toContain('lat=38.35088');
  });

  it('returns null when the number is not mapped', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ features: [feature({ name: 'Avinguda de Maisonnave', type: 'street' }, 38.34, -0.49)] })));
    const [street] = searchStreets(INDEX, 'maisonnave');
    expect(await findHouseNumber(street, '10')).toBeNull();
  });
});

describe('street index build', () => {
  const way = (tags: Record<string, string>, lat: number, lon: number): OverpassElement => ({ type: 'way', tags: { highway: 'residential', ...tags }, center: { lat, lon } });

  it('groups the ways of a street per municipality, with its names', () => {
    const index = buildStreetIndex(
      [
        { type: 'relation', tags: { name: 'Alacant / Alicante' } },
        way({ name: 'Avinguda de Maisonnave', 'name:es': 'Avenida de Maisonnave', highway: 'tertiary' }, 38.343, -0.492),
        way({ name: 'Avinguda de Maisonnave', 'name:es': 'Avenida de Maisonnave', highway: 'tertiary' }, 38.344, -0.493),
        way({ name: 'Avinguda de Maisonnave', highway: 'tertiary' }, 38.36, -0.5), // far piece
        way({ name: 'Andén 1', highway: 'platform' }, 38.34, -0.49),
        way({ name: "Avinguda d'Elx", 'name:es': 'Avenida de Elche', alt_name: 'Gran Vía' }, 38.32, -0.51),
        { type: 'relation', tags: { name: 'el Campello' } },
        way({ name: 'Carrer Major', 'name:es': 'Calle Mayor', 'name:ca': 'Carrer Major' }, 38.43, -0.39),
      ],
      '2026-10-16T00:00:00Z'
    );
    expect(index.municipalities).toEqual(['Alicante', 'El Campello']);
    expect(index.streets).toEqual([
      ['Avenida de Elche', "Avinguda d'Elx", ['Gran Vía'], 0, 38.32, -0.51, 2],
      // Point: the way nearest to the middle of the street, not the far piece
      ['Avenida de Maisonnave', 'Avinguda de Maisonnave', [], 0, 38.344, -0.493, 9],
      ['Calle Mayor', 'Carrer Major', [], 1, 38.43, -0.39, 2],
    ]);
  });

  it('names municipalities in Spanish', () => {
    expect(municipalityName({ name: 'Alacant / Alicante' })).toBe('Alicante');
    expect(municipalityName({ name: 'Mutxamel' })).toBe('Mutxamel');
    expect(municipalityName({ name: "Sant Joan d'Alacant", 'name:es': 'San Juan de Alicante' })).toBe('San Juan de Alicante');
  });
});
