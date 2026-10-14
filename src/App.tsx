/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CAMERAS, ALICANTE_LANDMARKS, TrafficCamera } from './data/cameras';
import {
  calculateAlternativeRoutes,
  CalculatedRoute,
  RoutePoint,
} from './services/routing';
import { INITIAL_ALICANTE_ALERTS, TrafficAlert } from './data/trafficAlerts';
import { Header } from './components/Header';
import { RouteSelector } from './components/RouteSelector';
import { RouteComparisonPanel } from './components/RouteComparisonPanel';
import { InteractiveMap } from './components/InteractiveMap';
import { CameraWall } from './components/CameraWall';
import { CameraLightbox } from './components/CameraLightbox';
import { TrafficAlerts } from './components/TrafficAlerts';
import { RouteTourModal } from './components/RouteTourModal';
import { GpsNavigatorModal } from './components/GpsNavigatorModal';
import { FloatingCameraPip } from './components/FloatingCameraPip';
import { GhostLogo } from './components/GhostLogo';
import { AiApiKeyModal } from './components/AiApiKeyModal';
import { PublicTransportBar } from './components/PublicTransportBar';
import { TaxiFareModal } from './components/TaxiFareModal';
import { DemandRadarModal } from './components/DemandRadarModal';
import { TaxiDashboardModal } from './components/TaxiDashboardModal';
import { LocalClosuresModal } from './components/LocalClosuresModal';
import { TaxiStand } from './data/publicTransport';
import { ShieldAlert, Navigation, ChevronRight, Share2, X, Check, Compass, ExternalLink } from 'lucide-react';

function parseInitialShareParams() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const oLat = parseFloat(params.get('oLat') || '');
  const oLng = parseFloat(params.get('oLng') || '');
  const dLat = parseFloat(params.get('dLat') || '');
  const dLng = parseFloat(params.get('dLng') || '');
  const oName = params.get('oName');
  const dName = params.get('dName');
  const rush = params.get('rush');
  const route = params.get('route');

  const hasOrigin = !isNaN(oLat) && !isNaN(oLng);
  const hasDest = !isNaN(dLat) && !isNaN(dLng);

  if (!hasOrigin && !hasDest && !rush && !route) {
    return null;
  }

  return {
    origin: hasOrigin
      ? { lat: oLat, lng: oLng, name: oName || `Punto [${oLat.toFixed(3)}, ${oLng.toFixed(3)}]` }
      : null,
    destination: hasDest
      ? { lat: dLat, lng: dLng, name: dName || `Punto [${dLat.toFixed(3)}, ${dLng.toFixed(3)}]` }
      : null,
    rushHourActive: rush === '1' || rush === 'true',
    targetRouteId: route || null,
  };
}

