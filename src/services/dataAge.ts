// Age of the DGT data files and HTML escaping for the texts drawn on the map.
//
// The data files are refreshed by a scheduled GitHub workflow. GitHub runs it far less
// often than its cron asks for (every few hours in practice) and stops it altogether
// after 60 days without activity in the repository, so the app must never present an
// old file as current: it shows how old the data is and ignores measured speeds that
// no longer describe the road.

// Measured speeds older than this are not applied to the route time
export const LIVE_SPEED_MAX_AGE_MIN = 45;
// Incidents older than this are still listed (roadworks last for days) with a warning
export const ALERTS_STALE_AFTER_MIN = 90;

// Minutes since an ISO date; null when the date is missing or not valid
export function ageMinutes(iso: string | null | undefined, now: number = Date.now()): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((now - t) / 60000));
}

export function isOlderThan(iso: string | null | undefined, maxMinutes: number, now: number = Date.now()): boolean {
  const age = ageMinutes(iso, now);
  return age !== null && age > maxMinutes;
}

// "hace 12 min", "hace 5 h", "hace 3 días"
export function describeAge(minutes: number): string {
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  if (minutes < 48 * 60) return `hace ${Math.round(minutes / 60)} h`;
  return `hace ${Math.round(minutes / 1440)} días`;
}

// Time of the day, with the date when it is not today: "17:44" or "12 nov, 17:44"
export function formatUpdatedAt(iso: string, now: number = Date.now()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === new Date(now).toDateString()) return time;
  return `${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}, ${time}`;
}

// Leaflet tooltips and popups take HTML: every text that does not come from the app's own
// code (place names from a shared link or from the search, DGT texts) goes through here.
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
