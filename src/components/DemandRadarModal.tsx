import React from 'react';
import {
  X,
  Train,
  Plane,
  Anchor,
  Clock,
  TrendingUp,
  MapPin,
  Navigation,
  ChevronRight,
  Sparkles,
  Users,
} from 'lucide-react';
import { ALICANTE_DEMAND_HUBS, DemandHub, ALICANTE_TAXI_STANDS, TaxiStand } from '../data/publicTransport';

interface DemandRadarModalProps {
  onClose: () => void;
  onSelectStandAsDestination: (stand: TaxiStand) => void;
}

export const DemandRadarModal: React.FC<DemandRadarModalProps> = ({
  onClose,
  onSelectStandAsDestination,
}) => {
  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#0f172a] border-2 border-sky-500/60 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl relative text-slate-100 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400 text-sky-300 flex items-center justify-center font-bold text-lg shadow-md">
              <TrendingUp className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Monitor de Demanda de Pasajeros
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold">
                  RADAR EN VIVO
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Puntos calientes de Alicante: Llegadas AVE, Aeropuerto y Cruceros
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info banner */}
        <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-3 text-xs text-sky-200 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Este radar ayuda a los taxistas a anticipar dónde se acumularán pasajeros en los próximos 15-45 minutos para acudir con antelación a las paradas con mayor rotación de clientes.
          </p>
        </div>

        {/* Demand Hubs List */}
        <div className="space-y-3">
          {ALICANTE_DEMAND_HUBS.map((hub) => {
            const stand = ALICANTE_TAXI_STANDS.find((s) => s.id === hub.targetStandId);

            return (
              <div
                key={hub.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-sky-500/50 rounded-xl p-4 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
                      {hub.category === 'tren' && <Train className="w-5 h-5" />}
                      {hub.category === 'aeropuerto' && <Plane className="w-5 h-5 text-amber-400" />}
                      {hub.category === 'puerto' && <Anchor className="w-5 h-5 text-cyan-400" />}
                      {hub.category === 'evento' && <Users className="w-5 h-5 text-purple-400" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{hub.name}</h4>
                      <p className="text-xs text-slate-300 mt-0.5">{hub.statusDescription}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase shrink-0 border ${
                      hub.demandLevel === 'alta'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    Demanda {hub.demandLevel}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>Ventana punta:</span>
                    <strong className="text-slate-200">{hub.peakWindow}</strong>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span>Próxima llegada:</span>
                    <strong className="text-amber-400 font-mono">en {hub.nextArrivalMinutes} min</strong>
                  </div>
                </div>

                {stand && (
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[11px] text-slate-400">
                      Parada:{' '}
                      <strong className="text-white">{stand.name}</strong> ({stand.capacity} plazas)
                    </div>

                    <button
                      onClick={() => {
                        onSelectStandAsDestination(stand);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Ir a esta parada</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
