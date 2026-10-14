import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Navigation,
  Compass,
  Gauge,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  MapPin,
  Camera,
  AlertTriangle,
  Receipt,
  Maximize2,
  Minimize2,
  ArrowUp,
  CornerUpRight,
  CornerUpLeft,
} from 'lucide-react';
import { CalculatedRoute, RoutePoint } from '../services/routing';
import { generateRouteManeuvers } from '../services/navigationManeuvers';
import {
  ALICANTE_TAXI_STANDS,
  TaxiStand,
  calculateAlicanteTaxiFare,
  isNightOrHolidayAlicante,
} from '../data/publicTransport';

interface TaxiDashboardModalProps {
  route: CalculatedRoute;
  origin: RoutePoint & { name: string };
  destination: RoutePoint & { name: string };
  onClose: () => void;
  onNavigateToStand?: (stand: TaxiStand) => void;
}

export const TaxiDashboardModal: React.FC<TaxiDashboardModalProps> = ({
  route,
  origin,
  destination,
  onClose,
  onNavigateToStand,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Digital Taximeter simulation
  const isNight = isNightOrHolidayAlicante();
  const [taximeterActive, setTaximeterActive] = useState<boolean>(true);
  const [taximeterRate, setTaximeterRate] = useState<'tarifa-1' | 'tarifa-2'>(isNight ? 'tarifa-2' : 'tarifa-1');
  const [simKm, setSimKm] = useState<number>(0);
  const [simWaitSeconds, setSimWaitSeconds] = useState<number>(0);

  // Simulated vehicle movement along route
  const [currentSpeed, setCurrentSpeed] = useState<number>(42);
  const [currentManeuverIdx, setCurrentManeuverIdx] = useState<number>(0);
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(true);

  // Quick camera snapshot modal
  const [selectedQuickCamUrl, setSelectedQuickCamUrl] = useState<string | null>(null);

  const maneuvers = generateRouteManeuvers(route, origin, destination);
  const currentManeuver = maneuvers[currentManeuverIdx] || maneuvers[0];

  // Taximeter fare calculation in real-time
  const flagDrop = taximeterRate === 'tarifa-2' ? 2.55 : 2.15;
  const priceKm = taximeterRate === 'tarifa-2' ? 1.34 : 1.12;
  const pricePerHourWait = taximeterRate === 'tarifa-2' ? 26.80 : 22.50;
  const pricePerSecWait = pricePerHourWait / 3600;

  const currentFareTotal = Math.max(
    taximeterRate === 'tarifa-2' ? 5.60 : 4.50,
    flagDrop + simKm * priceKm + simWaitSeconds * pricePerSecWait
  );

  // Taximeter ticker
  useEffect(() => {
    if (!taximeterActive) return;

    const interval = setInterval(() => {
      // Simulate advance: at 42 km/h, vehicle travels ~11.6 meters per second
      setSimKm((prev) => Math.round((prev + 0.012) * 1000) / 1000);

      // Random brief red light stop every now and then
      if (Math.random() < 0.15) {
        setSimWaitSeconds((prev) => prev + 3);
        setCurrentSpeed(0);
      } else {
        setCurrentSpeed(Math.floor(38 + Math.random() * 12));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [taximeterActive]);

  // Maneuver advancement
  useEffect(() => {
    if (!taximeterActive || maneuvers.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentManeuverIdx((prev) => (prev + 1) % maneuvers.length);
    }, 9000);
    return () => clearInterval(interval);
  }, [taximeterActive, maneuvers.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Find closest taxi stand to destination
  const closestStand = ALICANTE_TAXI_STANDS[0];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[99999] bg-black text-white flex flex-col justify-between p-3 sm:p-6 select-none font-sans overflow-hidden"
    >
      {/* Top Bar: Taxi Header & Status */}
      <div className="flex items-center justify-between border-b border-amber-500/40 pb-3">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-amber-400 text-black font-black text-sm rounded-lg flex items-center gap-2 shadow-lg">
            <span>🚖</span>
            <span>TAXI ALICANTE · SALPICADERO</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTaximeterRate(taximeterRate === 'tarifa-1' ? 'tarifa-2' : 'tarifa-1')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase border transition-all ${
                taximeterRate === 'tarifa-2'
                  ? 'bg-purple-900/60 text-purple-300 border-purple-500'
                  : 'bg-cyan-950/60 text-cyan-300 border-cyan-500'
              }`}
            >
              {taximeterRate === 'tarifa-2' ? 'TARIFA 2 (NOCHE/FESTIVO)' : 'TARIFA 1 (DIURNA)'}
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsVoiceActive(!isVoiceActive)}
            className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
              isVoiceActive
                ? 'bg-slate-900 border-emerald-500/60 text-emerald-400'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
            title="Activar o silenciar instrucciones por voz"
          >
            {isVoiceActive ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Center Area: Split between Huge Maneuver & Giant Digital Taximeter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 my-auto py-2">
        {/* Left: Huge Navigation Guidance (High-Visibility for Windshield Phone Mount) */}
        <div className="bg-slate-950 border-2 border-slate-800 rounded-3xl p-5 sm:p-7 flex flex-col justify-between shadow-2xl relative">
          <div className="flex items-start justify-between gap-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black shadow-2xl shrink-0">
              {currentManeuver?.type === 'turn-right' ? (
                <CornerUpRight className="w-12 h-12 stroke-[3]" />
              ) : currentManeuver?.type === 'turn-left' ? (
                <CornerUpLeft className="w-12 h-12 stroke-[3]" />
              ) : (
                <ArrowUp className="w-12 h-12 stroke-[3]" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-amber-400 font-mono text-sm sm:text-base uppercase tracking-wider font-extrabold block">
                Próxima Maniobra · En 80 m
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-1 truncate">
                {currentManeuver?.streetName || route.name}
              </h2>
              <p className="text-sm sm:text-lg text-slate-300 mt-1">
                {currentManeuver?.instruction || 'Continúe recto por la vía'}
              </p>
            </div>
          </div>

          {/* Speed & Destination Strip */}
          <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-800">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
              <Gauge className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs text-slate-400 uppercase font-mono block">Velocidad</span>
                <span className="text-3xl font-black font-mono text-emerald-400">
                  {currentSpeed}{' '}
                  <span className="text-base text-slate-400 font-normal">km/h</span>
                </span>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
              <Navigation className="w-8 h-8 text-cyan-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs text-slate-400 uppercase font-mono block">Destino</span>
                <span className="text-lg font-bold text-white truncate block">
                  {destination.name}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Giant Digital Taximeter Cockpit */}
        <div className="bg-gradient-to-br from-amber-950/20 via-black to-slate-950 border-2 border-amber-400 rounded-3xl p-5 sm:p-7 flex flex-col justify-between shadow-2xl relative">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
              <span className="text-xs font-mono font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <Receipt className="w-4 h-4" />
                TAXÍMETRO DIGITAL EN SERVICIO
              </span>

              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            </div>

            {/* Giant Euro Amount */}
            <div className="text-center py-6 sm:py-8">
              <span className="text-5xl sm:text-7xl font-black font-mono text-amber-300 tracking-tight">
                {currentFareTotal.toFixed(2)}
              </span>
              <span className="text-3xl sm:text-5xl font-black text-amber-400 ml-2">€</span>
            </div>
          </div>

          {/* Taximeter Telemetry: Km, Time, Wait */}
          <div className="grid grid-cols-3 gap-2 text-center bg-slate-900/90 border border-slate-800 rounded-2xl p-3">
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Km Carrera</span>
              <span className="text-lg font-mono font-bold text-white">{simKm.toFixed(2)} km</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Tiempo Espera</span>
              <span className="text-lg font-mono font-bold text-amber-400">
                {Math.floor(simWaitSeconds / 60)}m {simWaitSeconds % 60}s
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Bajada Bandera</span>
              <span className="text-lg font-mono font-bold text-slate-200">{flagDrop.toFixed(2)} €</span>
            </div>
          </div>

          {/* Taximeter Control Buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setTaximeterActive(!taximeterActive)}
              className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                taximeterActive
                  ? 'bg-amber-400 hover:bg-amber-300 text-black'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black'
              }`}
            >
              {taximeterActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              <span>{taximeterActive ? 'Pausar Taxímetro' : 'Reanudar'}</span>
            </button>

            <button
              onClick={() => {
                setSimKm(0);
                setSimWaitSeconds(0);
              }}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Reiniciar contador a cero"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Quick 1-Touch Action Buttons for Windshield Use */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-800">
        {/* Button 1: Parada más cercana */}
        <button
          onClick={() => {
            if (onNavigateToStand) {
              onNavigateToStand(closestStand);
              onClose();
            }
          }}
          className="p-3 bg-slate-900 hover:bg-slate-800 border-2 border-amber-400/50 rounded-2xl flex items-center gap-2.5 transition-all text-left"
        >
          <MapPin className="w-6 h-6 text-amber-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] font-mono text-slate-400 block">PARADA PRÓXIMA</span>
            <span className="text-xs font-bold text-white truncate block">
              {closestStand.name}
            </span>
          </div>
        </button>

        {/* Button 2: Cámaras Accesos Alicante */}
        <button
          onClick={() => {
            if (route.cameras.length > 0) {
              setSelectedQuickCamUrl(route.cameras[0].url);
            }
          }}
          className="p-3 bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 rounded-2xl flex items-center gap-2.5 transition-all text-left"
        >
          <Camera className="w-6 h-6 text-cyan-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] font-mono text-slate-400 block">CÁMARAS ACCESOS</span>
            <span className="text-xs font-bold text-white truncate block">
              {route.cameras.length} en tu ruta
            </span>
          </div>
        </button>

        {/* Button 3: Carril Bus-Taxi activo */}
        <div className="p-3 bg-slate-900/60 border-2 border-slate-800 rounded-2xl flex items-center gap-2.5 text-left">
          <Navigation className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] font-mono text-slate-400 block">PRIORIDAD BUS-TAXI</span>
            <span className="text-xs font-bold text-emerald-300 truncate block">
              Habilitado en ciudad
            </span>
          </div>
        </div>

        {/* Button 4: Fiestas / Cortes */}
        <div className="p-3 bg-slate-900/60 border-2 border-slate-800 rounded-2xl flex items-center gap-2.5 text-left">
          <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] font-mono text-slate-400 block">AVISOS LOCALES</span>
            <span className="text-xs font-bold text-slate-200 truncate block">
              Luceros / Rambla
            </span>
          </div>
        </div>
      </div>

      {/* Quick Camera Snapshot Overlay if clicked */}
      {selectedQuickCamUrl && (
        <div
          className="fixed inset-0 z-[100000] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedQuickCamUrl(null)}
        >
          <div className="max-w-md w-full bg-slate-900 border border-cyan-500 rounded-2xl overflow-hidden p-3 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-cyan-400">CÁMARA DGT EN DIRECTO</span>
              <button onClick={() => setSelectedQuickCamUrl(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={selectedQuickCamUrl} alt="Cámara" className="w-full rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
};
