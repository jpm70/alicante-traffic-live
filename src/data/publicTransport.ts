/**
 * Public Transport & Taxi Data for Alicante
 * Official taxi stands, municipal fare regulations, bus-taxi lanes,
 * passenger demand hubs (AVE/Airport), and local street closures.
 */

export interface TaxiStand {
  id: string;
  name: string;
  address: string;
  zone: string;
  lat: number;
  lng: number;
  capacity: number; // number of taxi parking spots
  phone: string;
  isMajorHub: boolean;
  notes?: string;
}

export const ALICANTE_TAXI_STANDS: TaxiStand[] = [
  {
    id: 'stand-ave',
    name: 'Estación de Tren AVE (Alacant Terminal)',
    address: 'Calle Salamanca / Av. Estación, 1',
    zone: 'Centro / Renfe',
    lat: 38.3444,
    lng: -0.4952,
    capacity: 22,
    phone: '965 25 25 11',
    isMajorHub: true,
    notes: 'Punto de máxima demanda coincidiendo con llegadas de trenes AVE.',
  },
  {
    id: 'stand-aeropuerto',
    name: 'Aeropuerto Alicante-Elche Miguel Hernández',
    address: 'Terminal T1 (Planta 0 - Llegadas)',
    zone: 'Aeropuerto',
    lat: 38.2822,
    lng: -0.5582,
    capacity: 45,
    phone: '965 25 25 11',
    isMajorHub: true,
    notes: 'Parada oficial en dársena de llegadas. Aplica suplemento oficial de aeropuerto.',
  },
  {
    id: 'stand-luceros',
    name: 'Plaza de los Luceros (Centro)',
    address: 'Plaza de los Luceros, 11 (frente a TRAM)',
    zone: 'Centro',
    lat: 38.3458,
    lng: -0.4893,
    capacity: 10,
    phone: '965 10 10 10',
    isMajorHub: true,
    notes: 'Nodo central neurálgico con conexión directa a TRAM y zona comercial.',
  },
  {
    id: 'stand-mercado',
    name: 'Mercado Central de Alicante',
    address: 'Av. Alfonso X El Sabio / Calderón de la Barca',
    zone: 'Centro',
    lat: 38.3478,
    lng: -0.4854,
    capacity: 8,
    phone: '965 25 25 11',
    isMajorHub: false,
    notes: 'Muy concurrida en horario matinal de compras.',
  },
  {
    id: 'stand-hospital-general',
    name: 'Hospital General Dr. Balmis',
    address: 'Calle Pintor Baeza, 12 (Urgencias / Entrada Principal)',
    zone: 'Norte',
    lat: 38.3628,
    lng: -0.4835,
    capacity: 12,
    phone: '965 10 10 10',
    isMajorHub: true,
    notes: 'Servicio prioritario de pacientes y acompañantes las 24 horas.',
  },
  {
    id: 'stand-puerto',
    name: 'Puerto de Alicante / Muelle de Levante',
    address: 'Paseo del Puerto (Plaza del Mar / Hotel Meliá)',
    zone: 'Puerto',
    lat: 38.3422,
    lng: -0.4795,
    capacity: 14,
    phone: '965 25 25 11',
    isMajorHub: true,
    notes: 'Alta afluencia con cruceristas, restaurantes y ocio nocturno.',
  },
  {
    id: 'stand-estacion-buses',
    name: 'Estación Central de Autobuses',
    address: 'Muelle de Poniente, s/n',
    zone: 'Benalúa / Puerto',
    lat: 38.3375,
    lng: -0.4930,
    capacity: 10,
    phone: '965 10 10 10',
    isMajorHub: true,
    notes: 'Conexión intermodal con autobuses nacionales e internacionales.',
  },
  {
    id: 'stand-gabriel-miro',
    name: 'Plaza de Gabriel Miró',
    address: 'Calle San Fernando / Correos',
    zone: 'Casco Tradicional',
    lat: 38.3435,
    lng: -0.4848,
    capacity: 6,
    phone: '965 25 25 11',
    isMajorHub: false,
    notes: 'Acceso directo a la zona peatonal y hostelera del centro.',
  },
  {
    id: 'stand-playa-san-juan',
    name: 'Playa de San Juan (Costa Blanca)',
    address: 'Av. Costa Blanca / Glorieta de la Democracia',
    zone: 'Playa San Juan',
    lat: 38.3745,
    lng: -0.4230,
    capacity: 12,
    phone: '965 25 25 11',
    isMajorHub: true,
    notes: 'Principal parada del litoral con gran demanda en temporada estival y fines de semana.',
  },
  {
    id: 'stand-hospital-san-juan',
    name: 'Hospital Universitario de Sant Joan',
    address: 'Carretera Valencia - Alicante, s/n',
    zone: 'Sant Joan / Campus',
    lat: 38.3912,
    lng: -0.4372,
    capacity: 10,
    phone: '965 10 10 10',
    isMajorHub: false,
    notes: 'Atención a usuarios del área metropolitana y campus de Medicina UMH.',
  },
  {
    id: 'stand-san-blas',
    name: 'San Blas (Plaza de San Blas)',
    address: 'Calle Pintor Gisbert / Baltasar Carrasco',
    zone: 'San Blas',
    lat: 38.3468,
    lng: -0.5015,
    capacity: 6,
    phone: '965 25 25 11',
    isMajorHub: false,
  },
  {
    id: 'stand-carolinas',
    name: 'Carolinas (Plaza Pío XII)',
    address: 'Calle San Mateo / Pío XII',
    zone: 'Carolinas',
    lat: 38.3565,
    lng: -0.4830,
    capacity: 6,
    phone: '965 10 10 10',
    isMajorHub: false,
  },
];

