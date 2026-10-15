import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CAMERA_UNAVAILABLE_IMG } from '../data/placeholders';
import { RouteScene, SceneTelemetry, CameraMode, isWebGLAvailable } from '../three/RouteScene';
import { CalculatedRoute, RoutePoint } from '../services/routing';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Video,
  Compass,
  Gauge,
  Clock,
  Radio,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Car,
  Maximize2,
  Minimize2,
} from 'lucide-react';

import { StreetViewTourView } from './StreetViewTourView';

interface RouteTourModalProps {
  route: CalculatedRoute;
  origin: RoutePoint & { name: string };
  destination: RoutePoint & { name: string };
  onClose: () => void;
  cacheBuster: number;
  initialTab?: 'streetview' | 'flythrough' | 'cameras';
}

type CameraViewMode = CameraMode;

export const RouteTourModal: React.FC<RouteTourModalProps> = ({
  route,
  origin,
  destination,
  onClose,
  cacheBuster,
  initialTab = 'streetview',
}) => {
  // Main Tab: 'streetview' (Option 1), 'flythrough' (Option 2), or 'cameras' (Option 3)
  const [activeTab, setActiveTab] = useState<'streetview' | 'flythrough' | 'cameras'>(initialTab);

  // Fullscreen state
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isFullscreen]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && modalContainerRef.current) {
      modalContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={modalContainerRef}
      className="fixed inset-0 z-[99999] flex flex-col bg-[#0b0f19] overflow-hidden"
    >
      <div className="relative w-full h-full bg-[#0b0f19] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2 sm:px-4 sm:py-3 bg-[#0f172a]/95 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1 basis-56">
            <div className="hidden sm:block p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex-shrink-0">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
                  Tour de Ruta: {route.name}
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
                  {route.distanceKm} km · {route.totalMinutes} min
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {origin.name} ➔ {destination.name}
              </p>
            </div>
          </div>

          {/* Tab Switcher & Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
            {/* 3-Tab Switcher: Opción 1, Opción 2, Opción 3 */}
            <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setActiveTab('streetview')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'streetview'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Opción 1: Recorrido panorámico de tipo Street View sincronizado con los puntos del trayecto"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">1. Street View</span>
                <span className="sm:hidden">Street View</span>
              </button>
              <button
                onClick={() => setActiveTab('flythrough')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'flythrough'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Opción 2: Vuelo 3D con Three.js sobre la carretera"
              >
                <Compass className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">2. Vuelo 3D</span>
                <span className="sm:hidden">3D</span>
              </button>
              <button
                onClick={() => setActiveTab('cameras')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'cameras'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Opción 3: Tour secuencial por cámaras de tráfico en directo"
              >
                <Video className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">3. Cámaras ({route.cameras.length})</span>
                <span className="sm:hidden">Cámaras</span>
              </button>
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              title="Cerrar tour (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body: Option 1, Option 2, Option 3 */}
        <div className="flex-1 relative overflow-hidden">
          {activeTab === 'streetview' && (
            <StreetViewTourView
              route={route}
              origin={origin}
              destination={destination}
              cacheBuster={cacheBuster}
            />
          )}
          {activeTab === 'flythrough' && (
            <Flythrough3DView route={route} cacheBuster={cacheBuster} />
          )}
          {activeTab === 'cameras' && (
            <LiveCamerasTourView route={route} cacheBuster={cacheBuster} />
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// SUB-VIEW 1: FLYTHROUGH 3D VIEW (shared Three.js engine, night theme)
// ---------------------------------------------------------------------------
interface Flythrough3DViewProps {
  route: CalculatedRoute;
  cacheBuster: number;
}

const BEARING_LABELS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
const bearingLabel = (deg: number) => BEARING_LABELS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

const SPEED_OPTIONS = [0.5, 1, 2, 4];
const BASE_TIME_COMPRESSION = 10;

const Flythrough3DView: React.FC<Flythrough3DViewProps> = ({ route, cacheBuster }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<RouteScene | null>(null);

  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('chase');
  const [showLiveCamPip, setShowLiveCamPip] = useState<boolean>(false);
  const [telemetry, setTelemetry] = useState<SceneTelemetry | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);

  const cameraModeRef = useRef(cameraMode);
  cameraModeRef.current = cameraMode;
  const speedRef = useRef(speedMultiplier);
  speedRef.current = speedMultiplier;

  // One engine (and one WebGL context) per route for the whole life of the view
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    if (!isWebGLAvailable()) {
      setEngineError('Este navegador o dispositivo no tiene WebGL activado, necesario para la vista 3D.');
      return;
    }
    let engine: RouteScene;
    try {
      engine = new RouteScene(container, route, {
        theme: 'night',
        cameraMode: cameraModeRef.current,
        timeCompression: BASE_TIME_COMPRESSION,
        onTelemetry: setTelemetry,
      });
    } catch (err) {
      console.error('3D engine error:', err);
      setEngineError('No se pudo iniciar la vista 3D en este dispositivo.');
      return;
    }
    engine.setSpeedMultiplier(speedRef.current);
    engineRef.current = engine;
    setEngineError(null);
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [route]);

  useEffect(() => {
    engineRef.current?.setCameraMode(cameraMode);
  }, [cameraMode]);

  useEffect(() => {
    engineRef.current?.setSpeedMultiplier(speedMultiplier);
  }, [speedMultiplier]);

  const totalMeters = telemetry?.totalMeters || route.distanceKm * 1000;
  const progress = telemetry ? telemetry.distanceMeters / Math.max(1, totalMeters) : 0;
  const isPlaying = telemetry?.playing ?? true;
  const coveredKm = Math.round(((telemetry?.distanceMeters || 0) / 1000) * 10) / 10;
  const totalKm = Math.round((totalMeters / 1000) * 10) / 10;
  const nearestCamera = telemetry?.nearestCamera || null;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    engineRef.current?.seek(parseFloat(e.target.value) * totalMeters);
  };

  const handleReset = () => {
    engineRef.current?.seek(0);
    engineRef.current?.setPlaying(true);
  };

  if (engineError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-6 text-center bg-slate-950">
        <AlertTriangle className="w-8 h-8 text-amber-400" />
        <p className="text-sm text-slate-200 max-w-md">{engineError}</p>
        <p className="text-xs text-slate-400 max-w-md">Puedes seguir la ruta con la pestaña de cámaras o con el navegador GPS.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="flex-1 w-full min-h-0 relative" />

      {/* OVERLAY: HUD & Telemetry (Top-Left) */}
      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 pointer-events-none flex flex-col gap-1.5 z-10 max-w-[calc(100%-1rem)]">
        <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 rounded-xl px-3 py-2 shadow-xl flex items-center gap-3 sm:gap-4 text-white">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="text-xl font-black font-mono text-cyan-400 leading-none">
                {telemetry?.speedKmH ?? 0} <span className="text-[10px] text-slate-400 font-normal">km/h</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Velocidad sim.</div>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-base font-bold font-mono text-emerald-400 leading-none">
                {bearingLabel(telemetry?.bearingDeg ?? 0)}{' '}
                <span className="text-[11px] text-slate-400 font-normal">({telemetry?.bearingDeg ?? 0}°)</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Rumbo</div>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-800 hidden sm:block" />
          <div className="hidden sm:block">
            <div className="text-base font-bold font-mono text-slate-200 leading-none">
              {coveredKm} <span className="text-[10px] text-slate-400 font-normal">/ {totalKm} km</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Recorrido</div>
          </div>
        </div>
        {telemetry?.buildingsStatus === 'loading' && (
          <span className="self-start text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-slate-300">
            Cargando edificios de OpenStreetMap…
          </span>
        )}
        {route.isApproximate && (
          <span className="self-start text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/90 border border-amber-600/60 text-amber-200">
            Trazado aproximado: sin datos del servidor de rutas
          </span>
        )}
      </div>

      {/* OVERLAY: live camera near this stretch (Top-Right) */}
      {nearestCamera && !showLiveCamPip && (
        <button
          onClick={() => setShowLiveCamPip(true)}
          className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-emerald-500/50 text-slate-200 hover:text-white text-xs font-semibold shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          title="Ver imagen en vivo de la cámara próxima en este tramo"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono text-emerald-400 font-bold truncate max-w-[120px] sm:max-w-[160px]">
            {nearestCamera.name}
          </span>
          <span className="text-[10px] text-slate-400">({nearestCamera.distanceMeters} m)</span>
        </button>
      )}

      {nearestCamera && showLiveCamPip && (
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 w-56 sm:w-72 bg-slate-900/95 backdrop-blur-md border border-emerald-500/60 rounded-xl p-2.5 shadow-2xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Cámara en este tramo
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-slate-400">{nearestCamera.distanceMeters} m</span>
              <button
                onClick={() => setShowLiveCamPip(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded hover:bg-slate-800 transition-colors"
                title="Cerrar vista de cámara"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
            <img
              src={`${nearestCamera.url}&t=${cacheBuster}`}
              alt={nearestCamera.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = CAMERA_UNAVAILABLE_IMG;
              }}
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-1.5">
              <p className="text-[11px] font-bold text-white truncate leading-tight">{nearestCamera.name}</p>
              <p className="text-[9px] text-slate-300 font-mono">
                Tráfico {nearestCamera.status} (estimado) · {nearestCamera.zona}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY: Camera Mode Buttons */}
      <div className="absolute right-2 sm:right-3 bottom-[7.5rem] sm:bottom-24 z-10 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1.5 rounded-xl shadow-xl">
        {([
          { mode: 'cockpit', icon: <Car className="w-4 h-4" />, label: 'Conductor', title: 'Vista en primera persona' },
          { mode: 'chase', icon: <Radio className="w-4 h-4" />, label: 'Dron', title: 'Vista de persecución' },
          { mode: 'aerial', icon: <Eye className="w-4 h-4" />, label: 'Aérea', title: 'Vista aérea' },
        ] as const).map((b) => (
          <button
            key={b.mode}
            onClick={() => setCameraMode(b.mode)}
            className={`px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              cameraMode === b.mode ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title={b.title}
          >
            {b.icon}
            <span className="hidden sm:inline">{b.label}</span>
          </button>
        ))}
      </div>

      <div className="absolute left-2 bottom-[7.5rem] sm:bottom-24 z-10 text-[9px] text-slate-400/80 font-mono pointer-events-none">
        Mapa © Esri · Edificios © OpenStreetMap
      </div>

      {/* BOTTOM CONTROLLER BAR: Playback, Scrubber & Speed Selector */}
      <div className="bg-[#0f172a]/95 backdrop-blur-md border-t border-slate-800 px-3 py-2 sm:px-5 flex flex-col gap-2 z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-400 w-10 text-right">{Math.round(progress * 100)}%</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={progress}
            onChange={handleSeek}
            aria-label="Posición en la ruta"
            className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <span className="text-[11px] font-mono text-slate-400 w-20 text-right">
            {coveredKm} / {totalKm} km
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => engineRef.current?.setPlaying(!isPlaying)}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pausar' : telemetry?.finished ? 'Repetir' : 'Reproducir'}</span>
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
              title="Reiniciar desde el origen"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reiniciar</span>
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
            <span className="text-[10px] text-slate-400 uppercase font-mono px-1" title="Cámara rápida: segundos simulados por segundo real">
              Tiempo
            </span>
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeedMultiplier(s)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-colors ${
                  speedMultiplier === s ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                ×{s * BASE_TIME_COMPRESSION}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// SUB-VIEW 2: LIVE CAMERAS SEQUENTIAL ROUTE TOUR (Option 3)
// ---------------------------------------------------------------------------
interface LiveCamerasTourViewProps {
  route: CalculatedRoute;
  cacheBuster: number;
}

const LiveCamerasTourViewProps: React.FC<LiveCamerasTourViewProps> = ({
  route,
  cacheBuster,
}) => {
  const cameras = route.cameras;
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(4); // seconds per camera
  const [imageError, setImageError] = useState<boolean>(false);
  const [localBuster, setLocalBuster] = useState<number>(cacheBuster);

  // Auto-play interval
  useEffect(() => {
    if (!isAutoPlay || cameras.length <= 1) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCurrentIndex((idx) => (idx + 1) % cameras.length);
          setImageError(false);
          return 4; // reset countdown to 4s
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoPlay, cameras.length]);

  // Arrow Keys Navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsAutoPlay((a) => !a);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [cameras.length]);

  const goToNext = () => {
    setCurrentIndex((idx) => (idx + 1) % cameras.length);
    setCountdown(4);
    setImageError(false);
  };

  const goToPrev = () => {
    setCurrentIndex((idx) => (idx - 1 + cameras.length) % cameras.length);
    setCountdown(4);
    setImageError(false);
  };

  if (cameras.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-950">
        <Video className="w-12 h-12 text-slate-600 mb-3" />
        <h4 className="text-base font-bold text-slate-200">Sin cámaras en este tramo específico</h4>
        <p className="text-xs text-slate-400 max-w-md mt-1 mb-4">
          Esta variante de ruta circula por vías secundarias o accesos sin cámaras de control del
          Ayuntamiento de Alicante. Puedes disfrutar del <strong>Vuelo 3D</strong> para visualizar el
          trazado tridimensional o explorar la ruta principal.
        </p>
      </div>
    );
  }

  const activeCam = cameras[currentIndex] || cameras[0];
  const progressPercent = ((currentIndex + 1) / cameras.length) * 100;

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* Top Sequence Progress Tracker */}
      <div className="bg-[#0f172a] border-b border-slate-800 px-4 py-2 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
            Punto {currentIndex + 1} de {cameras.length}
          </span>
          <span className="text-xs text-slate-300 font-semibold truncate hidden sm:inline">
            {activeCam.name}
          </span>
        </div>

        {/* Auto-play status and countdown */}
        <div className="flex items-center gap-2">
          {isAutoPlay && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Siguiente en {countdown}s</span>
            </div>
          )}

          <button
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              isAutoPlay
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            {isAutoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isAutoPlay ? 'Pausar Avance' : 'Avance Automático'}</span>
          </button>
        </div>
      </div>

      {/* Main Split Body: Camera Video Frame + Traffic Details */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-3 overflow-hidden min-h-0">
        {/* Left 2 Cols: High-Res Camera Viewport */}
        <div className="flex-[3] min-h-0 lg:col-span-2 relative bg-black flex items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800">
          <img
            src={
              imageError
                ? CAMERA_UNAVAILABLE_IMG
                : `${activeCam.url}&t=${localBuster}`
            }
            alt={activeCam.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-contain max-h-[550px]"
          />

          {/* Live Watermark Overlay */}
          <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md border border-slate-800 px-2.5 py-1 rounded-md flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider">
              CÁMARA EN VIVO · {activeCam.id}
            </span>
          </div>

          {/* Force Refresh Button */}
          <button
            onClick={() => setLocalBuster(Date.now())}
            className="absolute top-3 right-3 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 p-1.5 rounded-lg text-slate-300 hover:text-white transition-colors"
            title="Recargar imagen en vivo"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Stepper Buttons Overlay on Image */}
          <button
            onClick={goToPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/70 hover:bg-slate-900 text-white border border-slate-700/80 backdrop-blur-md shadow-lg transition-transform active:scale-95"
            title="Cámara anterior (←)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/70 hover:bg-slate-900 text-white border border-slate-700/80 backdrop-blur-md shadow-lg transition-transform active:scale-95"
            title="Cámara siguiente (→)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Right 1 Col: Detailed Traffic Inspection Panel */}
        <div className="flex-[2] min-h-0 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto bg-[#0b0f19] space-y-4">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block mb-1">
                Tramo {currentIndex + 1} del itinerario
              </span>
              <h3 className="text-lg font-bold text-white tracking-tight">{activeCam.name}</h3>
              <p className="text-xs text-slate-400">Zona municipal: {activeCam.zona}</p>
            </div>

            {/* Status Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Condición en este punto:</span>
                <span
                  className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                    activeCam.status === 'fluido'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : activeCam.status === 'denso'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-red-500/20 text-red-300 border border-red-500/40'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeCam.status === 'fluido'
                        ? 'bg-emerald-400'
                        : activeCam.status === 'denso'
                        ? 'bg-amber-400'
                        : 'bg-red-400'
                    }`}
                  />
                  {activeCam.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center pt-1 border-t border-slate-800/80">
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Velocidad</span>
                  <span className="text-sm font-bold font-mono text-cyan-400">
                    {activeCam.speedKmH} km/h
                  </span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Retardo estimado</span>
                  <span className="text-sm font-bold font-mono text-slate-200">
                    {activeCam.delayContributionMin > 0 ? `+${activeCam.delayContributionMin} min` : '0 min'}
                  </span>
                </div>
              </div>
            </div>

            {/* Practical Advice for this Section */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300 space-y-1.5">
              <span className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                Consejo para este tramo:
              </span>
              <p className="text-[11px] leading-relaxed text-slate-300">
                {activeCam.status === 'fluido'
                  ? 'Tramo con flujo continuo. Mantén distancia reglamentaria para aprovechar las fases en verde de la onda semafórica.'
                  : activeCam.status === 'denso'
                  ? 'Incorporaciones lentas. Sitúate en el carril interior antes de la rotonda y anticípate a frenadas en cruces.'
                  : 'Retención visible. Se recomienda aminorar velocidad con antelación y prestar atención a vehículos detenidos.'}
              </p>
            </div>
          </div>

          {/* Stepper Navigation Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={goToPrev}
              className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>
            <button
              onClick={goToNext}
              className="flex-1 py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Thumbnail Strip (Quick Jump to any camera) */}
      <div className="bg-[#0f172a] border-t border-slate-800 p-2.5 flex items-center gap-2 overflow-x-auto flex-shrink-0">
        <span className="text-[10px] font-mono uppercase text-slate-400 px-2 flex-shrink-0">
          Secuencia ({cameras.length}):
        </span>
        {cameras.map((c, i) => (
          <button
            key={c.id}
            onClick={() => {
              setCurrentIndex(i);
              setCountdown(4);
              setImageError(false);
            }}
            className={`relative flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all p-0.5 ${
              currentIndex === i
                ? 'border-cyan-400 ring-2 ring-cyan-500/40 scale-105'
                : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'
            }`}
            title={`${i + 1}. ${c.name}`}
          >
            <img
              src={`${c.url}&t=${localBuster}`}
              alt={c.name}
              className="w-16 h-10 object-cover rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  CAMERA_UNAVAILABLE_IMG;
              }}
            />
            <div className="absolute top-1 left-1 bg-slate-950/80 px-1 py-0.2 rounded text-[9px] font-mono text-white font-bold">
              {i + 1}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const LiveCamerasTourView = LiveCamerasTourViewProps;
