import { CalculatedRoute } from './routing';

export interface HourlyTrafficData {
  hour: string;
  hourNumber: number;
  tiempoHistorico: number; // Historical average minutes
  tiempoActual?: number;   // Current observed time (only for current hour)
  nivelCongestion: 'Bajo' | 'Medio' | 'Alto' | 'Muy Alto';
}

export interface HistoricalComparison {
  routeId: string;
  routeName: string;
  currentHourNumber: number;
  currentHourLabel: string;
  tiempoActual: number;
  tiempoHistoricoActual: number;
  diferenciaMin: number;
  porcentajeDiferencia: number;
  estadoComparativo: 'mejor' | 'igual' | 'peor';
  mejorHora: { hour: string; tiempo: number };
  peorHora: { hour: string; tiempo: number };
  chartData: HourlyTrafficData[];
  dayType: 'laborable' | 'finDeSemana';
}

/**
 * Calculates historical traffic curve for a route based on its corridor, base time, and traffic delays
 */
export function calculateHistoricalTraffic(
  route: CalculatedRoute,
  dayType: 'laborable' | 'finDeSemana' = 'laborable'
): HistoricalComparison {
  const now = new Date();
  const currentHourNumber = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentHourLabel = `${currentHourNumber.toString().padStart(2, '0')}:${currentMinutes < 30 ? '00' : '30'}`;

  const base = route.baseMinutes;
  const isCorridorHeavy = route.id.includes('granvia') || route.id.includes('direct');

  // Multipliers for hour of day in Alicante (laborable vs finDeSemana)
  const chartData: HourlyTrafficData[] = [];

  const hoursToDisplay = [
    6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23
  ];

  let minTime = Infinity;
  let minHour = '11:00';
  let maxTime = -Infinity;
  let maxHour = '08:00';

  hoursToDisplay.forEach((h) => {
    let factor = 1.0;

    if (dayType === 'laborable') {
      // Morning rush: 8:00 - 9:00 (entradas colegios/trabajos)
      if (h === 8) factor = isCorridorHeavy ? 1.65 : 1.50;
      else if (h === 9) factor = isCorridorHeavy ? 1.45 : 1.35;
      else if (h === 7) factor = 1.15;
      // Midday rush: 13:30 - 15:00 (comidas / colegios)
      else if (h === 13) factor = isCorridorHeavy ? 1.30 : 1.25;
      else if (h === 14) factor = isCorridorHeavy ? 1.55 : 1.40;
      else if (h === 15) factor = 1.25;
      // Evening rush: 19:00 - 20:30 (salida comercios / oficinas)
      else if (h === 19) factor = isCorridorHeavy ? 1.60 : 1.45;
      else if (h === 20) factor = isCorridorHeavy ? 1.45 : 1.35;
      // Quiet valley hours
      else if (h >= 10 && h <= 12) factor = 1.05;
      else if (h >= 16 && h <= 18) factor = 1.15;
      else if (h >= 21) factor = 0.95;
      else factor = 0.90;
    } else {
      // Weekend: lighter morning, peak around 13:00-14:30 (playa / aperitivo) and 21:00-22:30 (cenas)
      if (h >= 13 && h <= 14) factor = 1.40;
      else if (h >= 20 && h <= 21) factor = 1.35;
      else if (h <= 10) factor = 0.85;
      else factor = 1.05;
    }

    const calculatedHistMinutes = Math.max(3, Math.round(base * factor));
    const hourLabel = `${h.toString().padStart(2, '0')}:00`;

    if (calculatedHistMinutes < minTime) {
      minTime = calculatedHistMinutes;
      minHour = hourLabel;
    }
    if (calculatedHistMinutes > maxTime) {
      maxTime = calculatedHistMinutes;
      maxHour = hourLabel;
    }

    let nivelCongestion: 'Bajo' | 'Medio' | 'Alto' | 'Muy Alto' = 'Bajo';
    if (factor >= 1.5) nivelCongestion = 'Muy Alto';
    else if (factor >= 1.3) nivelCongestion = 'Alto';
    else if (factor >= 1.1) nivelCongestion = 'Medio';

    const item: HourlyTrafficData = {
      hour: hourLabel,
      hourNumber: h,
      tiempoHistorico: calculatedHistMinutes,
      nivelCongestion,
    };

    // Mark current observed real-time travel duration for the active hour
    if (h === currentHourNumber) {
      item.tiempoActual = route.totalMinutes;
    }

    chartData.push(item);
  });

  const matchingHist = chartData.find((d) => d.hourNumber === currentHourNumber) || chartData[0];
  const tiempoHistoricoActual = matchingHist.tiempoHistorico;
  const tiempoActual = route.totalMinutes;
  const diferenciaMin = tiempoActual - tiempoHistoricoActual;
  const porcentajeDiferencia = Math.round(
    ((tiempoActual - tiempoHistoricoActual) / tiempoHistoricoActual) * 100
  );

  let estadoComparativo: 'mejor' | 'igual' | 'peor' = 'igual';
  if (diferenciaMin <= -2) estadoComparativo = 'mejor';
  else if (diferenciaMin >= 2) estadoComparativo = 'peor';

  return {
    routeId: route.id,
    routeName: route.name,
    currentHourNumber,
    currentHourLabel,
    tiempoActual,
    tiempoHistoricoActual,
    diferenciaMin,
    porcentajeDiferencia,
    estadoComparativo,
    mejorHora: { hour: minHour, tiempo: minTime },
    peorHora: { hour: maxHour, tiempo: maxTime },
    chartData,
    dayType,
  };
}
