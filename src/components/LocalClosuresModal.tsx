import React from 'react';
import {
  X,
  AlertTriangle,
  Calendar,
  Clock,
  MapPin,
  Compass,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { ALICANTE_LOCAL_CLOSURES, LocalClosureAlert } from '../data/publicTransport';

interface LocalClosuresModalProps {
  onClose: () => void;
  onSelectClosureOnMap?: (closure: LocalClosureAlert) => void;
}

export const LocalClosuresModal: React.FC<LocalClosuresModalProps> = ({
  onClose,
  onSelectClosureOnMap,
}) => {
  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#0f172a] border-2 border-rose-500/60 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl relative text-slate-100 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500 text-rose-300 flex items-center justify-center font-bold text-lg shadow-md">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Cortes y Fiestas Locales de Alicante
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                  AVISOS MUNICIPALES
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Afecciones al tráfico por actos festeros, procesiones y obras
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

        {/* Closures List */}
        <div className="space-y-3">
          {ALICANTE_LOCAL_CLOSURES.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-rose-500/50 rounded-xl p-4 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold uppercase">
                      {item.festivityOrReason}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        item.severity === 'corte-total'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                      }`}
                    >
                      {item.severity === 'corte-total' ? 'Corte Total' : 'Corte Parcial'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1.5">{item.title}</h4>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>{item.location}</span>
                  </p>
                </div>
              </div>

              {/* Streets affected */}
              <div className="bg-slate-950/70 rounded-lg p-2.5 border border-slate-800/80 space-y-1 text-xs">
                <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block">
                  Calles Afectadas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {item.affectedStreets.map((st, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[11px] border border-slate-700"
                    >
                      {st}
                    </span>
                  ))}
                </div>
              </div>

              {/* Taxi detour advice */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5 text-xs text-emerald-200 flex items-start gap-2">
                <Compass className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-300 block mb-0.5">Desvío aconsejado para Taxis:</strong>
                  <span>{item.detourAdvice}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Horario / Vigencia:</span>
                <strong className="text-slate-200">{item.dateOrHours}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
