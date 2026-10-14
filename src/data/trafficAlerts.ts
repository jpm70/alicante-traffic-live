export type AlertType = 'obra' | 'accidente' | 'corte' | 'retencion' | 'evento';
export type AlertSeverity = 'alta' | 'media' | 'baja';

export interface TrafficAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  street: string;
  zone: string;
  description: string;
  lat: number;
  lng: number;
  source: 'DGT' | 'Policía Local Alicante' | 'Movilidad Ayuntamiento Alicante';
  timestamp: string;
  durationEstimate?: string;
  delayMin: number;
  corridorKey?: 'litoral' | 'granvia' | 'viaparque' | 'centro' | 'elche';
}

export const INITIAL_ALICANTE_ALERTS: TrafficAlert[] = [
  {
    id: 'alt-01',
    type: 'obra',
    severity: 'alta',
    title: 'Obras de Reurbanización y Mejora de Pavimento',
    street: 'Avda. Ramón y Cajal · Canalejas',
    zone: 'Centro Ciudad / Litoral',
    description: 'Corte de carril derecho sentido Puerto. Tráfico desviado hacia Avda. Doctor Gadea. Precaución en horas punta.',
    lat: 38.3415,
    lng: -0.4855,
    source: 'Movilidad Ayuntamiento Alicante',
    timestamp: 'Hace 25 min',
    durationEstimate: 'Hasta 19:30',
    delayMin: 7,
    corridorKey: 'litoral',
  },
  {
    id: 'alt-02',
    type: 'corte',
    severity: 'alta',
    title: 'Trabajos de Red de Saneamiento y Zanja',
    street: 'C/ Pintor Xavier Soler (Rotonda CC Gran Vía)',
    zone: 'Gran Vía',
    description: 'Ocupación de calzada sentido Albufereta. Reducción a 1 solo carril habilitado. Retenciones intermitentes.',
    lat: 38.3665,
    lng: -0.4735,
    source: 'Policía Local Alicante',
    timestamp: 'Hace 40 min',
    durationEstimate: 'Hasta 18:00',
    delayMin: 6,
    corridorKey: 'granvia',
  },
  {
    id: 'alt-03',
    type: 'retencion',
    severity: 'media',
    title: 'Afluencia Densa en Enlace Autovía',
    street: 'Avda. de Dénia (Rotonda de la Paz · Acceso A-70)',
    zone: 'Avda. Denia',
    description: 'Densidad elevada de vehículos en incorporación sentido Valencia / Madrid. Circulación lenta.',
    lat: 38.3710,
    lng: -0.4560,
    source: 'DGT',
    timestamp: 'Hace 10 min',
    durationEstimate: 'Tiempo real',
    delayMin: 5,
    corridorKey: 'litoral',
  },
  {
    id: 'alt-04',
    type: 'accidente',
    severity: 'alta',
    title: 'Alcance entre dos turismos',
    street: 'Avda. Jaime I con Bulevar Teulada',
    zone: 'Vía Parque · Norte',
    description: 'Vehículos inmovilizados ocupando carril central. Asistencia de grúa y patrulla de Policía Local en el lugar.',
    lat: 38.3645,
    lng: -0.5015,
    source: 'Policía Local Alicante',
    timestamp: 'Hace 12 min',
    durationEstimate: 'Retirada inminente',
    delayMin: 8,
    corridorKey: 'viaparque',
  },
  {
    id: 'alt-05',
    type: 'obra',
    severity: 'baja',
    title: 'Pintado de Señalización Horizontal',
    street: 'Avda. de Elche (Cruce C/ México)',
    zone: 'Avda. Elche / Babel',
    description: 'Equipo móvil de señalización vial. Tráfico lento pero transitable en ambos sentidos.',
    lat: 38.3340,
    lng: -0.5030,
    source: 'Movilidad Ayuntamiento Alicante',
    timestamp: 'Hace 50 min',
    durationEstimate: 'Hasta 16:00',
    delayMin: 2,
    corridorKey: 'elche',
  },
  {
    id: 'alt-06',
    type: 'evento',
    severity: 'media',
    title: 'Montaje de Evento Cultural / Fira',
    street: 'Avda. Maisonnave · Plaza Calvo Sotelo',
    zone: 'Centro Ciudad',
    description: 'Prohibición temporal de carga y descarga y desvío puntual de líneas de autobús municipal.',
    lat: 38.3440,
    lng: -0.4880,
    source: 'Policía Local Alicante',
    timestamp: 'Hace 1 h',
    durationEstimate: 'Todo el día',
    delayMin: 3,
    corridorKey: 'centro',
  },
];
