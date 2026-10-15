import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CalculatedRoute, RoutePoint } from '../services/routing';
import { HistoricalTrafficChart } from './HistoricalTrafficChart';
import { askTrafficAdvisor, getStoredGeminiKey } from '../services/gemini';
import { Radar, radarsAlongRoute } from '../services/radars';
import {
  Clock,
  Gauge,
  Video,
  CheckCircle2,
  AlertTriangle,
  Flame,
  LayoutGrid,
  Bot,
  Sparkles,
  ChevronRight,
  TrendingDown,
  Info,
  Share2,
  Copy,
  Check,
  MessageCircle,
  Send,
  Smartphone,
  ExternalLink,
  X,
  Compass,
  Navigation,
  Eye,
  Car,
  Download,
  Key,
  Receipt,
  Zap,
} from 'lucide-react';
import { CarNavigationLauncherModal } from './CarNavigationLauncherModal';
import { calculateAlicanteTaxiFare, isNightOrHolidayAlicante } from '../data/publicTransport';

interface RouteComparisonPanelProps {
  routes: CalculatedRoute[];
  selectedRouteId: string;
  onSelectRoute: (routeId: string) => void;
  onViewRouteCamerasOnWall: (route: CalculatedRoute) => void;
  origin: RoutePoint & { name: string };
  destination: RoutePoint & { name: string };
  rushHourActive: boolean;
  onStartTour?: (route: CalculatedRoute, initialTab?: 'streetview' | 'flythrough' | 'cameras') => void;
  onStartGpsNavigation?: (route: CalculatedRoute) => void;
  onShareModalToggle?: (isOpen: boolean) => void;
  onCarLauncherToggle?: (isOpen: boolean) => void;
  onOpenAiConfigModal?: () => void;
  isPublicTransportMode?: boolean;
  onOpenTaxiFareModal?: () => void;
  onOpenTaxiDashboardModal?: () => void;
  radars?: Radar[];
}

