import React, { useState } from 'react';
import { CAMERA_UNAVAILABLE_IMG } from '../data/placeholders';
import { TrafficCamera } from '../data/cameras';
import { X, Maximize2, Minimize2, Move, Video, RefreshCw } from 'lucide-react';

interface FloatingCameraPipProps {
  camera: TrafficCamera | null;
  onClose: () => void;
  onExpand: (camera: TrafficCamera) => void;
  cacheBuster: number;
}

export const FloatingCameraPip: React.FC<FloatingCameraPipProps> = ({
  camera,
  onClose,
  onExpand,
  cacheBuster,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [localBuster, setLocalBuster] = useState<number>(cacheBuster);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  if (!camera) return null;

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setLocalBuster(Date.now());
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <aside
      aria-label="Cámara flotante en vivo"
      className="fixed bottom-4 right-4 z-[99999] shadow-2xl rounded-2xl overflow-hidden border border-cyan-500/50 bg-slate-950/95 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-200 transition-all text-slate-100"
      style={{
        width: isMinimized ? '220px' : '300px',
      }}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 cursor-default select-none">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-wider truncate">
            {camera.id}: {camera.name}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Refresh Image */}
          <button
            onClick={handleManualRefresh}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Refrescar imagen"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Minimize / Expand */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isMinimized ? 'Expandir miniatura' : 'Minimizar'}
          >
            {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>

          {/* Fullscreen Lightbox */}
          <button
            onClick={() => onExpand(camera)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Abrir a pantalla completa"
          >
            <Maximize2 className="w-3 h-3 text-cyan-400" />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Cerrar ventana flotante"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Camera Live Feed Body */}
      {!isMinimized && (
        <div className="relative aspect-[4/3] bg-black group overflow-hidden">
          <img
            src={`${camera.url}&t=${localBuster}`}
            alt={camera.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                CAMERA_UNAVAILABLE_IMG;
            }}
          />

          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-mono text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            EN VIVO
          </div>

          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-2">
            <p className="text-[11px] font-bold text-white truncate leading-tight">
              {camera.name}
            </p>
            <p className="text-[10px] text-slate-300 font-mono">
              Zona {camera.zona} · ID {camera.id}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
};