// Official Alicante Taxi Fare Structure
export interface TaxiFareEstimate {
  rateType: 'tarifa-1' | 'tarifa-2';
  rateLabel: string;
  flagDrop: number;
  distanceCost: number;
  timeDelayCost: number;
  supplementsCost: number;
  appliedSupplements: { name: string; amount: number }[];
  minFare: number;
  estimatedTotal: number;
  estimatedRange: [number, number];
  isNightOrHoliday: boolean;
}

export function isNightOrHolidayAlicante(date = new Date()): boolean {
  const hours = date.getHours();
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = day === 0 || day === 6;
  const isNight = hours >= 22 || hours < 6;
  return isWeekend || isNight;
}

export function calculateAlicanteTaxiFare(
  distanceKm: number,
  delayMinutes: number,
  originName: string,
  destinationName: string,
  forceRate?: 'tarifa-1' | 'tarifa-2'
): TaxiFareEstimate {
  const isNightHoliday = forceRate
    ? forceRate === 'tarifa-2'
    : isNightOrHolidayAlicante();

  // Official Municipal Rates (Área de Prestación Conjunta de Alicante)
  // Tarifa 1: Diurna laborable Lun-Vie 06:00 - 22:00
  // Tarifa 2: Nocturna 22:00-06:00, sábados, domingos y festivos
  const flagDrop = isNightHoliday ? 2.55 : 2.15;
  const pricePerKm = isNightHoliday ? 1.34 : 1.12;
  const pricePerHourWait = isNightHoliday ? 26.80 : 22.50;
  const pricePerMinWait = pricePerHourWait / 60;
  const minFare = isNightHoliday ? 5.60 : 4.50;

  const distanceCost = Math.round(distanceKm * pricePerKm * 100) / 100;
  const timeDelayCost = Math.round(delayMinutes * pricePerMinWait * 100) / 100;

  // Check Official Supplements
  const appliedSupplements: { name: string; amount: number }[] = [];
  const text = (originName + ' ' + destinationName).toLowerCase();

  if (text.includes('aeropuerto') || text.includes('altet') || text.includes('elche')) {
    appliedSupplements.push({ name: 'Suplemento Aeropuerto Alicante-Elche', amount: 4.50 });
  }

  if (text.includes('renfe') || text.includes('ave') || text.includes('terminal') || text.includes('salamanca')) {
    appliedSupplements.push({ name: 'Suplemento Estación AVE / Renfe', amount: 1.80 });
  }

  if (text.includes('puerto') || text.includes('muelle') || text.includes('crucero') || text.includes('ferry')) {
    appliedSupplements.push({ name: 'Suplemento Estación Marítima / Puerto', amount: 1.80 });
  }

  const supplementsCost = appliedSupplements.reduce((sum, item) => sum + item.amount, 0);

  const rawTotal = flagDrop + distanceCost + timeDelayCost + supplementsCost;
  const estimatedTotal = Math.max(minFare + supplementsCost, Math.round(rawTotal * 100) / 100);

  // Range +/- 8% to account for slight traffic variances
  const rangeMin = Math.round(Math.max(minFare, estimatedTotal * 0.93) * 10) / 10;
  const rangeMax = Math.round((estimatedTotal * 1.08) * 10) / 10;

  return {
    rateType: isNightHoliday ? 'tarifa-2' : 'tarifa-1',
    rateLabel: isNightHoliday ? 'Tarifa 2 (Nocturna / Festivos)' : 'Tarifa 1 (Diurna Laborable)',
    flagDrop,
    distanceCost,
    timeDelayCost,
    supplementsCost,
    appliedSupplements,
    minFare,
    estimatedTotal,
    estimatedRange: [rangeMin, rangeMax],
    isNightOrHoliday: isNightHoliday,
  };
}