export const RouteComparisonPanel: React.FC<RouteComparisonPanelProps> = ({
  routes,
  selectedRouteId,
  onSelectRoute,
  onViewRouteCamerasOnWall,
  origin,
  destination,
  rushHourActive,
  onStartTour,
  onStartGpsNavigation,
  onShareModalToggle,
  onCarLauncherToggle,
  onOpenAiConfigModal,
  isPublicTransportMode = false,
  onOpenTaxiFareModal,
  onOpenTaxiDashboardModal,
  radars = [],
}) => {
  const originName = origin.name;
  const destinationName = destination.name;
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [carLauncherRoute, setCarLauncherRoute] = useState<CalculatedRoute | null>(null);

  const hasUserAiKey = typeof window !== 'undefined' && Boolean(localStorage.getItem('alicante_gemini_api_key'));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showShareModal) {
        setShowShareModal(false);
        onShareModalToggle?.(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showShareModal, onShareModalToggle]);

  if (routes.length === 0) {
    return (
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 text-center text-slate-400">
        <Info className="w-8 h-8 text-cyan-500/50 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-slate-200">Sin ruta calculada</h3>
        <p className="text-xs mt-1 text-slate-400">
          Selecciona un origen y destino y pulsa "Calcular Camino Más Rápido".
        </p>
      </div>
    );
  }

  const fastestRoute = routes.find((r) => r.isFastest) || routes[0];
  const fastestRadars = radarsAlongRoute(fastestRoute, radars);

  const handleConsultAiAdvisor = async () => {
    setIsAiLoading(true);
    const userApiKey = getStoredGeminiKey();

    try {
      if (!userApiKey) throw new Error('Sin clave: motor local');
      const analysis = await askTrafficAdvisor({ apiKey: userApiKey, originName, destinationName, routes, rushHourActive });
      setAiReport(analysis);
    } catch {
      // Offline & GitHub Pages Client-side Traffic Control Engine (No API required)
      const congestedCams = fastestRoute.cameras.filter((c) => c.status !== 'fluido');
      const otherRoutes = routes.filter((r) => r.id !== fastestRoute.id);
      const worstRoute = otherRoutes.sort((a, b) => b.totalMinutes - a.totalMinutes)[0];

      const pointsOfAttention =
        congestedCams.length > 0
          ? congestedCams.map((c) => `• ${c.name} (${c.zona}): tráfico ${c.status}`).join('\n')
          : '• Sin incidencias graves: los puntos de control en este corredor presentan circulación continua y fluida.';

      const advice =
        rushHourActive
          ? 'En hora punta, prioriza carriles centrales en rotondas y evita cambios bruscos para no quedar bloqueado en las incorporaciones.'
          : 'Tráfico fluido en la arteria principal. Mantén velocidad sostenida para aprovechar la sincronización semafórica.';

      const briefing = `🚦 DICTAMEN SALA DE CONTROL · ALICANTE
1. RECOMENDACIÓN PRINCIPAL:
La ruta óptima ahora es "${fastestRoute.name}" (${fastestRoute.totalMinutes} min, ${fastestRoute.distanceKm} km). ${
        fastestRoute.timeSavingsMinutes > 0
          ? `Ahorras ${fastestRoute.timeSavingsMinutes} minutos frente a la alternativa más congestionada (${worstRoute?.name || 'otras vías'}).`
          : 'Es la opción con menor incertidumbre en el recorrido.'
      }

2. PUNTOS CRÍTICOS Y CÁMARAS:
${pointsOfAttention}

3. CONSEJO DE CONDUCCIÓN:
${advice}`;

      setAiReport(briefing);
    } finally {
      setIsAiLoading(false);
    }
  };

  const currentSelectedRoute = routes.find((r) => r.id === selectedRouteId) || fastestRoute;

  const generateShareUrl = (routeIdOverride?: string) => {
    const targetRoute = routeIdOverride || selectedRouteId || fastestRoute.id;
    const url = new URL(window.location.href);
    url.searchParams.set('oLat', origin.lat.toFixed(5));
    url.searchParams.set('oLng', origin.lng.toFixed(5));
    url.searchParams.set('oName', origin.name);
    url.searchParams.set('dLat', destination.lat.toFixed(5));
    url.searchParams.set('dLng', destination.lng.toFixed(5));
    url.searchParams.set('dName', destination.name);
    url.searchParams.set('route', targetRoute);
    if (rushHourActive) {
      url.searchParams.set('rush', '1');
    } else {
      url.searchParams.delete('rush');
    }
    return url.toString();
  };

  const handleShareRoute = async (routeIdOverride?: string) => {
    const targetId = routeIdOverride || selectedRouteId || fastestRoute.id;
    if (routeIdOverride && routeIdOverride !== selectedRouteId) {
      onSelectRoute(routeIdOverride);
    }
    const shareUrl = generateShareUrl(targetId);

    // Copy to clipboard immediately
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } catch {
      // ignore
    }

    setShowShareModal(true);
    onShareModalToggle?.(true);
  };

  return (
    <div className="space-y-3.5">
      {/* Top Winner Card: Fastest Route */}
      <div className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border-2 border-emerald-500/60 rounded-xl p-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500 text-slate-950 shadow-md uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Camino Más Rápido Recomendado
          </span>

          <div className="flex items-center gap-1.5">
            {fastestRoute.timeSavingsMinutes > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                <TrendingDown className="w-3 h-3" />
                -{fastestRoute.timeSavingsMinutes} min
              </span>
            )}

            {/* Share Button */}
            <button
              onClick={() => handleShareRoute()}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 border transition-all shadow active:scale-95 ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-cyan-500/50'
              }`}
              title="Compartir enlace directo con esta configuración de origen, destino y tráfico"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] text-emerald-300 font-bold">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px]">Compartir</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 my-2">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">{fastestRoute.name}</h3>
            <p className="text-xs text-slate-300">{fastestRoute.description}</p>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
              {fastestRoute.totalMinutes} <span className="text-xs text-slate-400 font-sans font-normal">min</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {fastestRoute.distanceKm} km · {fastestRoute.trafficDelayMinutes > 0 ? `+${fastestRoute.trafficDelayMinutes} min de retraso estimado` : 'Sin retrasos'}
            </div>
          </div>
        </div>

        {fastestRoute.isApproximate && (
          <div className="my-2 p-2.5 rounded-lg border border-amber-500/60 bg-amber-950/40 text-[11px] text-amber-100 leading-snug">
            <strong className="text-amber-300">Trazado aproximado.</strong> No se ha podido contactar con el servidor de
            rutas, así que la línea es una recta orientativa y la distancia y el tiempo son estimaciones. No la uses para
            conducir: comprueba la conexión y vuelve a calcular.
          </div>
        )}

        {/* Quick Route Stats */}
        <div className="grid grid-cols-3 gap-2 my-3 py-2 px-3 bg-slate-950/60 rounded-lg border border-slate-800/80 text-center">
          <div>
            <span className="block text-[10px] text-slate-400 uppercase font-mono">Estado Tráfico</span>
            <span className="text-xs font-bold capitalize text-emerald-400 flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {fastestRoute.status}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 uppercase font-mono">Cámaras en Ruta</span>
            <span className="text-xs font-bold text-cyan-400 font-mono">{fastestRoute.cameras.length} activas</span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 uppercase font-mono">Velocidad Med.</span>
            <span className="text-xs font-bold text-slate-200 font-mono">
              {Math.round((fastestRoute.distanceKm / (fastestRoute.totalMinutes / 60)) * 10) / 10} km/h
            </span>
          </div>
        </div>

        <p className="text-[10px] text-slate-500 leading-snug -mt-1 mb-2">
          Tiempo base: motor de rutas {fastestRoute.routingProvider && fastestRoute.routingProvider !== 'none' ? `(${fastestRoute.routingProvider})` : ''}.
          Retenciones: estimación por franja horaria en {fastestRoute.cameras.length} cámara{fastestRoute.cameras.length === 1 ? '' : 's'}
          {fastestRoute.incidents.length > 0
            ? ` + ${fastestRoute.incidents.length} incidencia${fastestRoute.incidents.length > 1 ? 's' : ''} oficial${fastestRoute.incidents.length > 1 ? 'es' : ''} DGT.`
            : '; sin incidencias oficiales DGT en el trazado.'}
          {fastestRadars.length > 0 &&
            ` ${fastestRadars.length} radar${fastestRadars.length > 1 ? 'es' : ''} DGT en la ruta (${fastestRadars
              .map((r) => r.radar.road + (r.radar.km !== null ? ' km ' + String(r.radar.km).replace('.', ',') : ''))
              .join(', ')}).`}
        </p>

        {/* Public Transport & Taxi Fare Badge (Only shown in Public Transport Mode) */}
        {isPublicTransportMode && (
          <div className="my-2.5 p-3 bg-gradient-to-r from-amber-400/15 via-slate-950 to-amber-400/10 border-2 border-amber-400/50 rounded-xl flex flex-wrap items-center justify-between gap-2.5 text-xs animate-in fade-in duration-200 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl">🚖</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-amber-300 text-sm">
                    Taxímetro Oficial: ~{calculateAlicanteTaxiFare(fastestRoute.distanceKm, fastestRoute.trafficDelayMinutes, originName, destinationName).estimatedTotal.toFixed(2)} €
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold">
                    {isNightOrHolidayAlicante() ? 'Tarifa 2' : 'Tarifa 1'}
                  </span>
                </div>
                {fastestRoute.busTaxiSavingsMinutes && fastestRoute.busTaxiSavingsMinutes > 0 ? (
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                    <Zap className="w-3.5 h-3.5 fill-emerald-400" />
                    Carril Bus-Taxi aprovechado: -{fastestRoute.busTaxiSavingsMinutes} min de atasco evitados
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Área de Prestación Conjunta de Alicante · Bajada bandera + km + esperas
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={onOpenTaxiFareModal}
                className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-1"
                title="Ver desglose completo de la tarifa oficial"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Desglose</span>
              </button>
              {onOpenTaxiDashboardModal && (
                <button
                  onClick={onOpenTaxiDashboardModal}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-400/40 font-bold text-xs transition-colors"
                  title="Abrir modo salpicadero para soporte móvil"
                >
                  📱 Salpicadero
                </button>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons: GPS Navigator, View on wall & Tour 3D / Cameras */}
        <div className="space-y-2">
          {/* NAVIGATION BUTTONS GRID (In-Car Navigation & Android Auto) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => onStartGpsNavigation?.(fastestRoute)}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-950/40 active:scale-95 uppercase tracking-wide cursor-pointer"
              title="Abrir navegador GPS integrado con cámaras en directo y modo HUD"
            >
              <Navigation className="w-4 h-4 fill-slate-950 text-slate-950" />
              <span>Navegador GPS</span>
            </button>

            <button
              onClick={() => {
                setCarLauncherRoute(fastestRoute);
                onCarLauncherToggle?.(true);
              }}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-blue-950/40 active:scale-95 uppercase tracking-wide cursor-pointer"
              title="Lanzar en Android Auto / Google Maps, Waze o exportar GPX"
            >
              <Car className="w-4 h-4 text-white" />
              <span>Android Auto / Coche</span>
            </button>
          </div>

          <button
            onClick={() => onViewRouteCamerasOnWall(fastestRoute)}
            className="w-full py-2 px-3 rounded-lg bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ver {fastestRoute.cameras.length} cámaras en una pantalla</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <button
              onClick={() => onStartTour?.(fastestRoute, 'streetview')}
              className="py-2 px-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-300 hover:text-blue-200 text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all shadow-sm active:scale-95"
              title="Opción 1: Recorrido panorámico de tipo Street View a pie de calle"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px] truncate">1. Street View</span>
            </button>

            <button
              onClick={() => onStartTour?.(fastestRoute, 'flythrough')}
              className="py-2 px-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 hover:text-cyan-200 text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all shadow-sm active:scale-95"
              title="Opción 2: Simulación de vuelo 3D por la carretera con Three.js"
            >
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] truncate">2. Vuelo 3D</span>
            </button>

            <button
              onClick={() => onStartTour?.(fastestRoute, 'cameras')}
              className="py-2 px-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all shadow-sm active:scale-95"
              title="Opción 3: Recorrer secuencialmente cada cámara en vivo de esta ruta"
            >
              <Video className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] truncate">3. Cámaras</span>
            </button>
          </div>
        </div>
      </div>

      {/* Historical vs Real-time Traffic Line Chart */}
      {(() => {
        const activeRoute = routes.find((r) => r.id === selectedRouteId) || fastestRoute;
        return <HistoricalTrafficChart route={activeRoute} />;
      })()}

      {/* Alternative Routes Comparison List */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 shadow-xl">
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Todas las Alternativas Analizadas ({routes.length})
          </h4>
          <button
            onClick={() => handleShareRoute(selectedRouteId)}
            className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-colors"
            title="Compartir enlace directo con la configuración seleccionada"
          >
            <Share2 className="w-3 h-3" />
            <span>Compartir</span>
          </button>
        </div>

        <div className="space-y-2">
          {routes.map((route) => {
            const isSelected = route.id === selectedRouteId;
            const isWinner = route.isFastest;

            return (
              <div
                key={route.id}
                onClick={() => onSelectRoute(route.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-800/90 border-cyan-500/80 shadow-md ring-1 ring-cyan-500/40'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: route.color }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{route.name}</span>
                        {isWinner && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            MÁS RÁPIDA
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 line-clamp-1">{route.description}</span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span
                      className={`text-sm font-mono font-bold ${
                        isWinner ? 'text-emerald-400' : 'text-slate-200'
                      }`}
                    >
                      {route.totalMinutes} min
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono">
                      {route.distanceKm} km
                    </span>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-y-1.5 text-[11px]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Video className="w-3 h-3 text-cyan-400" />
                      <span>{route.cameras.length} cámaras</span>
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          route.status === 'fluido'
                            ? 'bg-emerald-400'
                            : route.status === 'moderado'
                            ? 'bg-amber-400'
                            : 'bg-rose-500'
                        }`}
                      />
                      <span className="capitalize">{route.status}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 sm:gap-2.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartGpsNavigation?.(route);
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition-colors hover:underline text-[11px]"
                      title="Navegar esta ruta con GPS"
                    >
                      <Navigation className="w-3 h-3 fill-emerald-400" />
                      <span>GPS</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartTour?.(route, 'streetview');
                      }}
                      className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 transition-colors hover:underline text-[11px]"
                      title="Ver recorrido a pie de calle en Street View panorámico"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Street View</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartTour?.(route, 'flythrough');
                      }}
                      className="text-slate-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors hover:underline text-[11px]"
                      title="Simulación de Vuelo 3D con Three.js"
                    >
                      <Compass className="w-3 h-3 text-cyan-400" />
                      <span>3D</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareRoute(route.id);
                      }}
                      className="text-slate-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors hover:underline text-[11px]"
                      title="Compartir enlace para esta ruta alternativa"
                    >
                      <Share2 className="w-3 h-3 text-cyan-400" />
                      <span>Compartir</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewRouteCamerasOnWall(route);
                      }}
                      className="text-slate-400 hover:text-slate-200 font-medium flex items-center gap-0.5 hover:underline text-[11px]"
                    >
                      <span>Mural</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Traffic Advisor Briefing Button & Modal Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 shadow-xl">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Asesor IA · Centro de Control
            </h4>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {onOpenAiConfigModal && (
              <button
                onClick={onOpenAiConfigModal}
                className={`px-2 py-1 rounded-md border text-[11px] font-semibold flex items-center gap-1 transition-all ${
                  hasUserAiKey
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                    : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40'
                }`}
                title="Configurar tu clave API propia de Google AI Studio"
              >
                <Key className="w-3 h-3 text-cyan-400" />
                <span>{hasUserAiKey ? 'Clave IA Activa' : 'Configurar Clave IA'}</span>
              </button>
            )}
            <button
              onClick={handleConsultAiAdvisor}
              disabled={isAiLoading}
              className="px-2.5 py-1 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm active:scale-95"
            >
              <Sparkles className={`w-3 h-3 ${isAiLoading ? 'animate-spin' : ''}`} />
              <span>{isAiLoading ? 'Analizando...' : 'Dictamen IA'}</span>
            </button>
          </div>
        </div>

        {aiReport ? (
          <div className="mt-2 p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line animate-fadeIn">
            {aiReport}
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 leading-normal">
            Pulsa en "Dictamen IA" para generar un análisis inteligente de semáforos, rotondas y retenciones con Gemini sobre las cámaras de este trayecto.{' '}
            {!hasUserAiKey && onOpenAiConfigModal && (
              <button
                onClick={onOpenAiConfigModal}
                className="text-cyan-400 hover:underline inline font-medium ml-1"
              >
                ¿Quieres usar tu propia clave gratuita de Google AI Studio? Configúrala aquí.
              </button>
            )}
          </p>
        )}
      </div>

      {/* Direct Route Share Modal (Portaled directly to document.body at z-[99999] so map can never cover it) */}
      {showShareModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => {
            setShowShareModal(false);
            onShareModalToggle?.(false);
          }}
        >
          <div
            className="bg-[#0f172a] border border-cyan-500/50 rounded-2xl max-w-lg w-full p-5 shadow-2xl relative text-slate-100 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Compartir Configuración de Ruta</h3>
                  <p className="text-[11px] text-slate-400">
                    Enlace directo con origen, destino y opciones de tráfico
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  onShareModalToggle?.(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Configuration Summary Card */}
            <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block font-mono">
                Parámetros de Ruta Incluidos
              </span>

              <div className="flex items-start gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-white">Punto de Origen:</span> {origin.name}
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-white">Punto de Destino:</span> {destination.name}
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-white">Ruta activa:</span>{' '}
                  <span className="text-emerald-300 font-semibold">{currentSelectedRoute.name}</span>{' '}
                  ({currentSelectedRoute.totalMinutes} min · {currentSelectedRoute.distanceKm} km ·{' '}
                  {currentSelectedRoute.cameras.length} cámaras)
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-white">Opciones de tráfico:</span>{' '}
                  {rushHourActive ? (
                    <span className="text-amber-300 font-semibold">
                      🔥 Modo Hora Punta activo (ponderación de semáforos y retenciones)
                    </span>
                  ) : (
                    <span className="text-emerald-300 font-semibold">
                      🟢 Tráfico habitual (condiciones estándar)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Direct URL Input Box */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                <span>Enlace directo generado:</span>
                {copied && (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> ¡Copiado al portapapeles!
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={generateShareUrl(currentSelectedRoute.id)}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 select-all"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generateShareUrl(currentSelectedRoute.id));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 3000);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors flex-shrink-0 shadow-md"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            {/* Social Share Buttons */}
            <div className="space-y-2 pt-1 border-t border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400">
                Compartir directamente:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `Ruta en Alicante: ${origin.name} ➔ ${destination.name}\n${currentSelectedRoute.name} (${currentSelectedRoute.totalMinutes} min, ${currentSelectedRoute.distanceKm} km)\nOpciones: ${rushHourActive ? 'Hora punta activada' : 'Tráfico regular'}\n${generateShareUrl(currentSelectedRoute.id)}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(
                    generateShareUrl(currentSelectedRoute.id)
                  )}&text=${encodeURIComponent(
                    `Ruta en Alicante: ${origin.name} ➔ ${destination.name} (${currentSelectedRoute.totalMinutes} min)`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 text-xs font-semibold transition-colors"
                >
                  <Send className="w-4 h-4 text-sky-400" />
                  <span>Telegram</span>
                </a>
              </div>

              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={async () => {
                    try {
                      await navigator.share({
                        title: `Alicante Tráfico: ${origin.name} ➔ ${destination.name}`,
                        text: `Ruta recomendada en Alicante: ${currentSelectedRoute.name} (${currentSelectedRoute.totalMinutes} min). Consulta el tráfico en vivo:`,
                        url: generateShareUrl(currentSelectedRoute.id),
                      });
                    } catch {
                      // User closed share dialog
                    }
                  }}
                  className="w-full mt-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  <span>Menú de compartir del sistema</span>
                </button>
              )}
            </div>

            <p className="text-[10px] text-slate-500 text-center leading-normal">
              Cualquiera que abra este enlace verá automáticamente el mapa, cámaras en vivo y cálculo de tiempos con esta misma configuración.
            </p>
          </div>
        </div>,
        document.body
      )}

      {/* In-Car Navigation & Android Auto Launcher Modal */}
      {carLauncherRoute && (
        <CarNavigationLauncherModal
          route={carLauncherRoute}
          origin={origin}
          destination={destination}
          onClose={() => {
            setCarLauncherRoute(null);
            onCarLauncherToggle?.(false);
          }}
          onStartBuiltInGps={() => {
            onStartGpsNavigation?.(carLauncherRoute);
          }}
        />
      )}
    </div>
  );
};