export default function App() {
  // Read initial configuration from share link if provided
  const initialParamsRef = React.useRef(parseInitialShareParams());
  const targetRouteIdRef = React.useRef<string | null>(initialParamsRef.current?.targetRouteId || null);

  const [sharedBannerInfo, setSharedBannerInfo] = useState<{
    originName: string;
    destinationName: string;
    rushHour: boolean;
  } | null>(() => {
    const init = initialParamsRef.current;
    if (init && (init.origin || init.destination)) {
      return {
        originName: init.origin?.name || ALICANTE_LANDMARKS[0].name,
        destinationName: init.destination?.name || ALICANTE_LANDMARKS[5].name,
        rushHour: init.rushHourActive,
      };
    }
    return null;
  });

  // Navigation & Origin/Dest State
  const [origin, setOrigin] = useState<RoutePoint & { name: string }>(() => {
    return (
      initialParamsRef.current?.origin || {
        lat: ALICANTE_LANDMARKS[0].lat,
        lng: ALICANTE_LANDMARKS[0].lng,
        name: ALICANTE_LANDMARKS[0].name, // Plaza de los Luceros
      }
    );
  });

  const [destination, setDestination] = useState<RoutePoint & { name: string }>(() => {
    return (
      initialParamsRef.current?.destination || {
        lat: ALICANTE_LANDMARKS[5].lat,
        lng: ALICANTE_LANDMARKS[5].lng,
        name: ALICANTE_LANDMARKS[5].name, // Playa de San Juan
      }
    );
  });

  // Routes calculation state
  const [routes, setRoutes] = useState<CalculatedRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [rushHourActive, setRushHourActive] = useState<boolean>(() => {
    return initialParamsRef.current?.rushHourActive || false;
  });

  // Selected cameras for single-screen wall
  const [selectedCameraIds, setSelectedCameraIds] = useState<Set<string>>(new Set());

  // Traffic Alerts State
  const [alerts, setAlerts] = useState<TrafficAlert[]>(INITIAL_ALICANTE_ALERTS);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [isAlertsLoading, setIsAlertsLoading] = useState<boolean>(false);

  // App active view ('map' | 'wall' | 'split' | 'alerts')
  const [activeTab, setActiveTab] = useState<'map' | 'wall' | 'split' | 'alerts'>('map');

  // Sidebar sub-tab on map view ('planner' | 'alerts')
  const [sidebarTab, setSidebarTab] = useState<'planner' | 'alerts'>('planner');

  // Picking point on map
  const [isPickOnMapActive, setIsPickOnMapActive] = useState<'origin' | 'destination' | null>(null);

  // Lightbox modal state
  const [lightboxCamera, setLightboxCamera] = useState<TrafficCamera | null>(null);

  // Floating Picture-in-Picture Camera state (pinned camera viewable across any tab)
  const [floatingCamera, setFloatingCamera] = useState<TrafficCamera | null>(null);

  // 3D, Street View & Live Cameras Tour Modal State
  const [tourModalRoute, setTourModalRoute] = useState<CalculatedRoute | null>(null);
  const [tourInitialTab, setTourInitialTab] = useState<'streetview' | 'flythrough' | 'cameras'>('streetview');

  const handleOpenTour = useCallback(
    (routeToTour?: CalculatedRoute, initialTab: 'streetview' | 'flythrough' | 'cameras' = 'streetview') => {
      setLightboxCamera(null);
      setIsPickOnMapActive(null);
      setGpsModalRoute(null);
      const target =
        routeToTour ||
        routes.find((r) => r.id === selectedRouteId) ||
        (routes.length > 0 ? routes[0] : null);
      if (target) {
        setTourModalRoute(target);
        setTourInitialTab(initialTab);
      }
    },
    [routes, selectedRouteId]
  );

  // GPS Navigator Modal State (Live & Simulator Mode)
  const [gpsModalRoute, setGpsModalRoute] = useState<CalculatedRoute | null>(null);

  // Share route modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // Car navigation launcher modal state
  const [isCarLauncherModalOpen, setIsCarLauncherModalOpen] = useState<boolean>(false);

  // AI API Key configuration modal state
  const [isAiConfigModalOpen, setIsAiConfigModalOpen] = useState<boolean>(false);
  const [hasUserAiKey, setHasUserAiKey] = useState<boolean>(() => {
    return typeof window !== 'undefined' && Boolean(localStorage.getItem('alicante_gemini_api_key'));
  });

  // Public Transport / Taxi Mode state (Options 1, 2, 3, 4, 5, 6)
  const [isPublicTransportMode, setIsPublicTransportMode] = useState<boolean>(false);
  const [busTaxiLaneActive, setBusTaxiLaneActive] = useState<boolean>(true);
  const [showTaxiStandsOnMap, setShowTaxiStandsOnMap] = useState<boolean>(true);
  const [isTaxiFareModalOpen, setIsTaxiFareModalOpen] = useState<boolean>(false);
  const [isDemandRadarModalOpen, setIsDemandRadarModalOpen] = useState<boolean>(false);
  const [isTaxiDashboardModalOpen, setIsTaxiDashboardModalOpen] = useState<boolean>(false);
  const [isLocalClosuresModalOpen, setIsLocalClosuresModalOpen] = useState<boolean>(false);

  // Check if ANY modal or lightbox is actively shown on screen
  const isAnyModalActive = Boolean(
    tourModalRoute ||
    gpsModalRoute ||
    isShareModalOpen ||
    isCarLauncherModalOpen ||
    isAiConfigModalOpen ||
    lightboxCamera ||
    isTaxiFareModalOpen ||
    isDemandRadarModalOpen ||
    isTaxiDashboardModalOpen ||
    isLocalClosuresModalOpen
  );

  const handleStartGpsNavigation = useCallback(
    (routeToNavigate?: CalculatedRoute) => {
      const target =
        routeToNavigate ||
        routes.find((r) => r.id === selectedRouteId) ||
        (routes.length > 0 ? routes[0] : null);
      if (target) {
        setGpsModalRoute(target);
      }
    },
    [routes, selectedRouteId]
  );

  // Auto-refresh timer state (15s cycle)
  const [countdown, setCountdown] = useState<number>(15);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [cacheBuster, setCacheBuster] = useState<number>(Date.now());

  // Fetch real-time traffic alerts
  const handleFetchAlerts = useCallback(async () => {
    setIsAlertsLoading(true);
    try {
      const res = await fetch('/api/traffic-alerts');
      if (res.ok) {
        const data = await res.json();
        if (data.alerts && Array.isArray(data.alerts)) {
          setAlerts(data.alerts);
        }
      }
    } catch (err) {
      console.error('Error fetching traffic alerts:', err);
    } finally {
      setIsAlertsLoading(false);
    }
  }, []);

  // Initial alerts fetch
  useEffect(() => {
    handleFetchAlerts();
  }, [handleFetchAlerts]);

  // Calculate routes handler
  const handleCalculateRoutes = useCallback(async () => {
    setIsCalculating(true);
    try {
      const calculated = await calculateAlternativeRoutes(
        origin,
        destination,
        rushHourActive,
        isPublicTransportMode && busTaxiLaneActive
      );
      setRoutes(calculated);

      // Select target route from shared link if provided, otherwise select fastest
      const targetId = targetRouteIdRef.current;
      targetRouteIdRef.current = null; // consume for initial calculation

      const matchedTarget = targetId ? calculated.find((r) => r.id === targetId) : null;
      const selected = matchedTarget || calculated.find((r) => r.isFastest) || calculated[0];

      if (selected) {
        setSelectedRouteId(selected.id);

        // Pre-select cameras of this route into the wall
        const camSet = new Set<string>();
        selected.cameras.forEach((c) => camSet.add(c.id));
        setSelectedCameraIds(camSet);
      }
    } catch (err) {
      console.error('Error calculating routes:', err);
    } finally {
      setIsCalculating(false);
    }
  }, [origin, destination, rushHourActive, isPublicTransportMode, busTaxiLaneActive]);

  // Initial calculation on load
  useEffect(() => {
    handleCalculateRoutes();
  }, [handleCalculateRoutes]);

  // Swap points handler
  const handleSwapPoints = () => {
    const temp = { ...origin };
    setOrigin({ ...destination });
    setDestination(temp);
  };

  // Click on map to set point
  const handleMapClickSetPoint = async (
    point: { lat: number; lng: number },
    forceType?: 'origin' | 'destination'
  ) => {
    const targetType = forceType || isPickOnMapActive;
    if (!targetType) return;

    let pointName = `Punto [${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}]`;

    // Fast reverse geocode for a clean street name in Alicante
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${point.lat}&lon=${point.lng}&format=json&zoom=17`,
        { headers: { 'Accept-Language': 'es' }, signal: AbortSignal.timeout(2500) }
      );
      if (res.ok) {
        const data = await res.json();
        const road = data.address?.road || data.address?.pedestrian || data.address?.suburb;
        const city = data.address?.city || data.address?.town || 'Alicante';
        if (road) pointName = `${road}, ${city}`;
      }
    } catch {
      // Keep coordinate label
    }

    if (targetType === 'origin') {
      const newOrigin = { lat: point.lat, lng: point.lng, name: pointName };
      setOrigin(newOrigin);
      setIsPickOnMapActive(null);

      // Recalculate route immediately with new origin
      calculateAlternativeRoutes(newOrigin, destination, rushHourActive).then((calculated) => {
        setRoutes(calculated);
        const fastest = calculated.find((r) => r.isFastest) || calculated[0];
        if (fastest) {
          setSelectedRouteId(fastest.id);
          const camSet = new Set<string>();
          fastest.cameras.forEach((c) => camSet.add(c.id));
          setSelectedCameraIds(camSet);
        }
      });
    } else if (targetType === 'destination') {
      const newDest = { lat: point.lat, lng: point.lng, name: pointName };
      setDestination(newDest);
      setIsPickOnMapActive(null);

      // Recalculate route immediately with new destination
      calculateAlternativeRoutes(origin, newDest, rushHourActive).then((calculated) => {
        setRoutes(calculated);
        const fastest = calculated.find((r) => r.isFastest) || calculated[0];
        if (fastest) {
          setSelectedRouteId(fastest.id);
          const camSet = new Set<string>();
          fastest.cameras.forEach((c) => camSet.add(c.id));
          setSelectedCameraIds(camSet);
        }
      });
    }
  };

  // Manual refresh trigger
  const handleManualRefresh = useCallback(() => {
    setIsRefreshing(true);
    setCacheBuster(Date.now());
    setCountdown(15);
    handleFetchAlerts();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  }, [handleFetchAlerts]);

  // 15-second countdown timer for auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCacheBuster(Date.now());
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Camera selection toggle
  const handleToggleCameraSelection = (camId: string) => {
    setSelectedCameraIds((prev) => {
      const next = new Set(prev);
      if (next.has(camId)) {
        next.delete(camId);
      } else {
        next.add(camId);
      }
      return next;
    });
  };

  // Batch selections
  const handleSelectAll = () => {
    const allIds = new Set(CAMERAS.map((c) => c.id));
    setSelectedCameraIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedCameraIds(new Set());
  };

  const handleSelectRouteCameras = (route: CalculatedRoute) => {
    const routeIds = new Set(route.cameras.map((c) => c.id));
    setSelectedCameraIds(routeIds);
    setSelectedRouteId(route.id);
    setActiveTab('wall');
  };

  // Active route
  const activeRoute = useMemo(() => {
    return routes.find((r) => r.id === selectedRouteId) || routes[0] || null;
  }, [routes, selectedRouteId]);

  // Alerts on active route
  const activeRouteAlerts = useMemo(() => {
    if (!activeRoute) return [];
    return alerts.filter((a) => {
      if (!a.corridorKey) return false;
      if (activeRoute.id.includes(a.corridorKey)) return true;
      const st = a.street.toLowerCase();
      if (activeRoute.name.toLowerCase().includes('litoral') && (st.includes('ramón y cajal') || st.includes('dénia') || st.includes('canalejas'))) return true;
      if (activeRoute.name.toLowerCase().includes('gran vía') && (st.includes('soler') || st.includes('gran vía'))) return true;
      if (activeRoute.name.toLowerCase().includes('parque') && (st.includes('jaime i') || st.includes('teulada'))) return true;
      return false;
    });
  }, [alerts, activeRoute]);

  // Select alert and highlight on map
  const handleSelectAlert = (alert: TrafficAlert) => {
    setSelectedAlertId(alert.id);
    if (activeTab === 'wall') {
      setActiveTab('map');
    }
  };

  // Lightbox Next/Prev
  const handleLightboxPrev = () => {
    if (!lightboxCamera) return;
    const currentIndex = CAMERAS.findIndex((c) => c.id === lightboxCamera.id);
    const prevIndex = (currentIndex - 1 + CAMERAS.length) % CAMERAS.length;
    setLightboxCamera(CAMERAS[prevIndex]);
  };

  const handleLightboxNext = () => {
    if (!lightboxCamera) return;
    const currentIndex = CAMERAS.findIndex((c) => c.id === lightboxCamera.id);
    const nextIndex = (currentIndex + 1) % CAMERAS.length;
    setLightboxCamera(CAMERAS[nextIndex]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f17] text-slate-100 font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Top Application Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        countdown={countdown}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        totalCameras={CAMERAS.length}
        selectedCamerasCount={selectedCameraIds.size}
        rushHourActive={rushHourActive}
        setRushHourActive={(val) => {
          setRushHourActive(val);
          // Recalculate routes with new traffic weight
          setTimeout(handleCalculateRoutes, 50);
        }}
        alertsCount={alerts.length}
        hasActiveRoute={routes.length > 0}
        onOpenTour={() => handleOpenTour(undefined, 'streetview')}
        onStartGpsNavigation={() => handleStartGpsNavigation()}
        onOpenAiConfigModal={() => setIsAiConfigModalOpen(true)}
        hasUserAiKey={hasUserAiKey}
        isPublicTransportMode={isPublicTransportMode}
        onTogglePublicTransportMode={() => setIsPublicTransportMode(!isPublicTransportMode)}
      />

      {/* Public Transport & Taxi Suite Controller (Only shown in Public Transport Mode) */}
      {isPublicTransportMode && (
        <PublicTransportBar
          busTaxiLaneActive={busTaxiLaneActive}
          onToggleBusTaxiLane={() => {
            setBusTaxiLaneActive(!busTaxiLaneActive);
            setTimeout(handleCalculateRoutes, 50);
          }}
          showTaxiStandsOnMap={showTaxiStandsOnMap}
          onToggleTaxiStandsOnMap={() => setShowTaxiStandsOnMap(!showTaxiStandsOnMap)}
          onOpenTaxiFareModal={() => setIsTaxiFareModalOpen(true)}
          onOpenDemandRadarModal={() => setIsDemandRadarModalOpen(true)}
          onOpenTaxiDashboardModal={() => setIsTaxiDashboardModalOpen(true)}
          onOpenLocalClosuresModal={() => setIsLocalClosuresModalOpen(true)}
          onClosePublicTransportMode={() => setIsPublicTransportMode(false)}
          activeRoute={activeRoute}
          origin={origin}
          destination={destination}
          onSelectTaxiStandAsDestination={(stand) => {
            handleMapClickSetPoint({ lat: stand.lat, lng: stand.lng }, 'destination');
          }}
        />
      )}

      {/* Shared Route Configuration Banner */}
      {sharedBannerInfo && (
        <div className="bg-gradient-to-r from-cyan-950/90 via-slate-900 to-slate-950 border-b border-cyan-500/40 px-4 py-2 text-xs flex items-center justify-between gap-3 text-slate-200 shadow-md flex-shrink-0 animate-fadeIn">
          <div className="flex items-center gap-2 overflow-hidden flex-wrap sm:flex-nowrap">
            <span className="p-1 rounded bg-cyan-500/20 text-cyan-400 flex-shrink-0">
              <Share2 className="w-3.5 h-3.5" />
            </span>
            <span className="font-bold text-cyan-300">Enlace compartido cargado:</span>
            <span className="text-white font-medium truncate">
              {sharedBannerInfo.originName} ➔ {sharedBannerInfo.destinationName}
            </span>
            {sharedBannerInfo.rushHour ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex-shrink-0">
                🔥 Hora Punta
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex-shrink-0">
                🟢 Tráfico Normal
              </span>
            )}
          </div>
          <button
            onClick={() => setSharedBannerInfo(null)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 text-xs flex-shrink-0 transition-colors"
            title="Cerrar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main View Container (Hides completely when 3D route tour or GPS is open to free GPU and avoid blocking the view) */}
      <main className={`flex-1 flex overflow-hidden ${(tourModalRoute || gpsModalRoute) ? 'hidden' : ''}`}>
        {/* VIEW 1: MAP & ROUTE PLANNER (With sidebar sub-tabs) */}
        {activeTab === 'map' && (
          <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-58px)] overflow-hidden">
            {/* Left Control Column */}
            <aside className="w-full lg:w-[430px] lg:min-w-[430px] border-b lg:border-b-0 lg:border-r border-slate-800 bg-[#0f172a]/95 flex flex-col overflow-y-auto p-4 space-y-3">
              {/* Sidebar Tab Switcher */}
              <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
                <button
                  onClick={() => setSidebarTab('planner')}
                  className={`flex-1 py-1.5 rounded-md font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    sidebarTab === 'planner'
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Planificador de Ruta</span>
                </button>
                <button
                  onClick={() => setSidebarTab('alerts')}
                  className={`flex-1 py-1.5 rounded-md font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    sidebarTab === 'alerts'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Alertas e Incidencias</span>
                  <span className="text-[10px] px-1.5 rounded-full font-mono bg-slate-950/40 text-amber-300">
                    {alerts.length}
                  </span>
                </button>
              </div>

              {/* Active Route Alerts Warning Banner */}
              {activeRouteAlerts.length > 0 && sidebarTab === 'planner' && (
                <div
                  onClick={() => setSidebarTab('alerts')}
                  className="bg-amber-500/10 border border-amber-500/40 rounded-lg p-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-amber-500/15 transition-colors animate-pulse"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">⚠️</span>
                    <div className="text-xs">
                      <span className="font-bold text-amber-300">
                        {activeRouteAlerts.length} alerta{activeRouteAlerts.length > 1 ? 's' : ''} en tu ruta activa
                      </span>
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {activeRouteAlerts.map((a) => a.title).join(' · ')}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0" />
                </div>
              )}

              {/* Sub-tab 1: Route Planner */}
              {sidebarTab === 'planner' ? (
                <>
                  <RouteSelector
                    origin={origin}
                    destination={destination}
                    onOriginChange={setOrigin}
                    onDestinationChange={setDestination}
                    onSwapPoints={handleSwapPoints}
                    isCalculating={isCalculating}
                    onCalculateRoute={handleCalculateRoutes}
                    isPickOnMapActive={isPickOnMapActive}
                    setIsPickOnMapActive={setIsPickOnMapActive}
                  />

                  <RouteComparisonPanel
                    routes={routes}
                    selectedRouteId={selectedRouteId}
                    onSelectRoute={setSelectedRouteId}
                    onViewRouteCamerasOnWall={handleSelectRouteCameras}
                    origin={origin}
                    destination={destination}
                    rushHourActive={rushHourActive}
                    onStartTour={handleOpenTour}
                    onStartGpsNavigation={handleStartGpsNavigation}
                    onShareModalToggle={setIsShareModalOpen}
                    onCarLauncherToggle={setIsCarLauncherModalOpen}
                    onOpenAiConfigModal={() => setIsAiConfigModalOpen(true)}
                    isPublicTransportMode={isPublicTransportMode}
                    onOpenTaxiFareModal={() => setIsTaxiFareModalOpen(true)}
                    onOpenTaxiDashboardModal={() => setIsTaxiDashboardModalOpen(true)}
                  />
                </>
              ) : (
                /* Sub-tab 2: Traffic Alerts Component */
                <TrafficAlerts
                  alerts={alerts}
                  isLoading={isAlertsLoading}
                  onRefreshAlerts={handleFetchAlerts}
                  onSelectAlert={handleSelectAlert}
                  selectedAlertId={selectedAlertId}
                  activeRoute={activeRoute}
                />
              )}

              {/* Creator Credit Badge with undistorted logo and link */}
              <div className="pt-2 pb-1 border-t border-slate-800/80 mt-auto flex-shrink-0">
                <a
                  href="https://www.unfantasmaenelsistema.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between p-2 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all text-xs"
                  title="Visitar Un Fantasma en el Sistema (https://www.unfantasmaenelsistema.com/)"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-950 p-0.5 border border-slate-800 shrink-0 aspect-square flex items-center justify-center">
                      <GhostLogo className="w-full h-full object-contain aspect-square select-none group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 block font-mono leading-none mb-0.5">
                        Creado por
                      </span>
                      <span className="font-bold text-white group-hover:text-cyan-300 transition-colors truncate block text-xs">
                        unfantasmaenelsistema.com
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 shrink-0 ml-1" />
                </a>
              </div>
            </aside>

            {/* Right Map View with Overlays */}
            <section className="flex-1 p-2 sm:p-4 bg-[#0b0f17] flex flex-col min-h-[350px]">
              <InteractiveMap
                origin={origin}
                destination={destination}
                routes={routes}
                selectedRouteId={selectedRouteId}
                onSelectRoute={setSelectedRouteId}
                onOpenLightbox={setLightboxCamera}
                onToggleCameraSelection={handleToggleCameraSelection}
                selectedCameraIds={selectedCameraIds}
                isPickOnMapActive={isPickOnMapActive}
                onMapClickSetPoint={handleMapClickSetPoint}
                cacheBuster={cacheBuster}
                alerts={alerts}
                selectedAlertId={selectedAlertId}
                onAlertClick={handleSelectAlert}
                onCancelPickMode={() => setIsPickOnMapActive(null)}
                isModalOpen={isAnyModalActive}
                isPublicTransportMode={isPublicTransportMode}
                showTaxiStands={showTaxiStandsOnMap}
              />
            </section>
          </div>
        )}

        {/* VIEW 2: FULL CAMERA WALL (ON A SINGLE SCREEN) */}
        {activeTab === 'wall' && (
          <div className="flex-1 h-[calc(100vh-58px)] overflow-hidden">
            <CameraWall
              selectedCameraIds={selectedCameraIds}
              onToggleCameraSelection={handleToggleCameraSelection}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onSelectRouteCameras={handleSelectRouteCameras}
              activeRoute={activeRoute}
              onOpenLightbox={setLightboxCamera}
              cacheBuster={cacheBuster}
            />
          </div>
        )}

        {/* VIEW 3: SPLIT VIEW (MAP + WALL SIDE BY SIDE) */}
        {activeTab === 'split' && (
          <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-58px)] overflow-hidden">
            {/* Left 45%: Map & Mini Route Bar */}
            <div className="w-full lg:w-[48%] border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col p-3 space-y-3 bg-[#0f172a]">
              <div className="max-h-[220px] overflow-y-auto">
                <RouteSelector
                  origin={origin}
                  destination={destination}
                  onOriginChange={setOrigin}
                  onDestinationChange={setDestination}
                  onSwapPoints={handleSwapPoints}
                  isCalculating={isCalculating}
                  onCalculateRoute={handleCalculateRoutes}
                  isPickOnMapActive={isPickOnMapActive}
                  setIsPickOnMapActive={setIsPickOnMapActive}
                />
              </div>

              <div className="flex-1 min-h-[320px]">
                <InteractiveMap
                  origin={origin}
                  destination={destination}
                  routes={routes}
                  selectedRouteId={selectedRouteId}
                  onSelectRoute={setSelectedRouteId}
                  onOpenLightbox={setLightboxCamera}
                  onToggleCameraSelection={handleToggleCameraSelection}
                  selectedCameraIds={selectedCameraIds}
                  isPickOnMapActive={isPickOnMapActive}
                  onMapClickSetPoint={handleMapClickSetPoint}
                  cacheBuster={cacheBuster}
                  alerts={alerts}
                  selectedAlertId={selectedAlertId}
                  onAlertClick={handleSelectAlert}
                  onCancelPickMode={() => setIsPickOnMapActive(null)}
                  isModalOpen={isAnyModalActive}
                />
              </div>
            </div>

            {/* Right 52%: Live Camera Wall */}
            <div className="flex-1 h-full overflow-hidden">
              <CameraWall
                selectedCameraIds={selectedCameraIds}
                onToggleCameraSelection={handleToggleCameraSelection}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onSelectRouteCameras={handleSelectRouteCameras}
                activeRoute={activeRoute}
                onOpenLightbox={setLightboxCamera}
                cacheBuster={cacheBuster}
              />
            </div>
          </div>
        )}

        {/* VIEW 4: DEDICATED ALERTS TAB */}
        {activeTab === 'alerts' && (
          <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-58px)] overflow-hidden">
            <aside className="w-full lg:w-[460px] lg:min-w-[460px] border-b lg:border-b-0 lg:border-r border-slate-800 bg-[#0f172a]/95 flex flex-col overflow-y-auto p-4 space-y-3">
              <TrafficAlerts
                alerts={alerts}
                isLoading={isAlertsLoading}
                onRefreshAlerts={handleFetchAlerts}
                onSelectAlert={handleSelectAlert}
                selectedAlertId={selectedAlertId}
                activeRoute={activeRoute}
              />
            </aside>

            <section className="flex-1 p-2 sm:p-4 bg-[#0b0f17] flex flex-col min-h-[350px]">
              <InteractiveMap
                origin={origin}
                destination={destination}
                routes={routes}
                selectedRouteId={selectedRouteId}
                onSelectRoute={setSelectedRouteId}
                onOpenLightbox={setLightboxCamera}
                onToggleCameraSelection={handleToggleCameraSelection}
                selectedCameraIds={selectedCameraIds}
                isPickOnMapActive={isPickOnMapActive}
                onMapClickSetPoint={handleMapClickSetPoint}
                cacheBuster={cacheBuster}
                alerts={alerts}
                selectedAlertId={selectedAlertId}
                onAlertClick={handleSelectAlert}
                onCancelPickMode={() => setIsPickOnMapActive(null)}
                isModalOpen={isAnyModalActive}
              />
            </section>
          </div>
        )}
      </main>

      {/* Full Resolution Camera Modal */}
      <CameraLightbox
        camera={lightboxCamera}
        onClose={() => setLightboxCamera(null)}
        onPrev={handleLightboxPrev}
        onNext={handleLightboxNext}
        isSelected={lightboxCamera ? selectedCameraIds.has(lightboxCamera.id) : false}
        onToggleSelect={handleToggleCameraSelection}
        cacheBuster={cacheBuster}
        onPinPip={(cam) => setFloatingCamera(cam)}
      />

      {/* Floating Picture-in-Picture Live Camera (pinned feed across all tabs) */}
      <FloatingCameraPip
        camera={floatingCamera}
        onClose={() => setFloatingCamera(null)}
        onExpand={(cam) => {
          setFloatingCamera(null);
          setLightboxCamera(cam);
        }}
        cacheBuster={cacheBuster}
      />

      {/* 3D Flythrough, Street View & Live Cameras Route Tour Modal (Options 1, 2, 3) */}
      {tourModalRoute && (
        <RouteTourModal
          route={tourModalRoute}
          origin={origin}
          destination={destination}
          cacheBuster={cacheBuster}
          initialTab={tourInitialTab}
          onClose={() => setTourModalRoute(null)}
        />
      )}

      {/* Turn-by-Turn GPS Navigator Modal (Real GPS & Virtual Simulation) */}
      {gpsModalRoute && (
        <GpsNavigatorModal
          route={gpsModalRoute}
          origin={origin}
          destination={destination}
          cacheBuster={cacheBuster}
          onClose={() => setGpsModalRoute(null)}
        />
      )}

      {/* Gemini AI API Key Settings Modal (Persisted locally in user's browser) */}
      <AiApiKeyModal
        isOpen={isAiConfigModalOpen}
        onClose={() => setIsAiConfigModalOpen(false)}
        onKeyChange={setHasUserAiKey}
      />

      {/* Public Transport: Official Taxi Fare Calculator Modal (Tarifas 1 y 2) */}
      {isTaxiFareModalOpen && activeRoute && (
        <TaxiFareModal
          route={activeRoute}
          origin={origin}
          destination={destination}
          onClose={() => setIsTaxiFareModalOpen(false)}
        />
      )}

      {/* Public Transport: Demand Radar Modal (AVE, Airport, Port) */}
      {isDemandRadarModalOpen && (
        <DemandRadarModal
          onClose={() => setIsDemandRadarModalOpen(false)}
          onSelectStandAsDestination={(stand) => {
            handleMapClickSetPoint({ lat: stand.lat, lng: stand.lng }, 'destination');
          }}
        />
      )}

      {/* Public Transport: High-Contrast Windshield Taxi Dashboard HUD Modal */}
      {isTaxiDashboardModalOpen && activeRoute && (
        <TaxiDashboardModal
          route={activeRoute}
          origin={origin}
          destination={destination}
          onClose={() => setIsTaxiDashboardModalOpen(false)}
          onNavigateToStand={(stand) => {
            handleMapClickSetPoint({ lat: stand.lat, lng: stand.lng }, 'destination');
          }}
        />
      )}

      {/* Public Transport: Local Closures and Alicante Fiestas Modal */}
      {isLocalClosuresModalOpen && (
        <LocalClosuresModal
          onClose={() => setIsLocalClosuresModalOpen(false)}
        />
      )}
    </div>
  );
}
