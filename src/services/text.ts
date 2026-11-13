// Texts shown to the user for the internal status values, and Spanish plurals.
// The internal values have no accents ("critico", "retencion"); never show them as they are.

export type RouteStatus = 'fluido' | 'moderado' | 'concurrido' | 'critico';
export type CameraStatus = 'fluido' | 'denso' | 'retencion';

export const ROUTE_STATUS_LABEL: Record<RouteStatus, string> = {
  fluido: 'Fluido',
  moderado: 'Moderado',
  concurrido: 'Concurrido',
  critico: 'Crítico',
};

// Tailwind classes for the text and for the dot of each route status
export const ROUTE_STATUS_STYLE: Record<RouteStatus, { text: string; dot: string }> = {
  fluido: { text: 'text-emerald-400', dot: 'bg-emerald-400' },
  moderado: { text: 'text-amber-400', dot: 'bg-amber-400' },
  concurrido: { text: 'text-orange-400', dot: 'bg-orange-400' },
  critico: { text: 'text-rose-400', dot: 'bg-rose-500' },
};

const CAMERA_STATUS_LABEL: Record<CameraStatus, string> = {
  fluido: 'fluido',
  denso: 'denso',
  retencion: 'con retención',
};

// "fluido", "denso" or "con retención", to follow the word "Tráfico"
export function cameraStatusLabel(status: string): string {
  return CAMERA_STATUS_LABEL[status as CameraStatus] ?? status;
}

export const CAMERA_STATUS_TEXT_CLASS: Record<CameraStatus, string> = {
  fluido: 'text-emerald-400',
  denso: 'text-amber-400',
  retencion: 'text-rose-400',
};

// "1 cámara", "6 cámaras"
export function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
