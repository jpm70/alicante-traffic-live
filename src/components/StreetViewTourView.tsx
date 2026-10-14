import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { CalculatedRoute, RoutePoint, getDistanceMeters } from '../services/routing';
import { generateRouteManeuvers, getBearing } from '../services/navigationManeuvers';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Eye,
  Sliders,
  HelpCircle,
  X,
  Compass,
  Navigation,
  Clock,
  Gauge,
  Video,
  Layers,
  MapPin,
  Car,
  Sparkles,
  Sun,
  Maximize2,
  Minimize2,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  Map as MapIcon,
  RefreshCw,
} from 'lucide-react';

interface StreetViewTourViewProps {
  route: CalculatedRoute;
  origin: RoutePoint & { name: string };
  destination: RoutePoint & { name: string };
  cacheBuster: number;
}

export type StreetSegmentType =
  | 'avenida'
  | 'maritimo'
  | 'granvia'
  | 'centro'
  | 'rotonda'
  | 'acceso';

export interface StreetWaypoint {
  id: string;
  index: number;
  lat: number;
  lng: number;
  heading: number;
  streetName: string;
  instruction: string;
  maneuverType?: string;
  distanceMeters: number;
  remainingMeters: number;
  progressPercent: number;
  speedLimit: number;
  segmentType: StreetSegmentType;
  panoramicFallbackUrl: string;
  nearbyCamera?: {
    id: string;
    name: string;
    zona: string;
    status: string;
    url: string;
    distanceMeters: number;
  };
}

const LOCAL_STORAGE_KEY = 'alicante_streetview_api_key';

// High-resolution panoramic street photographs tailored for Alicante environments
const PANORAMA_CATALOG: Record<StreetSegmentType, string[]> = {
  avenida: [
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1600&auto=format&fit=crop&q=85',
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1600&auto=format&fit=crop&q=85',
  ],
  maritimo: [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=85',
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1600&auto=format&fit=crop&q=85',
  ],
  granvia: [
    'https://images.unsplash.com/photo-1508873696983-2df5703bc20d?w=1600&auto=format&fit=crop&q=85',
    'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=1600&auto=format&fit=crop&q=85',
  ],
  centro: [
    'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=1600&auto=format&fit=crop&q=85',
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1600&auto=format&fit=crop&q=85',
  ],
  rotonda: [
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1600&auto=format&fit=crop&q=85',
    'https://images.unsplash.com/photo-1508873696983-2df5703bc20d?w=1600&auto=format&fit=crop&q=85',
  ],
  acceso: [
    'https://images.unsplash.com/photo-1508873696983-2df5703bc20d?w=1600&auto=format&fit=crop&q=85',
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1600&auto=format&fit=crop&q=85',
  ],
};