// Corridors in Alicante with Bus-Taxi Reserved Lanes
export const BUS_TAXI_CORRIDORS = [
  'Avenida Maisonnave',
  'Avenida Alfonso X El Sabio',
  'Rambla de Méndez Núñez',
  'Avenida Aguilera',
  'Avenida de Denia (tramo urbano)',
  'Avenida Doctor Gadea',
  'Avenida Federico Soto',
  'Gran Vía (Pintor Baeza / Periodista Rodolfo Salazar)',
];

// Normalised (lowercase, no accents) fragments of the street names above, matched
// against the real street names returned by the routing engine.
export const BUS_TAXI_STREET_KEYWORDS = [
  'maisonnave',
  'alfonso x',
  'mendez nunez',
  'aguilera',
  'avenida de denia',
  'avinguda de denia',
  'doctor gadea',
  'federico soto',
  'pintor baeza',
  'rodolfo salazar',
];

// Critical Demand Hubs in Alicante (Passenger surge radar)
export interface DemandHub {
  id: string;
  name: string;
  category: 'tren' | 'aeropuerto' | 'puerto' | 'evento';
  demandLevel: 'alta' | 'media' | 'moderada';
  statusDescription: string;
  peakWindow: string;
  targetStandId: string;
  nextArrivalMinutes: number;
}

export const ALICANTE_DEMAND_HUBS: DemandHub[] = [
  {
    id: 'hub-ave-1',
    name: 'Llegadas Trenes AVE / Euromed (Alacant Terminal)',
    category: 'tren',
    demandLevel: 'alta',
    statusDescription: 'AVE procedente de Madrid-Puerta de Atocha y Euromed desde Barcelona.',
    peakWindow: '18:15 - 19:30 h',
    targetStandId: 'stand-ave',
    nextArrivalMinutes: 8,
  },
  {
    id: 'hub-airport-1',
    name: 'Oleada Vuelos Internacionales (Aeropuerto Alicante-Elche)',
    category: 'aeropuerto',
    demandLevel: 'alta',
    statusDescription: 'Banco de llegadas de Reino Unido (Londres, Manchester) y Países Bajos.',
    peakWindow: '17:40 - 20:00 h',
    targetStandId: 'stand-aeropuerto',
    nextArrivalMinutes: 14,
  },
  {
    id: 'hub-port-1',
    name: 'Terminal de Pasajeros y Cruceros (Muelle de Levante)',
    category: 'puerto',
    demandLevel: 'media',
    statusDescription: 'Desembarque de crucero turístico y salidas ferry a Tabarca.',
    peakWindow: '09:00 - 13:00 h y 18:00 - 20:30 h',
    targetStandId: 'stand-puerto',
    nextArrivalMinutes: 25,
  },
  {
    id: 'hub-adda-1',
    name: 'Auditorio de la Diputación de Alicante (ADDA)',
    category: 'evento',
    demandLevel: 'media',
    statusDescription: 'Concierto sinfónico y evento cultural con salida de espectadores.',
    peakWindow: '21:00 - 22:30 h',
    targetStandId: 'stand-luceros',
    nextArrivalMinutes: 40,
  },
];

