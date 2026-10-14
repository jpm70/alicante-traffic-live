import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import { CalculatedRoute, RoutePoint, getDistanceMeters } from '../services/routing';
import {
  generateRouteManeuvers,
  NavigationManeuver,
  getBearing,
} from '../services/navigationManeuvers';
import {
  X,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Navigation,
  Compass,
  Gauge,
  Clock,
  ArrowUp,
  CornerUpRight,
  CornerUpLeft,
  RotateCw,
  Flag,
  Crosshair,
  ExternalLink,
  Video,
  Maximize2,
  Minimize2,
  Sparkles,
  Moon,
  Car,
  Zap,
  Radio,
} from 'lucide-react';

interface GpsNavigatorModalProps {
  route: CalculatedRoute;
  origin: RoutePoint & { name: string };
  destination: RoutePoint & { name: string };
  onClose: () => void;
  cacheBuster: number;
}

export const GpsNavigatorModal: React.FC<GpsNavigatorModalProps> = ({
  route,
  origin,
  destination,
  onClose,
  cacheBuster,
}) => {
  // Navigation Maneuvers calculated from route geometry
  const maneuvers = useMemo(
    () => generateRouteManeuvers(route, origin, destination),
    [route, origin, destination]
  );

  // Mode: Real Device GPS vs Simulation
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [simulationPlaying, setSimulationPlaying] = useState<boolean>(true);
  const [simProgress, setSimProgress] = useState<number>(0); // 0 to 1

  // Current Driver Position & Telemetry
  const [currentPosition, setCurrentPosition] = useState<[number, number]>(() => {
    return route.coordinates[0] || [origin.lat, origin.lng];
  });
  const [currentHeading, setCurrentHeading] = useState<number>(0);
  const [currentSpeedKmH, setCurrentSpeedKmH] = useState<number>(50);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [recenterTrigger, setRecenterTrigger] = useState<number>(0);
  const [isHudMode, setIsHudMode] = useState<boolean>(false);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const wakeLockSentinelRef = useRef<any>(null);

  // Active Maneuver Index
  const [currentManeuverIndex, setCurrentManeuverIndex] = useState<number>(0);
  const [distanceToNextManeuverMeters, setDistanceToNextManeuverMeters] = useState<number>(100);

  // Nearest Camera Alert
  const [upcomingCamera, setUpcomingCamera] = useState<{
    id: string;
    name: string;
    zona: string;
    status: string;
    url: string;
    distanceMeters: number;
  } | null>(null);

  // Map & Markers references
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const cameraMarkersRef = useRef<L.CircleMarker[]>([]);

  // Speech synthesizer ref to avoid repeating announcements
  const lastSpokenManeuverIdRef = useRef<string | null>(null);
  const lastSpokenDistanceThresholdRef = useRef<number | null>(null);
  const announcedCameraIdsRef = useRef<Set<string>>(new Set());

  // Web Audio Chime Sound (played before safety alerts)
  const playAlertChime = useCallback(() => {
    if (!voiceEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.32);
    } catch {
      // AudioContext not allowed or not supported
    }
  }, [voiceEnabled]);

  // Speech Helper
  const speakInstruction = useCallback(
    (text: string) => {
      if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      } catch {
        // ignore audio errors
      }
    },
    [voiceEnabled]
  );

  // Screen Wake Lock API (Keep mobile screen awake while driving)
  const requestWakeLock = useCallback(async () => {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        const sentinel = await (navigator as any).wakeLock.request('screen');
        wakeLockSentinelRef.current = sentinel;
        setWakeLockActive(true);
        sentinel.addEventListener('release', () => {
          setWakeLockActive(false);
          wakeLockSentinelRef.current = null;
        });
      } catch (err) {
        console.warn('Wake Lock could not be acquired:', err);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockSentinelRef.current) {
      wakeLockSentinelRef.current.release().catch(() => {});
      wakeLockSentinelRef.current = null;
      setWakeLockActive(false);
    }
  }, []);

  useEffect(() => {
    requestWakeLock();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);

  // 1. REAL GPS TRACKING (when isSimulating is false)
  useEffect(() => {
    if (isSimulating || typeof navigator === 'undefined' || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentPosition([lat, lng]);

        if (pos.coords.heading !== null && !isNaN(pos.coords.heading)) {
          setCurrentHeading(pos.coords.heading);
        }

        if (pos.coords.speed !== null && !isNaN(pos.coords.speed)) {
          setCurrentSpeedKmH(Math.round(pos.coords.speed * 3.6));
        }
      },
      (err) => {
        console.warn('GPS Error, falling back to simulation mode:', err.message);
        setIsSimulating(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isSimulating]);

  // 2. SIMULATION LOOP (when isSimulating is true)
  useEffect(() => {
    if (!isSimulating || !simulationPlaying) return;

    const coords = route.coordinates;
    if (coords.length < 2) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = () => {
      animId = requestAnimationFrame(loop);
      const now = performance.now();
      const deltaSec = (now - lastTime) / 1000;
      lastTime = now;

      setSimProgress((prev) => {
        // Move through entire route in ~60 seconds
        const next = prev + (deltaSec / 60);
        if (next >= 1) {
          setSimulationPlaying(false);
          return 1;
        }

        // Interpolate position along polyline
        const totalSegments = coords.length - 1;
        const exactIndex = next * totalSegments;
        const idx = Math.min(Math.floor(exactIndex), totalSegments - 1);
        const subT = exactIndex - idx;

        const p1 = coords[idx];
        const p2 = coords[idx + 1];

        const lat = p1[0] + (p2[0] - p1[0]) * subT;
        const lng = p1[1] + (p2[1] - p1[1]) * subT;
        setCurrentPosition([lat, lng]);

        const bearing = getBearing(p1[0], p1[1], p2[0], p2[1]);
        setCurrentHeading(bearing);

        const baseSpd = (route.distanceKm / (route.totalMinutes / 60)) || 55;
        setCurrentSpeedKmH(Math.round(baseSpd + Math.sin(next * 30) * 8));

        return next;
      });
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isSimulating, simulationPlaying, route]);

  // 3. UPDATE TURN-BY-TURN GUIDANCE & CAMERA PROXIMITY BASED ON CURRENT POSITION
  useEffect(() => {
    const [cLat, cLng] = currentPosition;

    // Find next upcoming maneuver
    let nextIndex = maneuvers.length - 1;
    let minFutureDistance = Infinity;

    for (let i = 0; i < maneuvers.length; i++) {
      const m = maneuvers[i];
      const dist = getDistanceMeters(cLat, cLng, m.point[0], m.point[1]);
      if (dist > 30) {
        nextIndex = i;
        minFutureDistance = dist;
        break;
      }
    }

    setCurrentManeuverIndex(nextIndex);
    const distToTurn = Math.round(minFutureDistance === Infinity ? 0 : minFutureDistance);
    setDistanceToNextManeuverMeters(distToTurn);

    // Voice announcement trigger
    const currentManeuver = maneuvers[nextIndex];
    if (currentManeuver) {
      if (distToTurn <= 350 && distToTurn > 150) {
        if (
          lastSpokenManeuverIdRef.current !== currentManeuver.id ||
          lastSpokenDistanceThresholdRef.current !== 300
        ) {
          lastSpokenManeuverIdRef.current = currentManeuver.id;
          lastSpokenDistanceThresholdRef.current = 300;
          speakInstruction(`En trescientos metros, ${currentManeuver.instruction}`);
        }
      } else if (distToTurn <= 80 && distToTurn > 20) {
        if (
          lastSpokenManeuverIdRef.current !== currentManeuver.id ||
          lastSpokenDistanceThresholdRef.current !== 80
        ) {
          lastSpokenManeuverIdRef.current = currentManeuver.id;
          lastSpokenDistanceThresholdRef.current = 80;
          speakInstruction(`Ahora, ${currentManeuver.instruction}`);
        }
      }
    }

    // Check nearest traffic camera (< 300m)
    let nearest: any = null;
    let minCamDist = 280; // alert when camera within 280m
    for (const cam of route.cameras) {
      const d = getDistanceMeters(cLat, cLng, cam.lat, cam.lng);
      if (d < minCamDist) {
        minCamDist = d;
        nearest = {
          id: cam.id,
          name: cam.name,
          zona: cam.zona,
          status: cam.status,
          url: cam.url,
          distanceMeters: Math.round(d),
        };
      }
    }
    setUpcomingCamera(nearest);

    // Proactive Bluetooth/Speaker Voice Alert & Chime for camera proximity
    if (nearest && !announcedCameraIdsRef.current.has(nearest.id)) {
      announcedCameraIdsRef.current.add(nearest.id);
      playAlertChime();
      if (nearest.status === 'retencion' || nearest.status === 'denso') {
        speakInstruction(`Aviso de tráfico: a ${nearest.distanceMeters} metros, cámara en ${nearest.name} con tráfico ${nearest.status}.`);
      } else {
        speakInstruction(`Aproximación a cámara de tráfico en ${nearest.name}.`);
      }
    }
  }, [currentPosition, maneuvers, route.cameras, speakInstruction, playAlertChime]);

  // 4. LEAFLET MAP INITIALIZATION & SYNC
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: currentPosition,
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark Street Map Tile Provider (No API key needed)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    ).addTo(map);

    // Route Polyline Layer
    const poly = L.polyline(route.coordinates, {
      color: '#06b6d4',
      weight: 7,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);
    routeLayerRef.current = poly;

    // Add Camera Markers along route
    const camMarkers: L.CircleMarker[] = [];
    route.cameras.forEach((cam) => {
      const color =
        cam.status === 'fluido' ? '#10b981' : cam.status === 'denso' ? '#f59e0b' : '#ef4444';
      const m = L.circleMarker([cam.lat, cam.lng], {
        radius: 6,
        fillColor: color,
        color: '#ffffff',
        weight: 1.5,
        fillOpacity: 0.9,
      }).addTo(map);
      m.bindTooltip(`<b>Cámara ${cam.name}</b><br/>Tráfico ${cam.status}`, { direction: 'top' });
      camMarkers.push(m);
    });
    cameraMarkersRef.current = camMarkers;

    // Vehicle Navigation Puck
    const vehicleIcon = L.divIcon({
      className: 'gps-vehicle-puck',
      html: `
        <div id="gps-vehicle-arrow" style="position:relative; width:44px; height:44px; display:flex; align-items:center; justify-content:center; transform: rotate(${currentHeading}deg); transition: transform 0.2s linear;">
          <div style="position:absolute; width:40px; height:40px; border-radius:50%; background:rgba(6,182,212,0.3); animation:ping 1.5s infinite;"></div>
          <div style="width:28px; height:28px; border-radius:50%; background:#06b6d4; border:3px solid #ffffff; box-shadow:0 0 16px rgba(6,182,212,1); display:flex; align-items:center; justify-content:center;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#0f172a">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
            </svg>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const vMarker = L.marker(currentPosition, { icon: vehicleIcon }).addTo(map);
    vehicleMarkerRef.current = vMarker;
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync vehicle position on map
  useEffect(() => {
    if (!mapRef.current || !vehicleMarkerRef.current) return;

    vehicleMarkerRef.current.setLatLng(currentPosition);

    // Update vehicle heading rotation
    const arrowElem = document.getElementById('gps-vehicle-arrow');
    if (arrowElem) {
      arrowElem.style.transform = `rotate(${currentHeading}deg)`;
    }

    // Auto-center map on vehicle
    mapRef.current.panTo(currentPosition, { animate: true, duration: 0.5 });
  }, [currentPosition, currentHeading]);

  // Recenter button action
  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.setView(currentPosition, 16, { animate: true });
      setRecenterTrigger((t) => t + 1);
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // OPINION 1 INTEGRATION (Street View 360° Panorama - 100% Free Without API Key)
  const openStreetViewAtPosition = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const activeManeuver = maneuvers[currentManeuverIndex] || maneuvers[0];
  const nextUpcomingManeuver = maneuvers[currentManeuverIndex + 1];

  // Helper for maneuver icon
  const getManeuverIcon = (type: NavigationManeuver['type']) => {
    switch (type) {
      case 'turn-right':
      case 'slight-right':
        return <CornerUpRight className="w-8 h-8 text-emerald-400" />;
      case 'turn-left':
      case 'slight-left':
        return <CornerUpLeft className="w-8 h-8 text-emerald-400" />;
      case 'u-turn':
        return <RotateCw className="w-8 h-8 text-amber-400" />;
      case 'destination':
        return <Flag className="w-8 h-8 text-cyan-400" />;
      default:
        return <ArrowUp className="w-8 h-8 text-emerald-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#090d16] flex flex-col overflow-hidden select-none animate-in fade-in duration-200">
      {/* ------------------------------------------------------------------ */}
      {/* TOP NAVIGATION MANEUVER HUD (Waze / Google Maps Style) */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800 p-3 sm:px-6 shadow-2xl flex flex-col gap-2 z-20 flex-shrink-0">
        <div className="flex items-center justify-between gap-3">
          {/* Main Maneuver Box */}
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/50 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-950/40">
              {getManeuverIcon(activeManeuver.type)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 leading-none tracking-tight">
                  {distanceToNextManeuverMeters <= 40 ? 'Ahora' : `En ${distanceToNextManeuverMeters} m`}
                </span>
                <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                  (Paso {currentManeuverIndex + 1} de {maneuvers.length})
                </span>
              </div>
              <h2 className="text-sm sm:text-lg font-extrabold text-white truncate leading-tight mt-0.5">
                {activeManeuver.instruction}
              </h2>
              {nextUpcomingManeuver && (
                <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                  Después: {nextUpcomingManeuver.instruction}
                </p>
              )}
            </div>
          </div>

          {/* Quick Action Buttons in Top Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Screen Wake Lock Status Badge */}
            <div
              className={`px-2 py-1.5 rounded-lg border text-[11px] font-mono flex items-center gap-1 shadow-sm ${
                wakeLockActive
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
              title={wakeLockActive ? 'Pantalla siempre encendida (Wake Lock activo)' : 'Wake Lock inactivo'}
            >
              <Zap className={`w-3.5 h-3.5 ${wakeLockActive ? 'text-emerald-400 fill-emerald-400' : 'text-slate-600'}`} />
              <span className="hidden lg:inline">{wakeLockActive ? 'Pantalla Activa' : 'WakeLock'}</span>
            </div>

            {/* Android Auto / Google Maps Quick Launch */}
            <a
              href={`google.navigation:q=${destination.lat},${destination.lng}&mode=d`}
              className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              title="Lanzar en Android Auto / Google Maps"
            >
              <Car className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">Android Auto</span>
            </a>

            {/* HUD Parabrisas Mode Button */}
            <button
              onClick={() => setIsHudMode(!isHudMode)}
              className={`px-2.5 py-1.5 rounded-lg border font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                isHudMode
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/30'
              }`}
              title="Modo HUD Nocturno (Invierte la pantalla en espejo para reflejar en el parabrisas)"
            >
              <Moon className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">HUD Parabrisas</span>
            </button>

            {/* Street View 360° Button (Option 1 without API Key) */}
            <button
              onClick={() => openStreetViewAtPosition(currentPosition[0], currentPosition[1])}
              className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              title="Abrir vista fotográfica real a pie de calle en Street View (Opción 1)"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Street View 360°</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </button>

            {/* Voice Guidance Toggle */}
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-2 rounded-lg border transition-colors ${
                voiceEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title={voiceEnabled ? 'Voz activada' : 'Voz silenciada'}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="Alternar pantalla completa"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Exit Navigation */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-colors"
              title="Finalizar navegación (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* CENTER MAP VIEWPORT (Leaflet Map tracking driver) */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 relative w-full h-full overflow-hidden">
        <div ref={containerRef} className="w-full h-full" />

        {/* Floating Recenter Button */}
        <button
          onClick={handleRecenter}
          className="absolute right-4 bottom-28 z-[400] p-3 rounded-full bg-slate-900/90 hover:bg-slate-800 text-cyan-400 border border-slate-700 shadow-2xl backdrop-blur-md transition-all active:scale-95"
          title="Centrar mapa en mi vehículo"
        >
          <Crosshair className="w-5 h-5" />
        </button>

        {/* Floating Traffic Camera Alert Banner (when near camera) */}
        {upcomingCamera && (
          <div className="absolute top-4 right-4 z-[400] max-w-[290px] bg-slate-950/95 backdrop-blur-md border border-cyan-500/50 rounded-2xl p-3 shadow-2xl animate-in slide-in-from-top duration-200">
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                Cámara Próxima en Ruta
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                a {upcomingCamera.distanceMeters} m
              </span>
            </div>

            <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-slate-800 bg-black">
              <img
                src={`${upcomingCamera.url}&t=${cacheBuster}`}
                alt={upcomingCamera.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&q=80';
                }}
              />
              <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 p-1.5 text-center">
                <span className="text-[11px] font-bold text-white block truncate">
                  {upcomingCamera.name}
                </span>
                <span className="text-[10px] text-emerald-400 capitalize font-mono">
                  Tráfico {upcomingCamera.status} · {upcomingCamera.zona}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* BOTTOM DASHBOARD: Speedometer, ETA, Distance & Simulation Controls */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-[#0f172a]/95 backdrop-blur-md border-t border-slate-800 p-3 sm:px-6 z-20 flex-shrink-0 flex flex-col gap-2 shadow-2xl">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Digital Speedometer */}
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl shadow-inner">
              <Gauge className="w-5 h-5 text-cyan-400 mr-1 self-center" />
              <span className="text-3xl sm:text-4xl font-black font-mono text-cyan-400 leading-none">
                {currentSpeedKmH}
              </span>
              <span className="text-[11px] font-mono text-slate-400 uppercase">km/h</span>
            </div>

            {/* Compass Heading */}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl">
              <Compass className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold font-mono text-slate-200">
                {Math.round(currentHeading)}°
              </span>
            </div>
          </div>

          {/* Trip Summary (ETA, Remaining Time, Distance) */}
          <div className="flex items-center gap-4 text-center">
            <div>
              <div className="text-xs font-mono text-slate-400 uppercase flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tiempo</span>
              </div>
              <div className="text-base sm:text-lg font-bold font-mono text-white leading-tight">
                {Math.max(1, Math.round(route.totalMinutes * (1 - simProgress)))} min
              </div>
            </div>

            <div className="h-6 w-px bg-slate-800" />

            <div>
              <div className="text-xs font-mono text-slate-400 uppercase flex items-center justify-center gap-1">
                <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                <span>Distancia</span>
              </div>
              <div className="text-base sm:text-lg font-bold font-mono text-white leading-tight">
                {Math.round(route.distanceKm * (1 - simProgress) * 10) / 10} km
              </div>
            </div>
          </div>

          {/* Mode Switcher: GPS Real vs Simulación */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => {
                  setIsSimulating(false);
                  speakInstruction('Iniciando seguimiento por GPS real de tu dispositivo');
                }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  !isSimulating
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Usar antena GPS de tu teléfono o tablet"
              >
                GPS Real
              </button>
              <button
                onClick={() => {
                  setIsSimulating(true);
                  setSimulationPlaying(true);
                }}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  isSimulating
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Simular recorrido en ordenador o antes del viaje"
              >
                Simulador
              </button>
            </div>

            {/* If simulating, play/pause & reset buttons */}
            {isSimulating && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSimulationPlaying(!simulationPlaying)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                  title={simulationPlaying ? 'Pausar simulación' : 'Continuar simulación'}
                >
                  {simulationPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => {
                    setSimProgress(0);
                    setSimulationPlaying(true);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                  title="Reiniciar ruta simulada"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* HUD NOCTURNO (Reflejo Espejado en Parabrisas de Coche) */}
      {/* ------------------------------------------------------------------ */}
      {isHudMode && (
        <div
          onClick={() => setIsHudMode(false)}
          className="fixed inset-0 z-[999999] bg-black text-white flex flex-col justify-between p-6 sm:p-12 cursor-pointer select-none"
          style={{ transform: 'scaleX(-1)' }}
          title="Toca en cualquier parte para salir del Modo HUD"
        >
          {/* HUD Top: Next Turn Maneuver */}
          <div className="flex items-center justify-between border-b border-emerald-900/60 pb-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-3xl bg-emerald-950/80 border-4 border-emerald-400 flex items-center justify-center flex-shrink-0 shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                {getManeuverIcon(activeManeuver.type)}
              </div>
              <div>
                <div className="text-4xl sm:text-6xl font-black font-mono text-emerald-400 leading-none">
                  {distanceToNextManeuverMeters <= 40 ? 'AHORA' : `${distanceToNextManeuverMeters} m`}
                </div>
                <div className="text-xl sm:text-3xl font-extrabold text-white mt-2 max-w-xl truncate leading-tight">
                  {activeManeuver.instruction}
                </div>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsHudMode(false);
              }}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300"
            >
              Salir HUD
            </button>
          </div>

          {/* HUD Center: Gigantic Speedometer */}
          <div className="flex flex-col items-center justify-center my-auto py-4">
            <div className="text-[120px] sm:text-[180px] font-black font-mono leading-none tracking-tight text-emerald-400 drop-shadow-[0_0_35px_rgba(16,185,129,0.5)]">
              {currentSpeedKmH}
            </div>
            <div className="text-xl sm:text-2xl font-mono text-emerald-500 uppercase tracking-widest mt-1">
              km/h · Límite aconsejado: 50
            </div>
          </div>

          {/* HUD Bottom: Street, Compass & Distance Remaining */}
          <div className="flex items-center justify-between border-t border-emerald-900/60 pt-6">
            <div>
              <div className="text-lg sm:text-2xl font-extrabold text-slate-100">
                {activeManeuver.streetName}
              </div>
              <div className="text-sm font-mono text-slate-400">
                Destino: {destination.name}
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl sm:text-4xl font-black font-mono text-cyan-400">
                {route.distanceKm} km · {route.totalMinutes} min
              </div>
              <div className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                Modo HUD Parabrisas (Espejado) · Toca para salir
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
