export type AlertType = 'obra' | 'accidente' | 'corte' | 'retencion' | 'evento';
export type AlertSeverity = 'alta' | 'media' | 'baja';

// Traffic incident as served by /api/traffic-alerts.
// The server reads the official DGT DATEX II feed (incidencias activas en vías
// interurbanas: A-7, A-31, A-70, N-332, CV-...) and keeps those around Alicante.
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
  source: string;
  timestamp: string;
  // ISO date of the last update reported by the source
  updatedAt?: string;
  durationEstimate?: string;
  delayMin: number;
}

export interface TrafficAlertsResponse {
  success: boolean;
  alerts: TrafficAlert[];
  source: string;
  updatedAt: string;
  error?: string;
}