// Local Street Closures and Fiestas in Alicante
export interface LocalClosureAlert {
  id: string;
  title: string;
  festivityOrReason: string;
  location: string;
  affectedStreets: string[];
  detourAdvice: string;
  dateOrHours: string;
  severity: 'corte-total' | 'corte-parcial' | 'desvio-recomendado';
  lat: number;
  lng: number;
}

export const ALICANTE_LOCAL_CLOSURES: LocalClosureAlert[] = [
  {
    id: 'corte-luceros-mascleta',
    title: 'Disparo de Mascletà y Fiestas de Hogueras',
    festivityOrReason: 'Hogueras de San Juan / Actos Oficiales',
    location: 'Plaza de los Luceros y Avenidas Adyacentes',
    affectedStreets: [
      'Plaza de los Luceros',
      'Av. Federico Soto',
      'Av. General Marvá',
      'Av. de la Estación (tramo final)',
    ],
    detourAdvice: 'Circular por Gran Vía (Pintor Baeza) o Vía Parque para evitar el centro neurálgico.',
    dateOrHours: 'Cierre de tráfico de 12:00 a 15:30 h en días de disparo.',
    severity: 'corte-total',
    lat: 38.3458,
    lng: -0.4893,
  },
  {
    id: 'corte-semana-santa',
    title: 'Itinerario de Procesiones y Paso de Cofradías',
    festivityOrReason: 'Semana Santa y Actos Religiosos Tradicionales',
    location: 'Rambla Méndez Núñez y Casco Tradicional',
    affectedStreets: [
      'Rambla de Méndez Núñez',
      'Calle San Fernando',
      'Calle Mayor / Concatedral San Nicolás',
      'Plaza del Ayuntamiento',
    ],
    detourAdvice: 'Utilizar túnel de la Explanada hacia Av. de Denia o circunvalar por Gran Vía.',
    dateOrHours: 'Franjas de tarde y noche (19:00 a 00:30 h).',
    severity: 'corte-total',
    lat: 38.3448,
    lng: -0.4822,
  },
  {
    id: 'corte-obras-ramon-cajal',
    title: 'Obras de Peatonalización y Reordenación de Carriles',
    festivityOrReason: 'Plan de Movilidad Sostenible y Ejes Ambientales',
    location: 'Av. Ramón y Cajal / Paseo Canalejas',
    affectedStreets: ['Avenida Ramón y Cajal (reducción a 1 carril solo bus-taxi)'],
    detourAdvice: 'El carril bus-taxi está habilitado con paso preferente para taxistas.',
    dateOrHours: 'Lunes a Viernes de 08:00 a 19:00 h.',
    severity: 'corte-parcial',
    lat: 38.3418,
    lng: -0.4862,
  },
  {
    id: 'corte-santa-faz',
    title: 'Romería de la Santa Faz (Peregrina)',
    festivityOrReason: 'Fiesta Local Tradicional de Alicante',
    location: 'Carretera N-332 y accesos al Caserío de Santa Faz',
    affectedStreets: [
      'N-332 (Alicante - Sant Joan)',
      'Acceso Monasterio Santa Faz',
      'Av. Dénia (tramo salida)',
    ],
    detourAdvice: 'Obligatorio circular por Autovía A-70 o Vía Parque para traslados a Sant Joan y El Campello.',
    dateOrHours: 'Jornada festiva completa.',
    severity: 'corte-total',
    lat: 38.3880,
    lng: -0.4430,
  },
  {
    id: 'corte-mercadillo-teulada',
    title: 'Mercadillo Tradicional Municipal de Teulada',
    festivityOrReason: 'Mercado Ambulante Semanal',
    location: 'Calle Teulada (Campoamor / Rico Pérez)',
    affectedStreets: ['Calle Teulada', 'Calle Campo de Mirra'],
    detourAdvice: 'Desviar por Av. Novelda o Calle Conde de Lumiares.',
    dateOrHours: 'Jueves y Sábados de 06:30 a 15:00 h.',
    severity: 'corte-parcial',
    lat: 38.3582,
    lng: -0.4935,
  },
];
