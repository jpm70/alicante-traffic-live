export type AlertType = 'obra' | 'accidente' | 'corte' | 'retencion' | 'evento';
export type AlertSeverity = 'alta' | 'media' | 'baja';

// Traffic incident from data/alerts.json, generated every 15 minutes by the GitHub
// Pages workflow from the official DGT DATEX II feed (incidencias activas en vías
// interurbanas: A-7, A-31, A-70, N-332, CV-...) around Alicante.
// See scripts/update-dgt-alerts.ts.
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
  // ISO date when the incident is expected to end, if known
  endsAt?: string;
  durationEstimate?: string;
  delayMin: number;
}

// Relative "Hace 12 min" and "Hasta las 14:30" texts, computed in the user's browser
// and time zone (the data file is generated on a GitHub server in UTC).
export function withDisplayTimes(alert: TrafficAlert, now = Date.now()): TrafficAlert {
  let timestamp = 'Activa';
  const updated = alert.updatedAt ? Date.parse(alert.updatedAt) : NaN;
  if (!Number.isNaN(updated)) {
    const mins = Math.round((now - updated) / 60000);
    if (mins < 1) timestamp = 'Hace un momento';
    else if (mins < 60) timestamp = `Hace ${mins} min`;
    else if (mins < 48 * 60) timestamp = `Hace ${Math.round(mins / 60)} h`;
    else timestamp = `Desde ${new Date(updated).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  let durationEstimate = alert.durationEstimate;
  const ends = alert.endsAt ? Date.parse(alert.endsAt) : NaN;
  if (!Number.isNaN(ends)) {
    durationEstimate =
      new Date(ends).toDateString() === new Date(now).toDateString()
        ? `Hasta las ${new Date(ends).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
        : `Hasta el ${new Date(ends).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  return { ...alert, timestamp, durationEstimate };
}

export interface TrafficAlertsResponse {
  success: boolean;
  alerts: TrafficAlert[];
  source: string;
  updatedAt: string;
  error?: string;
}