export const StreetViewTourView: React.FC<StreetViewTourViewProps> = ({
  route,
  origin,
  destination,
  cacheBuster,
}) => {
  // Primary view modes:
  // 'streetview-pano': Official/panoramic static street images simulating the real journey
  // '3d-drive': Sunny Mediterranean 3D driving simulation
  // 'dgt-cameras': DGT Traffic Camera Tour
  const [viewMode, setViewMode] = useState<'streetview-pano' | '3d-drive' | 'dgt-cameras'>('streetview-pano');

  // Google API Key State (stored safely in browser localStorage)
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LOCAL_STORAGE_KEY) || '';
    }
    return '';
  });

  const [inputKey, setInputKey] = useState<string>(apiKey);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [keyStatusMessage, setKeyStatusMessage] = useState<string | null>(null);
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);

  // Playback & Waypoint Index State
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1); // 0.5x, 1x, 2x, 3x
  const [angleOffset, setAngleOffset] = useState<number>(0); // 0 = Front, -45 = Left, +45 = Right, 180 = Rear
  const [pitchOffset, setPitchOffset] = useState<number>(0); // -10 = Look down, 0 = Eye level, +10 = Look up
  const [showMiniMap, setShowMiniMap] = useState<boolean>(true);
  const [showLiveCamPiP, setShowLiveCamPiP] = useState<boolean>(true);
  const [googleImgFailed, setGoogleImgFailed] = useState<boolean>(false);

  // Smooth progress along the route (0 to 1) for the 3D drive mode
  const [progressT, setProgressT] = useState<number>(0);

  const canvasMountRef = useRef<HTMLDivElement>(null);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const speedRef = useRef<number>(speedMultiplier);
  const currentIndexRef = useRef<number>(currentIndex);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    speedRef.current = speedMultiplier;
  }, [speedMultiplier]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Reset Google error state when index changes
  useEffect(() => {
    setGoogleImgFailed(false);
  }, [currentIndex]);

  // ---------------------------------------------------------------------------
  // GENERATE SYNCHRONIZED WAYPOINTS ALONG THE ROUTE COORDINATES
  // ---------------------------------------------------------------------------
  const waypoints = useMemo<StreetWaypoint[]>(() => {
    if (!route.coordinates || route.coordinates.length < 2) return [];

    const maneuvers = generateRouteManeuvers(route, origin, destination);
    const coords = route.coordinates;
    const totalPoints = coords.length;

    // We want around 30-40 frames across the journey for smooth pacing
    const targetSteps = Math.min(40, Math.max(16, Math.floor(totalPoints / 2)));
    const stepSize = Math.max(1, Math.floor(totalPoints / targetSteps));

    const items: StreetWaypoint[] = [];
    let cumulativeDist = 0;
    const totalDistMeters = Math.max(1, (route.distanceKm || 1) * 1000);

    for (let i = 0; i < totalPoints; i += stepSize) {
      const [ptLat, ptLng] = coords[i];
      const nextIdx = Math.min(i + 1, totalPoints - 1);
      const [nextPtLat, nextPtLng] = coords[nextIdx];

      // Exact bearing to the next waypoint along the roadway
      const heading = Math.round(getBearing(ptLat, ptLng, nextPtLat, nextPtLng));

      // Match street name and maneuver instruction
      let streetName = `Tramo ${route.name}`;
      let instruction = 'Continúe recto por la vía';
      let maneuverType = 'straight';

      for (const m of maneuvers) {
        const d = getDistanceMeters(ptLat, ptLng, m.point[0], m.point[1]);
        if (d < 350) {
          streetName = m.streetName || streetName;
          instruction = m.instruction || instruction;
          maneuverType = m.type || 'straight';
          break;
        }
      }

      // Check for closest Alicante DGT camera within 350m
      let nearbyCam: StreetWaypoint['nearbyCamera'] | undefined;
      let minCamDist = 99999;
      for (const c of route.cameras) {
        const d = getDistanceMeters(ptLat, ptLng, c.lat, c.lng);
        if (d <= 350 && d < minCamDist) {
          minCamDist = d;
          nearbyCam = {
            id: c.id,
            name: c.name,
            zona: c.zona,
            status: c.status,
            url: c.url,
            distanceMeters: Math.round(d),
          };
        }
      }

      if (i > 0) {
        const prevIdx = Math.max(0, i - stepSize);
        const [prevLat, prevLng] = coords[prevIdx];
        cumulativeDist += getDistanceMeters(prevLat, prevLng, ptLat, ptLng);
      }

      const progressPercent = Math.min(100, Math.round((cumulativeDist / totalDistMeters) * 100));
      const remainingMeters = Math.max(0, Math.round(totalDistMeters - cumulativeDist));

      // Classify street segment topology
      const lowerName = (streetName + ' ' + route.name).toLowerCase();
      let segType: StreetSegmentType = 'avenida';
      let speedLimit = 50;

      if (lowerName.includes('gran vía') || lowerName.includes('via parque') || lowerName.includes('a-70') || lowerName.includes('a-31') || lowerName.includes('autov') || lowerName.includes('n-332')) {
        segType = 'granvia';
        speedLimit = lowerName.includes('autov') || lowerName.includes('a-31') ? 80 : 50;
      } else if (lowerName.includes('explanada') || lowerName.includes('puerto') || lowerName.includes('marítim') || lowerName.includes('postiguet') || lowerName.includes('conde de vallellano')) {
        segType = 'maritimo';
        speedLimit = 40;
      } else if (lowerName.includes('glorieta') || lowerName.includes('plaza') || lowerName.includes('rotonda') || lowerName.includes('luceros') || lowerName.includes('estrella')) {
        segType = 'rotonda';
        speedLimit = 30;
      } else if (lowerName.includes('calle') || lowerName.includes('san fernando') || lowerName.includes('teatro') || lowerName.includes('castaños') || lowerName.includes('rambla')) {
        segType = 'centro';
        speedLimit = 30;
      } else {
        segType = 'avenida';
        speedLimit = 50;
      }

      const catalogUrls = PANORAMA_CATALOG[segType] || PANORAMA_CATALOG.avenida;
      const fallbackUrl = catalogUrls[items.length % catalogUrls.length];

      items.push({
        id: `wp-${i}`,
        index: items.length,
        lat: ptLat,
        lng: ptLng,
        heading,
        streetName,
        instruction,
        maneuverType,
        distanceMeters: Math.round(cumulativeDist),
        remainingMeters,
        progressPercent,
        speedLimit,
        segmentType: segType,
        panoramicFallbackUrl: fallbackUrl,
        nearbyCamera: nearbyCam,
      });
    }

    return items;
  }, [route, origin, destination]);

  const activeWaypoint = waypoints[currentIndex] || waypoints[0];

  // Calculated effective heading including camera angle offset
  const currentHeading = useMemo(() => {
    if (!activeWaypoint) return 0;
    let h = (activeWaypoint.heading + angleOffset) % 360;
    if (h < 0) h += 360;
    return Math.round(h);
  }, [activeWaypoint, angleOffset]);

  // Google Street View Static Image URL (when API key is configured)
  const googleStreetViewUrl = useMemo(() => {
    if (!activeWaypoint || !apiKey) return '';
    return `https://maps.googleapis.com/maps/api/streetview?size=1200x640&location=${activeWaypoint.lat},${activeWaypoint.lng}&heading=${currentHeading}&pitch=${pitchOffset}&fov=95&key=${encodeURIComponent(
      apiKey.trim()
    )}`;
  }, [activeWaypoint, apiKey, currentHeading, pitchOffset]);

  // External Interactive Google Street View 360 Photosphere URL
  const externalGoogleStreetViewUrl = useMemo(() => {
    if (!activeWaypoint) return 'https://www.google.com/maps';
    return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${activeWaypoint.lat},${activeWaypoint.lng}&heading=${currentHeading}&pitch=${pitchOffset}&fov=90`;
  }, [activeWaypoint, currentHeading, pitchOffset]);

  // Determine which image URL to show in Street View
  const activeImageUrl = useMemo(() => {
    if (apiKey && !googleImgFailed && googleStreetViewUrl) {
      return googleStreetViewUrl;
    }
    return activeWaypoint ? activeWaypoint.panoramicFallbackUrl : '';
  }, [apiKey, googleImgFailed, googleStreetViewUrl, activeWaypoint]);

  // ---------------------------------------------------------------------------
  // AUTOMATIC ROUTE PROGRESSION TIMER (Simulating Driving Journey)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isPlaying || waypoints.length <= 1) return;

    // Speed determines interval: 1x = 1800ms, 2x = 900ms, 3x = 550ms, 0.5x = 2800ms
    const intervalMs = Math.round(1800 / speedMultiplier);

    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= waypoints.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        const next = prev + 1;
        const t = next / Math.max(1, waypoints.length - 1);
        setProgressT(t);
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, speedMultiplier, waypoints.length]);

  // Stepper handlers
  const goToNext = () => {
    if (currentIndex < waypoints.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setProgressT(nextIdx / Math.max(1, waypoints.length - 1));
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      setProgressT(prevIdx / Math.max(1, waypoints.length - 1));
    }
  };

  const handleJumpToIndex = (idx: number) => {
    const validIdx = Math.max(0, Math.min(waypoints.length - 1, idx));
    setCurrentIndex(validIdx);
    setProgressT(validIdx / Math.max(1, waypoints.length - 1));
  };

  // API Key handlers
  const handleSaveKey = () => {
    const trimmed = inputKey.trim();
    if (!trimmed) {
      handleClearKey();
      return;
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, trimmed);
    setApiKey(trimmed);
    setGoogleImgFailed(false);
    setKeyStatusMessage('¡Clave guardada con éxito! Cargando imágenes oficiales de Google Street View.');
    setTimeout(() => {
      setIsConfigOpen(false);
      setKeyStatusMessage(null);
    }, 1800);
  };

  const handleClearKey = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setApiKey('');
    setInputKey('');
    setGoogleImgFailed(false);
    setKeyStatusMessage('Clave eliminada. Se utilizarán las panorámicas locales de Alicante.');
    setTimeout(() => {
      setIsConfigOpen(false);
      setKeyStatusMessage(null);
    }, 1500);
  };

  // ---------------------------------------------------------------------------
  // THREE.JS 3D SCENE SETUP (Optional Sub-Mode: Conducción 3D Día)
  // ---------------------------------------------------------------------------
  const { curve } = useMemo(() => {
    if (!route.coordinates || route.coordinates.length < 2) {
      return { curve: null };
    }
    const [refLat, refLng] = route.coordinates[0];
    const metersPerDegLat = 111320;
    const metersPerDegLng = 111320 * Math.cos((refLat * Math.PI) / 180);

    const points3D: THREE.Vector3[] = [];
    let lastPoint = new THREE.Vector3(-99999, 0, -99999);

    for (let i = 0; i < route.coordinates.length; i++) {
      const [pLat, pLng] = route.coordinates[i];
      const x = (pLng - refLng) * metersPerDegLng;
      const z = -(pLat - refLat) * metersPerDegLat;
      const pt = new THREE.Vector3(x, 0, z);

      if (pt.distanceTo(lastPoint) > 1.5) {
        points3D.push(pt);
        lastPoint = pt;
      }
    }

    return {
      curve: new THREE.CatmullRomCurve3(points3D, false, 'catmullrom', 0.15),
    };
  }, [route]);

  useEffect(() => {
    if (viewMode !== '3d-drive' || !canvasMountRef.current || !curve) return;

    const container = canvasMountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;
    const aspect = height > 0 ? width / height : 16 / 9;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x38bdf8); // Mediterranean blue sky
    scene.fog = new THREE.FogExp2(0xbae6fd, 0.0018);

    const camera = new THREE.PerspectiveCamera(65, aspect, 0.5, 3000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Warm Mediterranean Sun Light
    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.8);
    sunLight.position.set(150, 250, 100);
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0xfde047, 0.9);
    scene.add(hemiLight);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(5000, 5000);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0xd6d3d1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    scene.add(ground);

    // Road ribbon
    const roadGeo = new THREE.TubeGeometry(curve, 350, 5.5, 8, false);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.position.y = 0.02;
    scene.add(roadMesh);

    // Alicante buildings
    const buildingGroup = new THREE.Group();
    const bGeo = new THREE.BoxGeometry(1, 1, 1);
    const bColors = [0xfef3c7, 0xfde68a, 0xe2e8f0, 0xffedd5];

    for (let i = 0; i < 90; i++) {
      const t = (i / 90);
      const pt = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const side = (i % 2 === 0 ? 1 : -1) * (18 + (i % 4) * 8);
      const bHeight = 12 + (i % 6) * 7;
      const bWidth = 14 + (i % 3) * 6;

      const mat = new THREE.MeshLambertMaterial({ color: bColors[i % bColors.length] });
      const bMesh = new THREE.Mesh(bGeo, mat);
      bMesh.scale.set(bWidth, bHeight, bWidth);
      bMesh.position.copy(pt).addScaledVector(normal, side);
      bMesh.position.y = bHeight / 2;
      buildingGroup.add(bMesh);
    }
    scene.add(buildingGroup);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Interpolate along the curve based on progressT
      const t = Math.min(0.999, Math.max(0.001, progressT));
      const camPos = curve.getPointAt(t);
      const forwardT = Math.min(0.9999, t + 0.015);
      const lookAtPos = curve.getPointAt(forwardT);

      // Place camera in driver cockpit view (1.6m high)
      camera.position.set(camPos.x, 2.2, camPos.z);
      camera.lookAt(lookAtPos.x, 2.0, lookAtPos.z);

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container) container.innerHTML = '';
    };
  }, [viewMode, curve, progressT]);

  // Mini-map bounding box calculation for SVG preview
  const miniMapBounds = useMemo(() => {
    if (!route.coordinates || route.coordinates.length < 2) {
      return { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 };
    }
    let minLat = 999;
    let maxLat = -999;
    let minLng = 999;
    let maxLng = -999;

    route.coordinates.forEach(([lat, lng]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    });

    const padLat = (maxLat - minLat) * 0.15 || 0.005;
    const padLng = (maxLng - minLng) * 0.15 || 0.005;

    return {
      minLat: minLat - padLat,
      maxLat: maxLat + padLat,
      minLng: minLng - padLng,
      maxLng: maxLng + padLng,
    };
  }, [route]);

  // Convert lat/lng to SVG viewBox (100 x 100)
  const toSvgCoords = (lat: number, lng: number) => {
    const { minLat, maxLat, minLng, maxLng } = miniMapBounds;
    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    const y = 100 - ((lat - minLat) / (maxLat - minLat)) * 100;
    return { x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) };
  };

  const svgRoutePoints = useMemo(() => {
    if (!route.coordinates) return '';
    return route.coordinates
      .map(([lat, lng]) => {
        const { x, y } = toSvgCoords(lat, lng);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [route, miniMapBounds]);

  if (!activeWaypoint) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-400">
        <p>No hay puntos disponibles para esta ruta.</p>
      </div>
    );
  }

  const currentSvgPos = toSvgCoords(activeWaypoint.lat, activeWaypoint.lng);

  return (
    <div className="w-full h-full flex flex-col bg-[#0b0f19] text-white overflow-hidden select-none">
      {/* Sub-Bar: Mode Selector & Google API Key Settings */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-slate-950 border-b border-slate-800 text-xs flex-shrink-0 z-30">
        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded-lg">
          <button
            onClick={() => setViewMode('streetview-pano')}
            className={`px-3 py-1 rounded-md font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'streetview-pano'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Vista panorámica estática paso a paso simulando el trayecto real"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Panorámica Street View</span>
          </button>

          <button
            onClick={() => setViewMode('3d-drive')}
            className={`px-3 py-1 rounded-md font-bold flex items-center gap-1.5 transition-all ${
              viewMode === '3d-drive'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Simulación 3D continua de la calzada a plena luz de día"
          >
            <Sun className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Conducción 3D Día</span>
            <span className="sm:hidden">3D</span>
          </button>

          <button
            onClick={() => setViewMode('dgt-cameras')}
            className={`px-3 py-1 rounded-md font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'dgt-cameras'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Cámaras de tráfico en directo de la DGT de Alicante"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Cámaras ({route.cameras.length})</span>
          </button>
        </div>

        {/* Right side: Key configuration button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              apiKey
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-cyan-500'
            }`}
            title="Configurar clave propia de Google Maps Street View"
          >
            <Key className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">
              {apiKey ? 'Google API Activa' : 'Configurar Clave Google'}
            </span>
            <span className="sm:hidden">{apiKey ? 'API OK' : 'Clave'}</span>
          </button>
        </div>
      </div>

      {/* Slide-down Google Street View API Key Drawer */}
      {isConfigOpen && (
        <div className="bg-slate-900/95 border-b border-cyan-500/30 p-3 sm:p-4 z-40 backdrop-blur-md animate-in slide-in-from-top duration-200">
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-bold text-white">
                  Clave API de Google Street View (Almacenamiento Local)
                </h4>
              </div>
              <button
                onClick={() => setIsConfigOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Si introduces tu clave de Google Cloud con la <strong>Street View Static API</strong> habilitada, verás fotos fotorrealistas oficiales de Google para cada coordenada exacta del trayecto. Si no introduces ninguna clave, el sistema utiliza el catálogo de panorámicas de alta resolución de Alicante y las 159 cámaras en directo de la DGT de forma 100% gratuita.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Pega aquí tu Google Maps / Street View API Key..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                onClick={handleSaveKey}
                disabled={isTestingKey}
                className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Guardar
              </button>
              {apiKey && (
                <button
                  onClick={handleClearKey}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 text-xs font-semibold"
                >
                  Borrar
                </button>
              )}
            </div>
            {keyStatusMessage && (
              <p className="text-xs text-cyan-300 font-mono animate-in fade-in">
                {keyStatusMessage}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Viewport + Telemetry Panel Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden min-h-0 relative">
        {/* Left 2 Cols: Main Panoramic Street View Display */}
        <div className="lg:col-span-2 relative bg-black flex flex-col items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800">
          
          {/* MODE 1: STREET VIEW PANORAMIC IMAGES (Simulating real path) */}
          {viewMode === 'streetview-pano' && (
            <div className="relative w-full h-full flex items-center justify-center bg-slate-950 overflow-hidden">
              {/* Wide-Angle Static Panoramic Street Image */}
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                <img
                  key={activeWaypoint.id + '-' + angleOffset}
                  src={activeImageUrl}
                  alt={`Street View en ${activeWaypoint.streetName}`}
                  onError={() => setGoogleImgFailed(true)}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out select-none"
                  style={{
                    transform: `scale(1.05) translateX(${angleOffset * -0.2}%) translateY(${pitchOffset * -0.5}%)`,
                  }}
                />

                {/* Subtle Cinematic Vignette & Lighting Contrast Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/50 pointer-events-none" />

                {/* Top-Left: Spanish / Alicante Street Sign Badge */}
                <div className="absolute top-4 left-4 z-20 pointer-events-auto">
                  <div className="bg-slate-950/90 backdrop-blur-md border-2 border-cyan-500/60 rounded-xl px-3.5 py-2.5 shadow-2xl flex items-center gap-3 max-w-sm sm:max-w-md">
                    <div className="w-9 h-9 rounded-lg bg-blue-600/30 border border-blue-400 text-blue-300 flex items-center justify-center font-bold flex-shrink-0">
                      {activeWaypoint.maneuverType === 'turn-right' ? (
                        <CornerUpRight className="w-5 h-5 text-amber-400" />
                      ) : activeWaypoint.maneuverType === 'turn-left' ? (
                        <CornerUpLeft className="w-5 h-5 text-amber-400" />
                      ) : (
                        <ArrowUp className="w-5 h-5 text-emerald-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                          ALICANTE · STREET VIEW
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {activeWaypoint.speedLimit} km/h
                        </span>
                      </div>
                      <h4 className="text-sm sm:text-base font-extrabold text-white truncate">
                        {activeWaypoint.streetName}
                      </h4>
                      <p className="text-[11px] text-slate-300 truncate">
                        {activeWaypoint.instruction}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Top-Right: Image Provider Badge & External 360 Photosphere Button */}
                <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2 pointer-events-auto">
                  <div className="flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 rounded-lg text-[11px] font-mono shadow-xl">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-slate-200 font-semibold">
                      {apiKey && !googleImgFailed ? 'Google Street View Static' : 'Panorámica de Calle (Alicante)'}
                    </span>
                  </div>

                  <a
                    href={externalGoogleStreetViewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-2xl transition-all cursor-pointer active:scale-95"
                    title="Abrir la esfera 360° interactiva oficial en Google Maps"
                  >
                    <span>Ver Esfera 360° Google</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* In-Car Windshield Cockpit HUD at Bottom-Center */}
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-full max-w-xl px-4 flex items-center justify-between">
                  {/* Left: Speedometer */}
                  <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl shadow-2xl pointer-events-auto flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-mono block">Velocidad</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {isPlaying ? `${activeWaypoint.speedLimit - 2} km/h` : '0 km/h (Pausa)'}
                      </span>
                    </div>
                  </div>

                  {/* Center: Bearing & Compass */}
                  <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 px-3.5 py-1.5 rounded-xl shadow-2xl pointer-events-auto flex items-center gap-2">
                    <Compass className="w-4 h-4 text-cyan-400" />
                    <div className="text-center">
                      <span className="text-[9px] text-slate-400 uppercase font-mono block">Rumbo Calzada</span>
                      <span className="text-xs font-mono font-bold text-cyan-300">
                        {currentHeading}°
                      </span>
                    </div>
                  </div>

                  {/* Right: Distance Covered */}
                  <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl shadow-2xl pointer-events-auto flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-blue-400" />
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 uppercase font-mono block">Recorrido</span>
                      <span className="text-xs font-mono font-bold text-slate-200">
                        {activeWaypoint.distanceMeters} m
                      </span>
                    </div>
                  </div>
                </div>

                {/* Camera Angle Looking Bar (Left -45°, Front 0°, Right +45°, Rear 180°) */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-950/90 backdrop-blur-md border border-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-2xl z-20 pointer-events-auto">
                  <button
                    onClick={() => setAngleOffset(-45)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      angleOffset === -45
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Mirar a la izquierda (-45°)"
                  >
                    <span>↺</span>
                    <span className="hidden sm:inline">Izquierda</span>
                  </button>

                  <button
                    onClick={() => setAngleOffset(0)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      angleOffset === 0
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Mirar al frente (sentido de la marcha)"
                  >
                    <span>⬆️</span>
                    <span>Frente</span>
                  </button>

                  <button
                    onClick={() => setAngleOffset(45)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      angleOffset === 45
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Mirar a la derecha (+45°)"
                  >
                    <span className="hidden sm:inline">Derecha</span>
                    <span>↻</span>
                  </button>

                  <button
                    onClick={() => setAngleOffset(180)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      angleOffset === 180
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="Mirar hacia atrás (180°)"
                  >
                    <span>⬇️</span>
                  </button>
                </div>

                {/* Picture-in-Picture: Live Traffic Camera Feed when available nearby */}
                {activeWaypoint.nearbyCamera && showLiveCamPiP && (
                  <div className="absolute top-20 right-4 w-44 sm:w-52 bg-slate-950/95 border border-emerald-500/50 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md z-20 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between px-2 py-1 bg-slate-900 border-b border-slate-800">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] font-mono font-bold text-emerald-400 truncate">
                          CÁMARA DGT EN CRUCE
                        </span>
                      </div>
                      <button
                        onClick={() => setShowLiveCamPiP(false)}
                        className="text-slate-400 hover:text-white p-0.5"
                        title="Ocultar miniatura"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="relative aspect-[4/3] bg-black">
                      <img
                        src={`${activeWaypoint.nearbyCamera.url}&t=${cacheBuster}`}
                        alt={activeWaypoint.nearbyCamera.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=300&q=80';
                        }}
                      />
                      <div className="absolute bottom-1 left-1 right-1 bg-slate-950/85 px-1.5 py-0.5 rounded text-[9px] text-slate-200 font-mono truncate">
                        {activeWaypoint.nearbyCamera.name} ({activeWaypoint.nearbyCamera.distanceMeters}m)
                      </div>
                    </div>
                  </div>
                )}

                {/* Interactive Inset Mini-Map with Moving FOV Car Marker */}
                {showMiniMap && (
                  <div className="absolute bottom-3 right-3 w-32 h-32 sm:w-40 sm:h-40 bg-slate-950/90 border border-slate-700/80 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md z-20 p-1 flex flex-col pointer-events-auto">
                    <div className="flex items-center justify-between px-1.5 py-0.5 text-[9px] font-mono text-slate-400">
                      <span>TRAZADO RUTA</span>
                      <button
                        onClick={() => setShowMiniMap(false)}
                        className="text-slate-500 hover:text-white"
                        title="Ocultar minimapa"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <div className="flex-1 relative bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        {/* Background route polyline */}
                        <polyline
                          points={svgRoutePoints}
                          fill="none"
                          stroke="#0284c7"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity="0.8"
                        />
                        {/* Active path completed */}
                        <polyline
                          points={svgRoutePoints}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2.5"
                          strokeDasharray="4 2"
                        />

                        {/* Origin and destination markers */}
                        {route.coordinates && route.coordinates.length > 0 && (
                          <>
                            <circle
                              cx={toSvgCoords(route.coordinates[0][0], route.coordinates[0][1]).x}
                              cy={toSvgCoords(route.coordinates[0][0], route.coordinates[0][1]).y}
                              r="3"
                              fill="#10b981"
                            />
                            <circle
                              cx={toSvgCoords(route.coordinates[route.coordinates.length - 1][0], route.coordinates[route.coordinates.length - 1][1]).x}
                              cy={toSvgCoords(route.coordinates[route.coordinates.length - 1][0], route.coordinates[route.coordinates.length - 1][1]).y}
                              r="3"
                              fill="#ef4444"
                            />
                          </>
                        )}

                        {/* Current Position with Field of View (FOV) Cone */}
                        <g transform={`translate(${currentSvgPos.x}, ${currentSvgPos.y}) rotate(${currentHeading})`}>
                          {/* FOV Vision Cone */}
                          <path
                            d="M 0 0 L -8 -16 A 16 16 0 0 1 8 -16 Z"
                            fill="#06b6d4"
                            opacity="0.45"
                          />
                          {/* Vehicle dot */}
                          <circle cx="0" cy="0" r="3.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
                        </g>
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Prev / Next Waypoint Click Buttons on Canvas Sides */}
              <button
                onClick={goToPrev}
                disabled={currentIndex === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-950/80 hover:bg-slate-900 text-white border border-slate-700/80 backdrop-blur-md shadow-xl transition-all active:scale-95 disabled:opacity-20 disabled:pointer-events-none z-20"
                title="Punto anterior (←)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={goToNext}
                disabled={currentIndex === waypoints.length - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-950/80 hover:bg-slate-900 text-white border border-slate-700/80 backdrop-blur-md shadow-xl transition-all active:scale-95 disabled:opacity-20 disabled:pointer-events-none z-20"
                title="Punto siguiente (→)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* MODE 2: 3D DAYTIME DRIVING SIMULATION (Three.js) */}
          {viewMode === '3d-drive' && (
            <div className="relative w-full h-full flex items-center justify-center bg-[#38bdf8] overflow-hidden">
              <div
                ref={canvasMountRef}
                className="w-full h-full relative cursor-grab active:cursor-grabbing select-none"
              />
              <div className="absolute bottom-3 left-4 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-cyan-300 z-10">
                Simulador 3D Calzada Alicante · {activeWaypoint.streetName}
              </div>
            </div>
          )}

          {/* MODE 3: DGT TRAFFIC CAMERAS TOUR */}
          {viewMode === 'dgt-cameras' && (
            <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 p-4 overflow-hidden">
              {activeWaypoint.nearbyCamera ? (
                <div className="w-full max-w-2xl bg-slate-900 border border-emerald-500/50 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                  <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      CÁMARA DGT EN DIRECTO · {activeWaypoint.nearbyCamera.zona}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                      {activeWaypoint.nearbyCamera.status}
                    </span>
                  </div>
                  <div className="relative aspect-[16/10] bg-black">
                    <img
                      src={`${activeWaypoint.nearbyCamera.url}&t=${cacheBuster}`}
                      alt={activeWaypoint.nearbyCamera.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80';
                      }}
                    />
                    <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-mono text-white border border-slate-700">
                      {activeWaypoint.nearbyCamera.name}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl max-w-md space-y-3">
                  <Video className="w-12 h-12 text-slate-500 mx-auto" />
                  <h4 className="text-base font-bold text-white">Sin cámara fija en este metro</h4>
                  <p className="text-xs text-slate-300">
                    Avanza por la ruta o regresa a la <strong>Panorámica Street View</strong> para ver la imagen de este tramo.
                  </p>
                  <button
                    onClick={() => setViewMode('streetview-pano')}
                    className="mt-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                  >
                    Volver a Panorámica Street View
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Col: Telemetry, Waypoint Details & Controls */}
        <div className="p-4 sm:p-5 flex flex-col justify-between overflow-y-auto bg-[#0b0f19] space-y-4">
          <div className="space-y-4">
            {/* Header info */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
                  Progreso: {activeWaypoint.progressPercent}% de la ruta
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                  Punto {currentIndex + 1}/{waypoints.length}
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-white tracking-tight">
                {activeWaypoint.streetName}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {activeWaypoint.instruction}
              </p>
            </div>

            {/* Key Telemetry Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Rumbo Calzada</span>
                <span className="text-sm font-bold font-mono text-cyan-400 flex items-center gap-1 mt-0.5">
                  <Compass className="w-3.5 h-3.5" />
                  {currentHeading}°
                </span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Distancia Recorrida</span>
                <span className="text-sm font-bold font-mono text-slate-200 flex items-center gap-1 mt-0.5">
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                  {activeWaypoint.distanceMeters} m
                </span>
              </div>
            </div>

            {/* Nearby DGT Camera Notification */}
            {activeWaypoint.nearbyCamera ? (
              <div className="bg-slate-900/70 border border-emerald-500/40 rounded-xl p-3 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-emerald-400" />
                    Cámara DGT en este tramo
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {activeWaypoint.nearbyCamera.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-medium">
                  {activeWaypoint.nearbyCamera.name} ({activeWaypoint.nearbyCamera.zona})
                </p>
                {!showLiveCamPiP && (
                  <button
                    onClick={() => setShowLiveCamPiP(true)}
                    className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Mostrar miniatura de cámara
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-400 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span>Sin cámara de vigilancia fija en los próximos 250m.</span>
              </div>
            )}

            {/* Direct 360 Photosphere Link */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                Google Street View 360° Oficial:
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Abre la esfera panorámica inmersiva a 360° en las coordenadas exactas ({activeWaypoint.lat.toFixed(4)}, {activeWaypoint.lng.toFixed(4)}):
              </p>
              <a
                href={externalGoogleStreetViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Abrir en Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Toggle Mini-Map button if hidden */}
            {!showMiniMap && (
              <button
                onClick={() => setShowMiniMap(true)}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-colors"
              >
                <MapIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Mostrar Minimapa de Trazado</span>
              </button>
            )}
          </div>

          {/* Stepper Navigation Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={goToPrev}
              disabled={currentIndex === 0}
              className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-700 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior Cruce</span>
            </button>
            <button
              onClick={goToNext}
              disabled={currentIndex === waypoints.length - 1}
              className="flex-1 py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-40"
            >
              <span>Siguiente Cruce</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Timeline & Driving Controls Bar */}
      <div className="bg-[#0f172a] border-t border-slate-800 p-2.5 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 z-20">
        {/* Play / Pause / Reset & Speed Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors ${
              isPlaying
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-200 border border-slate-700 hover:text-white'
            }`}
            title={isPlaying ? 'Pausar recorrido' : 'Iniciar recorrido continuo'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="hidden sm:inline">{isPlaying ? 'Pausar' : 'Avanzar'}</span>
          </button>

          <button
            onClick={() => {
              handleJumpToIndex(0);
              setIsPlaying(true);
            }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Reiniciar tour desde el origen"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Speed multiplier selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs">
            {[0.5, 1, 2, 3].map((s) => (
              <button
                key={s}
                onClick={() => setSpeedMultiplier(s)}
                className={`px-2 py-0.5 rounded font-mono font-bold transition-colors ${
                  speedMultiplier === s
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Progress Slider (Scrubber along calculated route points) */}
        <div className="flex-1 max-w-md flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={waypoints.length - 1}
            value={currentIndex}
            onChange={(e) => handleJumpToIndex(Number(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <span className="text-[11px] font-mono text-slate-400 flex-shrink-0">
            {currentIndex + 1}/{waypoints.length}
          </span>
        </div>

        {/* Origin / Destination Summary */}
        <div className="text-[11px] text-slate-400 font-mono hidden md:block">
          {origin.name} ➔ {destination.name}
        </div>
      </div>
    </div>
  );
};
