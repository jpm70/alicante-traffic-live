import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import { CalculatedRoute } from '../services/routing';
import {
  calculateHistoricalTraffic,
  HistoricalComparison,
} from '../services/historicalTraffic';
import { TrafficHistory, DayType, dayTypeOf, routeHistory } from '../services/trafficHistory';
import {
  TrendingDown,
  TrendingUp,
  Clock,
  Calendar,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Gauge,
} from 'lucide-react';

interface HistoricalTrafficChartProps {
  route: CalculatedRoute;
  // Real history of the DGT detectors (data/history.json)
  history?: TrafficHistory | null;
}

// ---------------------------------------------------------------------------
// Estimate for routes without detectors (city streets): time-of-day pattern,
// clearly labelled as an estimate
// ---------------------------------------------------------------------------
const EstimatedTrafficChart: React.FC<{ route: CalculatedRoute }> = ({ route }) => {
  const [dayType, setDayType] = useState<'laborable' | 'finDeSemana'>('laborable');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const comparison: HistoricalComparison = useMemo(() => {
    return calculateHistoricalTraffic(route, dayType);
  }, [route, dayType]);

  // Current hour matching string e.g. "14:00"
  const currentHourLabel = `${comparison.currentHourNumber.toString().padStart(2, '0')}:00`;

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xl space-y-3">
      {/* Header and Toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Tiempo por hora</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 normal-case tracking-normal">
                ESTIMACIÓN
              </span>
            </h4>
            <p className="text-[10px] text-slate-400">
              Sin detectores DGT en esta ruta: patrón horario estimado, no medido
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Day Type Toggle */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px] flex items-center">
            <button
              onClick={() => setDayType('laborable')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                dayType === 'laborable'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Laborable
            </button>
            <button
              onClick={() => setDayType('finDeSemana')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                dayType === 'finDeSemana'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Finde
            </button>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isExpanded ? 'Plegar gráfica' : 'Desplegar gráfica'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Comparison Score Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
        {/* Metric 1: Real-time duration */}
        <div>
          <span className="block text-[10px] uppercase font-mono text-slate-400">Estimado ahora</span>
          <span className="text-base font-black font-mono text-cyan-400">
            {comparison.tiempoActual} <span className="text-[10px] font-normal text-slate-400">min</span>
          </span>
        </div>

        {/* Metric 2: Historical average at current hour */}
        <div>
          <span className="block text-[10px] uppercase font-mono text-slate-400">Patrón a esta hora</span>
          <span className="text-base font-black font-mono text-slate-200">
            {comparison.tiempoHistoricoActual} <span className="text-[10px] font-normal text-slate-400">min</span>
          </span>
        </div>

        {/* Metric 3: Delta Comparison */}
        <div>
          <span className="block text-[10px] uppercase font-mono text-slate-400">Diferencia</span>
          <div className="flex items-center justify-center gap-1">
            {comparison.estadoComparativo === 'mejor' ? (
              <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-0.5">
                <TrendingDown className="w-3 h-3" />
                {comparison.diferenciaMin} min ({comparison.porcentajeDiferencia}%)
              </span>
            ) : comparison.estadoComparativo === 'peor' ? (
              <span className="text-xs font-bold text-rose-400 font-mono flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />
                +{comparison.diferenciaMin} min (+{comparison.porcentajeDiferencia}%)
              </span>
            ) : (
              <span className="text-xs font-bold text-amber-400 font-mono">En la media</span>
            )}
          </div>
        </div>

        {/* Metric 4: Optimal hour */}
        <div>
          <span className="block text-[10px] uppercase font-mono text-slate-400">Mejor Hora</span>
          <span className="text-xs font-bold text-emerald-400 font-mono">
            {comparison.mejorHora.hour} ({comparison.mejorHora.tiempo}m)
          </span>
        </div>
      </div>

      {/* Comparative Insight Text */}
      <div className="text-[11px] p-2 rounded bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-slate-300">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span>
            {comparison.estadoComparativo === 'mejor'
              ? `Según la estimación, ${Math.abs(comparison.diferenciaMin)} min menos que el patrón de esta franja.`
              : comparison.estadoComparativo === 'peor'
              ? `Según la estimación, +${comparison.diferenciaMin} min frente al patrón de esta franja.`
              : 'Según la estimación, en línea con el patrón habitual.'}
          </span>
        </div>
      </div>

      {/* Recharts Line Chart */}
      {isExpanded && (
        <div className="h-52 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={comparison.chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              
              <XAxis
                dataKey="hour"
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
              />

              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
                unit="m"
                domain={[0, 'dataMax + 4']}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#0f172a] border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                        <div className="font-bold text-white font-mono flex items-center justify-between gap-3 border-b border-slate-800 pb-1">
                          <span>Hora: {data.hour}</span>
                          <span className="text-[10px] text-cyan-400 px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-800/40">
                            Congestión {data.nivelCongestion}
                          </span>
                        </div>
                        <div className="text-slate-300 flex items-center justify-between gap-3">
                          <span className="text-slate-400">Patrón estimado:</span>
                          <span className="font-mono font-bold text-cyan-400">
                            {data.tiempoHistorico} min
                          </span>
                        </div>
                        {data.tiempoActual !== undefined && (
                          <div className="text-emerald-300 flex items-center justify-between gap-3 pt-1 border-t border-slate-800">
                            <span className="font-bold">Estimado ahora:</span>
                            <span className="font-mono font-black text-emerald-400">
                              {data.tiempoActual} min
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Reference line marking the current hour */}
              <ReferenceLine
                x={currentHourLabel}
                stroke="#38bdf8"
                strokeDasharray="4 4"
                label={{
                  value: 'AHORA',
                  position: 'top',
                  fill: '#38bdf8',
                  fontSize: 10,
                  fontWeight: 'bold',
                }}
              />

              {/* Real-time Current Travel Dot */}
              <ReferenceDot
                x={currentHourLabel}
                y={comparison.tiempoActual}
                r={6}
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth={2}
              />

              {/* Historical Average Line */}
              <Line
                type="monotone"
                dataKey="tiempoHistorico"
                stroke="#06b6d4"
                strokeWidth={2.5}
                dot={{ r: 2.5, fill: '#06b6d4' }}
                activeDot={{ r: 5, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
                name="Promedio Histórico"
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Legend and Footnote */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
                <span>Patrón estimado</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white/60 inline-block" />
                <span className="text-emerald-400 font-bold">Estimado ahora</span>
              </span>
            </div>
            <span>Estimación, no datos medidos</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Real history: typical speed measured by the DGT detectors vs now
// ---------------------------------------------------------------------------
const RealTrafficChart: React.FC<{ route: CalculatedRoute; history: TrafficHistory }> = ({ route, history }) => {
  const [dayType, setDayType] = useState<DayType>(() => dayTypeOf(new Date()));
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const data = useMemo(() => routeHistory(route.liveStations, history, dayType), [route, history, dayType]);
  if (!data) return null;

  const nowHour = new Date().getHours();
  const label = (h: number) => `${String(h).padStart(2, '0')}:00`;
  const chartData = data.hours.map((p) => ({ hour: label(p.hour), typical: p.typical, samples: p.samples }));
  const withData = data.hours.filter((p) => p.typical !== null);
  const best = withData.length ? withData.reduce((a, b) => (b.typical! > a.typical! ? b : a)) : null;
  const worst = withData.length ? withData.reduce((a, b) => (b.typical! < a.typical! ? b : a)) : null;
  const diff = data.current !== null && data.typicalNow !== null ? data.current - data.typicalNow : null;
  const diffPct = diff !== null && data.typicalNow ? Math.round((diff / data.typicalNow) * 100) : null;
  const sinceLabel = new Date(data.since).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xl space-y-3" data-testid="real-history">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Gauge className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Velocidad real: habitual vs ahora</h4>
            <p className="text-[10px] text-slate-400 truncate">
              Detectores DGT en {data.roads.join(', ')} · {data.stations} punto{data.stations > 1 ? 's' : ''} de tu ruta · datos desde el {sinceLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px] flex items-center">
            {(['weekday', 'weekend'] as DayType[]).map((d) => (
              <button
                key={d}
                onClick={() => setDayType(d)}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${dayType === d ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                {d === 'weekday' ? 'Laborable' : 'Finde'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isExpanded ? 'Plegar gráfica' : 'Desplegar gráfica'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
        <div>
          <span className="block text-[10px] uppercase font-mono text-slate-400">Ahora (medida)</span>
          <span className="text-base font-black font-mono text-cyan-400">
            {data.current ?? '–'} <span className="text-[10px] font-normal text-slate-400">km/h</span>
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase font-mono text-slate-400">Habitual a esta hora</span>
          <span className="text-base font-black font-mono text-slate-200">
            {data.typicalNow ?? '–'} <span className="text-[10px] font-normal text-slate-400">km/h</span>
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase font-mono text-slate-400">Diferencia</span>
          {diff === null ? (
            <span className="text-xs font-bold text-slate-400 font-mono">Sin referencia aún</span>
          ) : diff >= -3 ? (
            <span className="text-xs font-bold text-emerald-400 font-mono flex items-center justify-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              {diff >= 0 ? '+' : ''}{diff} km/h ({diffPct}%)
            </span>
          ) : (
            <span className="text-xs font-bold text-rose-400 font-mono flex items-center justify-center gap-0.5">
              <TrendingDown className="w-3 h-3" />
              {diff} km/h ({diffPct}%)
            </span>
          )}
        </div>
        <div>
          <span className="block text-[10px] uppercase font-mono text-slate-400">Hora más lenta</span>
          <span className="text-xs font-bold text-amber-400 font-mono">
            {worst ? `${label(worst.hour)} (${worst.typical} km/h)` : '–'}
          </span>
        </div>
      </div>

      {withData.length < 6 && (
        <div className="text-[11px] p-2 rounded bg-slate-900/80 border border-slate-800/80 text-slate-300 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span>
            Recopilando histórico: {withData.length} de 24 horas con datos ({dayType === 'weekday' ? 'laborables' : 'fines de semana'}).
            Se completa con unas 24 h de medidas y gana precisión con las semanas.
          </span>
        </div>
      )}

      {isExpanded && (
        <div className="h-52 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} interval={3} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} unit="" domain={[0, 130]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const p = payload[0].payload;
                  return (
                    <div className="bg-[#0f172a] border border-slate-700 p-2 rounded-lg shadow-xl text-xs">
                      <div className="font-bold text-white font-mono">{p.hour}</div>
                      <div className="text-cyan-300">
                        {p.typical !== null ? `${p.typical} km/h habitual` : 'Sin datos todavía'}
                      </div>
                      <div className="text-[10px] text-slate-400">{p.samples} medidas</div>
                    </div>
                  );
                }}
              />
              <ReferenceLine x={label(nowHour)} stroke="#38bdf8" strokeDasharray="4 4" label={{ value: 'AHORA', position: 'top', fill: '#38bdf8', fontSize: 10, fontWeight: 'bold' }} />
              {data.current !== null && (
                <ReferenceDot x={label(nowHour)} y={data.current} r={6} fill="#10b981" stroke="#ffffff" strokeWidth={2} />
              )}
              <Line type="monotone" dataKey="typical" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 2, fill: '#06b6d4' }} connectNulls={false} name="Velocidad habitual" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-cyan-400 inline-block" />Habitual (km/h)</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white/60 inline-block" /><span className="text-emerald-400 font-bold">Ahora</span></span>
            </div>
            <span>{best ? `Más fluida: ${label(best.hour)}` : 'Medido por la DGT'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Real history when the route has DGT detectors with recorded data; otherwise the
// time-of-day estimate, labelled as such.
export const HistoricalTrafficChart: React.FC<HistoricalTrafficChartProps> = ({ route, history = null }) => {
  const hasReal = useMemo(() => Boolean(routeHistory(route.liveStations, history, 'weekday') || routeHistory(route.liveStations, history, 'weekend')), [route, history]);
  return hasReal && history ? <RealTrafficChart route={route} history={history} /> : <EstimatedTrafficChart route={route} />;
};
