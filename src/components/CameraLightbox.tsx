import React, { useEffect } from 'react';
import { TrafficCamera } from '../data/cameras';
import { X, ExternalLink, MapPin, Video, CheckSquare, Square, ChevronLeft, ChevronRight, Radio } from 'lucide-react';

interface CameraLightboxProps {
  camera: TrafficCamera | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  cacheBuster: number;
  onPinPip?: (camera: TrafficCamera) => void;
}

export const CameraLightbox: React.FC<CameraLightboxProps> = ({
  camera,
  onClose,
  onPrev,
  onNext,
  isSelected,
  onToggleSelect,
  cacheBuster,
  onPinPip,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
      if (e.key === 'ArrowRight' && onNext) onNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrev, onNext]);

  if (!camera) return null;

  const timestamp = new Date().toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full bg-[#0f172a] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-900 px-4 sm:px-6 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-mono font-bold text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded">
              {camera.id}
            </span>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">{camera.name}</h3>
              <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-cyan-400" />
                <span>{camera.zona}</span>
                <span>·</span>
                <span>{camera.lat.toFixed(4)}, {camera.lng.toFixed(4)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Pin to Floating Window PiP */}
            {onPinPip && (
              <button
                onClick={() => {
                  onPinPip(camera);
                  onClose();
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-colors"
                title="Fijar esta cámara en una ventana flotante pequeña visible en toda la aplicación"
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Ventana Flotante</span>
              </button>
            )}

            <button
              onClick={() => onToggleSelect(camera.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                isSelected
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
              }`}
            >
              {isSelected ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Quitar de Mural</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5" />
                  <span>Añadir a Mural</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Large Image */}
        <div className="relative bg-black flex items-center justify-center min-h-[320px] max-h-[70vh] overflow-hidden">
          <img
            src={`${camera.url}&t=${cacheBuster}`}
            alt={camera.name}
            referrerPolicy="no-referrer"
            className="w-full h-auto max-h-[70vh] object-contain select-none"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.opacity = '0.2';
            }}
          />

          {/* Navigation Prev / Next Buttons */}
          {onPrev && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 hover:bg-slate-900 border border-slate-700 text-white transition-colors"
              title="Cámara anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {onNext && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 hover:bg-slate-900 border border-slate-700 text-white transition-colors"
              title="Cámara siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Live Overlay Badge */}
          <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm border border-emerald-500/40 px-2.5 py-1 rounded text-xs font-mono text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>FOTOGRAMA EN VIVO · {timestamp}</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-900 px-4 sm:px-6 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2 font-mono">
            <span>Fuente: Ayuntamiento de Alicante</span>
            <span>·</span>
            <span>Refresco cada 15s</span>
          </div>

          <a
            href={camera.url}
            target="_blank"
            rel="noreferrer"
            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
          >
            <span>Ver fuente original</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
