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
import {
  TrendingDown,
  TrendingUp,
  Clock,
  Calendar,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface HistoricalTrafficChartProps {
  route: CalculatedRoute;
}

export const HistoricalTrafficChart: React.FC<HistoricalTrafficChartProps> = ({ route }) => {
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
              <span>Tiempo Histórico Promedio vs Actual</span>
            </h4>
            <p className="text-[10px] text-slate-400">
              Corredor {route.name} · Serie temporal 24h en Alicante
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
          <span className="block text-[10px] uppercase font-mono text-slate-400">Ahora en Vivo</span>
          <span className="text-base font-black font-mono text-cyan-400">
            {comparison.tiempoActual} <span className="text-[10px] font-normal text-slate-400">min</span>
          </span>
        </div>

        {/* Metric 2: Historical average at current hour */}
        <div>
          <span className="block text-[10px] uppercase font-mono text-slate-400">Media a esta hora</span>
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
              ? `Circulación fluida: Hoy viajas ${Math.abs(comparison.diferenciaMin)} minutos más rápido que la media histórica para esta franja horaria.`
              : comparison.estadoComparativo === 'peor'
              ? `Tráfico más denso de lo habitual (+${comparison.diferenciaMin} min frente a la media histórica).`
              : 'Tráfico estándar en línea con los patrones habituales de Alicante.'}
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
                          <span className="text-slate-400">Media Histórica:</span>
                          <span className="font-mono font-bold text-cyan-400">
                            {data.tiempoHistorico} min
                          </span>
                        </div>
                        {data.tiempoActual !== undefined && (
                          <div className="text-emerald-300 flex items-center justify-between gap-3 pt-1 border-t border-slate-800">
                            <span className="font-bold">Tiempo Real Ahora:</span>
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
                <span>Media Histórica</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white/60 inline-block" />
                <span className="text-emerald-400 font-bold">Tiempo Actual</span>
              </span>
            </div>
            <span>Basado en patrones de tráfico de Alicante</span>
          </div>
        </div>
      )}
    </div>
  );
};
