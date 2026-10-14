import React, { useState, useMemo } from 'react';
import { TrafficAlert, AlertType } from '../data/trafficAlerts';
import { CalculatedRoute } from '../services/routing';
import {
  AlertTriangle,
  Cone,
  Ban,
  Clock,
  Car,
  MapPin,
  RefreshCw,
  ChevronRight,
  ShieldAlert,
  Flame,
  Calendar,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

interface TrafficAlertsProps {
  alerts: TrafficAlert[];
  isLoading: boolean;
  onRefreshAlerts: () => void;
  onSelectAlert: (alert: TrafficAlert) => void;
  selectedAlertId: string | null;
  activeRoute: CalculatedRoute | null;
}

export const TrafficAlerts: React.FC<TrafficAlertsProps> = ({
  alerts,
  isLoading,
  onRefreshAlerts,
  onSelectAlert,
  selectedAlertId,
  activeRoute,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'route' | AlertType>('all');

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    if (activeFilter === 'route') {
      if (!activeRoute) return [];
      // Alerts matching route corridor or nearby
      return alerts.filter((a) => {
        if (!a.corridorKey) return false;
        if (activeRoute.id.includes(a.corridorKey)) return true;
        // Check street matching
        const st = a.street.toLowerCase();
        if (activeRoute.name.toLowerCase().includes('litoral') && (st.includes('ramón y cajal') || st.includes('dénia') || st.includes('canalejas'))) return true;
        if (activeRoute.name.toLowerCase().includes('gran vía') && (st.includes('soler') || st.includes('gran vía'))) return true;
        if (activeRoute.name.toLowerCase().includes('parque') && (st.includes('jaime i') || st.includes('teulada'))) return true;
        return false;
      });
    }

    if (activeFilter === 'all') return alerts;
    return alerts.filter((a) => a.type === activeFilter);
  }, [alerts, activeFilter, activeRoute]);

  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case 'obra':
        return <Cone className="w-3.5 h-3.5 text-amber-400" />;
      case 'accidente':
        return <Flame className="w-3.5 h-3.5 text-rose-400" />;
      case 'corte':
        return <Ban className="w-3.5 h-3.5 text-red-400" />;
      case 'retencion':
        return <Clock className="w-3.5 h-3.5 text-orange-400" />;
      case 'evento':
        return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />;
    }
  };

  const getAlertBadgeColor = (type: AlertType) => {
    switch (type) {
      case 'obra':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'accidente':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'corte':
        return 'bg-red-500/15 text-red-300 border-red-500/30';
      case 'retencion':
        return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
      case 'evento':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      default:
        return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'alta':
        return (
          <span className="text-[10px] font-bold uppercase font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40">
            Crítica
          </span>
        );
      case 'media':
        return (
          <span className="text-[10px] font-bold uppercase font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
            Moderada
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold uppercase font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/40">
            Leve
          </span>
        );
    }
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 shadow-xl space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Alertas e Incidencias en Alicante</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {alerts.length}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">DGT · Policía Local · Movilidad Urbana</p>
          </div>
        </div>

        <button
          onClick={onRefreshAlerts}
          disabled={isLoading}
          className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-800 transition-colors disabled:opacity-50"
          title="Actualizar incidencias ahora"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap font-medium transition-colors ${
            activeFilter === 'all'
              ? 'bg-amber-500 text-slate-950 font-bold shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          Todas ({alerts.length})
        </button>

        <button
          onClick={() => setActiveFilter('route')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap font-medium transition-colors ${
            activeFilter === 'route'
              ? 'bg-amber-500 text-slate-950 font-bold shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          En mi Ruta
        </button>

        <button
          onClick={() => setActiveFilter('obra')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap font-medium transition-colors ${
            activeFilter === 'obra'
              ? 'bg-amber-500 text-slate-950 font-bold shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          🚧 Obras
        </button>

        <button
          onClick={() => setActiveFilter('accidente')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap font-medium transition-colors ${
            activeFilter === 'accidente'
              ? 'bg-amber-500 text-slate-950 font-bold shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          💥 Accidentes
        </button>

        <button
          onClick={() => setActiveFilter('corte')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap font-medium transition-colors ${
            activeFilter === 'corte'
              ? 'bg-amber-500 text-slate-950 font-bold shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          ⛔ Cortes
        </button>

        <button
          onClick={() => setActiveFilter('retencion')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap font-medium transition-colors ${
            activeFilter === 'retencion'
              ? 'bg-amber-500 text-slate-950 font-bold shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          ⏳ Retenciones
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
        {filteredAlerts.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-xs bg-slate-900/60 rounded-lg border border-slate-800/80">
            {activeFilter === 'route'
              ? '¡Tu ruta seleccionada está despejada de incidencias mayores!'
              : 'No hay alertas activas en esta categoría.'}
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isSelected = selectedAlertId === alert.id;

            return (
              <div
                key={alert.id}
                onClick={() => onSelectAlert(alert)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-800/90 border-amber-500/80 shadow-md ring-1 ring-amber-500/40'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border ${getAlertBadgeColor(
                        alert.type
                      )}`}
                    >
                      {getAlertIcon(alert.type)}
                      <span className="capitalize">{alert.type}</span>
                    </span>
                    {getSeverityBadge(alert.severity)}
                  </div>

                  <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.2 rounded">
                    +{alert.delayMin} min
                  </span>
                </div>

                <div className="mt-1.5">
                  <h4 className="text-xs font-bold text-white tracking-tight leading-snug">
                    {alert.title}
                  </h4>
                  <p className="text-[11px] font-medium text-cyan-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{alert.street}</span>
                  </p>
                </div>

                <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed bg-slate-950/40 p-2 rounded border border-slate-800/60">
                  {alert.description}
                </p>

                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>{alert.source} · {alert.timestamp}</span>
                  <span className="text-cyan-400 hover:underline flex items-center gap-0.5">
                    <span>Localizar</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
