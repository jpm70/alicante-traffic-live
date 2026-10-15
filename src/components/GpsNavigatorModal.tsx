import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CAMERA_UNAVAILABLE_IMG } from '../data/placeholders';
import L from 'leaflet';
import { CalculatedRoute, RoutePoint, getDistanceMeters } from '../services/routing';
import { generateRouteManeuvers, NavigationManeuver, nextManeuverIndex, currentStreetName } from '../services/navigationManeuvers';
import { buildRouteIndex, pointAtDistance, projectOnRoute } from '../services/geometry';
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
  // Recalculates a route from the given position to the destination (GPS re-routing)
  onReroute?: (lat: number, lng: number) => Promise<CalculatedRoute | null>;
}

const formatDistance = (m: number) =>
  m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(m / 10) * 10} m`;

// Simulated seconds per real second in simulator mode
const SIMULATION_TIME_LAPSE = 8;

// Phones, tablets and car head units start with the real GPS; desktops with the simulator
const prefersRealGps = () =>
  typeof navigator !== 'undefined' && 'geolocation' in navigator && /Android|iPhone|iPad|Mobi|CrKey|Automotive/i.test(navigator.userAgent);

export const GpsNavigatorModal: React.FC<GpsNavigatorModalProps> = ({
  route,
  origin,
  destination,
  onClose,
  cacheBuster,
  onReroute,
}) => {
  // The route being followed (replaced when the driver leaves it and we re-route)
  const [activeRoute, setActiveRoute] = useState<CalculatedRoute>(route);
  useEffect(() => setActiveRoute(route), [route]);

  // Real street names and instructions from the routing engine
  const maneuvers = useMemo(
    () => generateRouteManeuvers(activeRoute, origin, destination),
    [activeRoute, origin, destination]
  );
  const routeIndex = useMemo(() => buildRouteIndex(activeRoute.coordinates), [activeRoute]);
  const routeIndexRef = useRef(routeIndex);
  routeIndexRef.current = routeIndex;

  // Mode: Real Device GPS vs Simulation
  const [isSimulating, setIsSimulating] = useState<boolean>(() => !prefersRealGps());
  const [simulationPlaying, setSimulationPlaying] = useState<boolean>(true);
  // Progress along the route in meters (drives guidance, ETA and remaining distance)
  const [alongMeters, setAlongMeters] = useState<number>(0);
  const [offRouteMeters, setOffRouteMeters] = useState<number>(0);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isRerouting, setIsRerouting] = useState<boolean>(false);

  // Current Driver Position & Telemetry
  const [currentPosition, setCurrentPosition] = useState<[number, number]>(() => {
    return route.coordinates[0] || [origin.lat, origin.lng];
  });
  const [currentHeading, setCurrentHeading] = useState<number>(0);
  const [currentSpeedKmH, setCurrentSpeedKmH] = useState<number>(0);
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
  // One AudioContext for the whole session: browsers cap how many can be created
  const audioCtxRef = useRef<AudioContext | null>(null);
  useEffect(() => () => {
    audioCtxRef.current?.close().catch(() => {});
  }, []);

  const playAlertChime = useCallback(() => {
    if (!voiceEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
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
  const lastFixRef = useRef<{ lat: number; lng: number; t: number } | null>(null);
  const offRouteCountRef = useRef(0);
  const lastRerouteRef = useRef(0);
  const alongRef = useRef(0);
  alongRef.current = alongMeters;
  const activeRouteRef = useRef(activeRoute);
  activeRouteRef.current = activeRoute;

  const requestReroute = useCallback(
    async (lat: number, lng: number) => {
      if (!onReroute || isRerouting) return;
      lastRerouteRef.current = Date.now();
      setIsRerouting(true);
      speakInstruction('Te has salido de la ruta. Recalculando.');
      try {
        const newRoute = await onReroute(lat, lng);
        if (newRoute) {
          setActiveRoute(newRoute);
          setAlongMeters(0);
          lastSpokenManeuverIdRef.current = null;
          lastSpokenDistanceThresholdRef.current = null;
          speakInstruction('Ruta recalculada.');
        }
      } catch (err) {
        console.warn('Re-routing failed:', err);
      } finally {
        offRouteCountRef.current = 0;
        setIsRerouting(false);
      }
    },
    [onReroute, isRerouting, speakInstruction]
  );

  const requestRerouteRef = useRef(requestReroute);
  requestRerouteRef.current = requestReroute;

  useEffect(() => {
    if (isSimulating) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError('Este dispositivo no ofrece geolocalización. Usando el simulador.');
      setIsSimulating(true);
      return;
    }
    setGpsError(null);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, heading, speed, accuracy } = pos.coords;
        setCurrentPosition([lat, lng]);
        setGpsAccuracy(Math.round(accuracy));

        // Progress along the route: snap the fix to the polyline near the last position
        const proj = projectOnRoute(routeIndexRef.current, lat, lng, alongRef.current);
        setAlongMeters(proj.alongMeters);
        setOffRouteMeters(Math.round(proj.offsetMeters));

        // Speed: device value when available, otherwise derived from consecutive fixes
        const now = pos.timestamp || Date.now();
        let speedKmH: number | null = speed !== null && !Number.isNaN(speed) ? speed * 3.6 : null;
        const prev = lastFixRef.current;
        if (speedKmH === null && prev) {
          const dt = (now - prev.t) / 1000;
          if (dt > 0.5) speedKmH = (getDistanceMeters(prev.lat, prev.lng, lat, lng) / dt) * 3.6;
        }
        lastFixRef.current = { lat, lng, t: now };
        if (speedKmH !== null) setCurrentSpeedKmH(Math.max(0, Math.round(speedKmH)));

        // Heading: GPS course when moving, otherwise the direction of the road
        if (heading !== null && !Number.isNaN(heading) && (speedKmH ?? 0) > 3) setCurrentHeading(heading);
        else if (proj.offsetMeters < 40) setCurrentHeading(proj.bearing);

        // Off-route detection: three consecutive good fixes far from the line
        const goodFix = accuracy <= 40;
        if (goodFix && proj.offsetMeters > 50) offRouteCountRef.current++;
        else if (proj.offsetMeters < 30) offRouteCountRef.current = 0;
        if (offRouteCountRef.current >= 3 && Date.now() - lastRerouteRef.current > 15000) {
          requestRerouteRef.current(lat, lng);
        }
      },
      (err) => {
        const reason =
          err.code === err.PERMISSION_DENIED
            ? 'Permiso de ubicación denegado'
            : err.code === err.TIMEOUT
              ? 'El GPS no responde'
              : 'Ubicación no disponible';
        console.warn('GPS error:', err.message);
        setGpsError(`${reason}. Usando el simulador.`);
        setIsSimulating(true);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isSimulating]);

  // 2. SIMULATION LOOP: moves along the route by distance (constant speed on the road,
  // not by polyline vertex), at the route's average speed in time-lapse.
  useEffect(() => {
    if (!isSimulating || !simulationPlaying) return;
    if (activeRoute.coordinates.length < 2) return;

    const index = routeIndexRef.current;
    const avgKmH = Math.min(90, Math.max(15, activeRoute.distanceKm / (Math.max(activeRoute.totalMinutes, 1) / 60)));
    let animId: number;
    let lastTime = performance.now();
    let lastUiUpdate = 0;
    let distance = alongRef.current;

    const loop = (now: number) => {
      animId = requestAnimationFrame(loop);
      const dt = Math.min(0.2, (now - lastTime) / 1000);
      lastTime = now;
      distance += (avgKmH / 3.6) * dt * SIMULATION_TIME_LAPSE;
      if (distance >= index.totalMeters) {
        distance = index.totalMeters;
        setSimulationPlaying(false);
      }
      // ~10 UI updates per second are enough and keep the map smooth on phones
      if (now - lastUiUpdate < 100 && distance < index.totalMeters) return;
      lastUiUpdate = now;
      const p = pointAtDistance(index, distance);
      setAlongMeters(distance);
      setOffRouteMeters(0);
      setCurrentPosition([p.lat, p.lng]);
      setCurrentHeading(p.bearing);
      setCurrentSpeedKmH(Math.round(avgKmH));
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isSimulating, simulationPlaying, activeRoute]);

  // 3. TURN-BY-TURN GUIDANCE & CAMERA PROXIMITY FROM THE PROGRESS ALONG THE ROUTE
  useEffect(() => {
    const [cLat, cLng] = currentPosition;

    const nextIndex = nextManeuverIndex(maneuvers, alongMeters);
    const currentManeuver = maneuvers[nextIndex];
    const distToTurn = currentManeuver ? Math.max(0, Math.round(currentManeuver.accumulatedDistanceMeters - alongMeters)) : 0;
    setCurrentManeuverIndex(nextIndex);
    setDistanceToNextManeuverMeters(distToTurn);

    // Voice announcements (once per maneuver and threshold)
    if (currentManeuver && offRouteMeters < 50) {
      if (distToTurn <= 350 && distToTurn > 150) {
        if (lastSpokenManeuverIdRef.current !== currentManeuver.id || lastSpokenDistanceThresholdRef.current !== 300) {
          lastSpokenManeuverIdRef.current = currentManeuver.id;
          lastSpokenDistanceThresholdRef.current = 300;
          speakInstruction(`En ${Math.round(distToTurn / 50) * 50} metros, ${currentManeuver.instruction}`);
        }
      } else if (distToTurn <= 80) {
        if (lastSpokenManeuverIdRef.current !== currentManeuver.id || lastSpokenDistanceThresholdRef.current !== 80) {
          lastSpokenManeuverIdRef.current = currentManeuver.id;
          lastSpokenDistanceThresholdRef.current = 80;
          speakInstruction(currentManeuver.type === 'destination' ? currentManeuver.instruction : `Ahora, ${currentManeuver.instruction}`);
        }
      }
    }

    // Nearest traffic camera of the route (< 280 m)
    let nearest: any = null;
    let minCamDist = 280;
    for (const cam of activeRoute.cameras) {
      const d = getDistanceMeters(cLat, cLng, cam.lat, cam.lng);
      if (d < minCamDist) {
        minCamDist = d;
        nearest = { id: cam.id, name: cam.name, zona: cam.zona, status: cam.status, url: cam.url, distanceMeters: Math.round(d) };
      }
    }
    setUpcomingCamera(nearest);

    if (nearest && !announcedCameraIdsRef.current.has(nearest.id)) {
      announcedCameraIdsRef.current.add(nearest.id);
      playAlertChime();
      if (nearest.status === 'retencion' || nearest.status === 'denso') {
        speakInstruction(`Aviso: posible tráfico ${nearest.status === 'retencion' ? 'con retenciones' : 'denso'} en ${nearest.name}.`);
      }
    }
  }, [currentPosition, alongMeters, offRouteMeters, maneuvers, activeRoute.cameras, speakInstruction, playAlertChime]);

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
    const poly = L.polyline(activeRoute.coordinates, {
      color: '#06b6d4',
      weight: 7,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);
    routeLayerRef.current = poly;

    // Add Camera Markers along route
    const camMarkers: L.CircleMarker[] = [];
    activeRoute.cameras.forEach((cam) => {
      const color =
        cam.status === 'fluido' ? '#10b981' : cam.status === 'denso' ? '#f59e0b' : '#ef4444';
      const m = L.circleMarker([cam.lat, cam.lng], {
        radius: 6,
        fillColor: color,
        color: '#ffffff',
        weight: 1.5,
        fillOpacity: 0.9,
      }).addTo(map);
      m.bindTooltip(`<b>Cámara ${cam.name}</b><br/>Tráfico ${cam.status} (estimado)`, { direction: 'top' });
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

  // Re-routed: redraw the line being followed and its cameras
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeLayerRef.current) return;
    routeLayerRef.current.setLatLngs(activeRoute.coordinates);
    cameraMarkersRef.current.forEach((m) => m.remove());
    cameraMarkersRef.current = activeRoute.cameras.map((cam) => {
      const color = cam.status === 'fluido' ? '#10b981' : cam.status === 'denso' ? '#f59e0b' : '#ef4444';
      return L.circleMarker([cam.lat, cam.lng], { radius: 6, fillColor: color, color: '#ffffff', weight: 1.5, fillOpacity: 0.9 })
        .bindTooltip(`<b>Cámara ${cam.name}</b><br/>Tráfico ${cam.status} (estimado)`, { direction: 'top' })
        .addTo(map);
    });
    announcedCameraIdsRef.current = new Set();
  }, [activeRoute]);

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

  const remainingMeters = Math.max(0, routeIndex.totalMeters - alongMeters);
  const remainingFraction = routeIndex.totalMeters > 0 ? remainingMeters / routeIndex.totalMeters : 0;
  const streetNow = currentStreetName(maneuvers, alongMeters, activeRoute.name);

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
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          {/* Main Maneuver Box (full width on phones, buttons go to a second row) */}
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 basis-full sm:basis-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/50 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-950/40">
              {getManeuverIcon(activeManeuver.type)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 leading-none tracking-tight">
                  {distanceToNextManeuverMeters <= 40 ? 'Ahora' : `En ${formatDistance(distanceToNextManeuverMeters)}`}
                </span>
                <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                  (Paso {currentManeuverIndex + 1} de {maneuvers.length})
                </span>
              </div>
              <h2 className="text-sm sm:text-lg font-extrabold text-white truncate leading-tight mt-0.5">
                {activeManeuver.instruction}
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Por {streetNow}
                {nextUpcomingManeuver && <span className="hidden sm:inline"> · Después: {nextUpcomingManeuver.instruction}</span>}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons in Top Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ml-auto">
            {/* Screen Wake Lock Status Badge */}
            <div
              className={`hidden sm:flex px-2 py-1.5 rounded-lg border text-[11px] font-mono items-center gap-1 shadow-sm ${
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

        {/* Navigation status: GPS problems, off-route and re-routing */}
        {(gpsError || isRerouting || (!isSimulating && offRouteMeters > 50) || activeRoute.isApproximate) && (
          <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-sm z-[400] flex flex-col gap-1.5 pointer-events-none">
            {gpsError && (
              <div className="px-3 py-2 rounded-xl bg-amber-950/95 border border-amber-500/60 text-amber-100 text-xs font-semibold shadow-xl">
                {gpsError}
              </div>
            )}
            {isRerouting ? (
              <div className="px-3 py-2 rounded-xl bg-cyan-950/95 border border-cyan-500/60 text-cyan-100 text-xs font-semibold shadow-xl">
                Recalculando ruta desde tu posición…
              </div>
            ) : (
              !isSimulating &&
              offRouteMeters > 50 && (
                <div className="px-3 py-2 rounded-xl bg-rose-950/95 border border-rose-500/60 text-rose-100 text-xs font-semibold shadow-xl">
                  Fuera de la ruta ({offRouteMeters} m){onReroute ? ' · se recalculará si sigues alejándote' : ''}
                </div>
              )
            )}
            {activeRoute.isApproximate && (
              <div className="px-3 py-2 rounded-xl bg-amber-950/95 border border-amber-500/60 text-amber-100 text-xs font-semibold shadow-xl">
                Trazado aproximado (sin servidor de rutas): las indicaciones no siguen calles.
              </div>
            )}
          </div>
        )}

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
                    CAMERA_UNAVAILABLE_IMG;
                }}
              />
              <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 p-1.5 text-center">
                <span className="text-[11px] font-bold text-white block truncate">
                  {upcomingCamera.name}
                </span>
                <span className="text-[10px] text-emerald-400 capitalize font-mono">
                  Tráfico {upcomingCamera.status === 'retencion' ? 'con retención' : upcomingCamera.status} (estimado) · {upcomingCamera.zona}
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
                {Math.max(1, Math.round(activeRoute.totalMinutes * remainingFraction))} min
              </div>
            </div>

            <div className="h-6 w-px bg-slate-800" />

            <div>
              <div className="text-xs font-mono text-slate-400 uppercase flex items-center justify-center gap-1">
                <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                <span>Distancia</span>
              </div>
              <div className="text-base sm:text-lg font-bold font-mono text-white leading-tight">
                {Math.round((remainingMeters / 1000) * 10) / 10} km
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
                GPS Real{!isSimulating && gpsAccuracy !== null ? ` ±${gpsAccuracy} m` : ''}
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
                    setAlongMeters(0);
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
                  {distanceToNextManeuverMeters <= 40 ? 'AHORA' : formatDistance(distanceToNextManeuverMeters)}
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
                {streetNow}
              </div>
              <div className="text-sm font-mono text-slate-400">
                Destino: {destination.name}
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl sm:text-4xl font-black font-mono text-cyan-400">
                {Math.round((remainingMeters / 1000) * 10) / 10} km · {Math.max(1, Math.round(activeRoute.totalMinutes * remainingFraction))} min
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
