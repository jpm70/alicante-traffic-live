import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
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

type CameraViewMode = 'cockpit' | 'chase' | 'aerial';

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
        <div className="flex items-center justify-between px-4 py-3 bg-[#0f172a]/95 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex-shrink-0">
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
          <div className="flex items-center gap-2">
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
// SUB-VIEW 1: FLYTHROUGH 3D VIEW (Three.js WebGL Engine)
// ---------------------------------------------------------------------------
interface Flythrough3DViewProps {
  route: CalculatedRoute;
  cacheBuster: number;
}

const Flythrough3DView: React.FC<Flythrough3DViewProps> = ({ route, cacheBuster }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0); // 0 to 1
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(2); // 0.5x, 1x, 2x, 4x
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('chase');
  const [showLiveCamPip, setShowLiveCamPip] = useState<boolean>(false);

  // Live Telemetry
  const [telemetry, setTelemetry] = useState<{
    speedKmH: number;
    distanceCoveredKm: number;
    totalDistanceKm: number;
    bearingDeg: number;
    bearingLabel: string;
    nearestCamera: {
      name: string;
      zona: string;
      status: string;
      url: string;
      distanceMeters: number;
    } | null;
  }>({
    speedKmH: 60,
    distanceCoveredKm: 0,
    totalDistanceKm: route.distanceKm,
    bearingDeg: 0,
    bearingLabel: 'N',
    nearestCamera: null,
  });

  // State refs for animation loop
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const progressRef = useRef(progress);
  progressRef.current = progress;

  const speedMultiplierRef = useRef(speedMultiplier);
  speedMultiplierRef.current = speedMultiplier;

  const cameraModeRef = useRef(cameraMode);
  cameraModeRef.current = cameraMode;

  // Pre-calculate 3D curve and meter coordinates
  const { curve, totalDistanceMeters, cameraPoints3D } = useMemo(() => {
    const coords = route.coordinates;
    if (coords.length < 2) {
      return { curve: null, totalDistanceMeters: 1000, cameraPoints3D: [] };
    }

    const refLat = coords[0][0];
    const refLng = coords[0][1];
    const latRad = (refLat * Math.PI) / 180;
    const metersPerDegLat = 110574;
    const metersPerDegLng = 111320 * Math.cos(latRad);

    const points3D: THREE.Vector3[] = [];
    let lastPoint = new THREE.Vector3(0, 0, 0);
    points3D.push(lastPoint);

    for (let i = 1; i < coords.length; i++) {
      const lat = coords[i][0];
      const lng = coords[i][1];
      const x = (lng - refLng) * metersPerDegLng;
      const z = -(lat - refLat) * metersPerDegLat; // -Z is North
      const pt = new THREE.Vector3(x, 0, z);

      // Avoid duplicate consecutive points
      if (pt.distanceTo(lastPoint) > 1) {
        points3D.push(pt);
        lastPoint = pt;
      }
    }

    // Generate Catmull-Rom smooth spline curve
    const splineCurve = new THREE.CatmullRomCurve3(points3D, false, 'catmullrom', 0.15);
    const length = splineCurve.getLength();

    // Map traffic cameras to 3D space
    const cam3D = route.cameras.map((c) => {
      const x = (c.lng - refLng) * metersPerDegLng;
      const z = -(c.lat - refLat) * metersPerDegLat;
      return {
        camera: c,
        position: new THREE.Vector3(x, 0, z),
      };
    });

    return {
      curve: splineCurve,
      totalDistanceMeters: Math.max(length, route.distanceKm * 1000),
      cameraPoints3D: cam3D,
    };
  }, [route]);

  // Three.js Scene Setup & Loop
  useEffect(() => {
    if (!mountRef.current || !curve) return;

    const container = mountRef.current;
    const width = Math.max(container.clientWidth || 0, window.innerWidth || 800);
    const height = Math.max(container.clientHeight || 0, window.innerHeight ? window.innerHeight - 130 : 600);
    const aspect = height > 0 ? width / height : 16 / 9;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.002);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(65, aspect, 0.5, 4000);
    camera.position.set(0, 15, 25);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0x38bdf8, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(100, 200, 100);
    scene.add(dirLight);

    const cyanLight = new THREE.PointLight(0x06b6d4, 1.5, 300);
    scene.add(cyanLight);

    // 5. Ground Plane & Cyber-Tactical Grid
    const groundGeo = new THREE.PlaneGeometry(8000, 8000);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x080d1a,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    scene.add(ground);

    const grid = new THREE.GridHelper(8000, 160, 0x1e293b, 0x0f172a);
    grid.position.y = 0;
    scene.add(grid);

    // 6. 3D Road Ribbon Generation
    const numSamples = 600;
    const roadPoints = curve.getSpacedPoints(numSamples);
    const roadHalfWidth = 4.2; // ~8.4m wide road

    const roadVertices: number[] = [];
    const roadIndices: number[] = [];
    const roadUVs: number[] = [];

    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      const pt = roadPoints[i] || curve.getPointAt(t);
      const tangent = curve.getTangentAt(Math.min(t, 0.999)).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const left = new THREE.Vector3().copy(pt).addScaledVector(normal, -roadHalfWidth);
      const right = new THREE.Vector3().copy(pt).addScaledVector(normal, roadHalfWidth);

      left.y = 0.1;
      right.y = 0.1;

      roadVertices.push(left.x, left.y, left.z);
      roadVertices.push(right.x, right.y, right.z);

      roadUVs.push(0, t * 50);
      roadUVs.push(1, t * 50);

      if (i < numSamples) {
        const base = i * 2;
        roadIndices.push(base, base + 1, base + 2);
        roadIndices.push(base + 1, base + 3, base + 2);
      }
    }

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadVertices, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUVs, 2));
    roadGeo.setIndex(roadIndices);
    roadGeo.computeVertexNormals();

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.2,
      wireframe: false,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    scene.add(roadMesh);

    // Glowing Road Borders
    const borderLeftPoints: THREE.Vector3[] = [];
    const borderRightPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      const pt = roadPoints[i];
      const tangent = curve.getTangentAt(Math.min(t, 0.999)).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
      borderLeftPoints.push(new THREE.Vector3().copy(pt).addScaledVector(normal, -roadHalfWidth).add(new THREE.Vector3(0, 0.2, 0)));
      borderRightPoints.push(new THREE.Vector3().copy(pt).addScaledVector(normal, roadHalfWidth).add(new THREE.Vector3(0, 0.2, 0)));
    }

    const borderMat = new THREE.LineBasicMaterial({
      color: route.status === 'fluido' ? 0x10b981 : 0x06b6d4,
      linewidth: 2,
    });
    const borderLeftLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(borderLeftPoints), borderMat);
    const borderRightLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(borderRightPoints), borderMat);
    scene.add(borderLeftLine);
    scene.add(borderRightLine);

    // 7. 3D Vehicle Drone Representation
    const vehicleGroup = new THREE.Group();

    // Drone / Car chassis
    const bodyGeo = new THREE.BoxGeometry(2.2, 0.8, 4.2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x0369a1,
      emissiveIntensity: 0.3,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.7;
    vehicleGroup.add(bodyMesh);

    // Cab / Cockpit glass
    const glassGeo = new THREE.BoxGeometry(1.8, 0.6, 2.2);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.75,
    });
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.position.set(0, 1.3, -0.3);
    vehicleGroup.add(glassMesh);

    // Headlights (Spotlights projecting forward on the road)
    const headlightLeft = new THREE.SpotLight(0xffffff, 3.5, 60, Math.PI / 6, 0.3);
    headlightLeft.position.set(-0.8, 0.7, -2.1);
    const headlightTargetLeft = new THREE.Object3D();
    headlightTargetLeft.position.set(-0.8, 0, -35);
    vehicleGroup.add(headlightLeft);
    vehicleGroup.add(headlightTargetLeft);
    headlightLeft.target = headlightTargetLeft;

    const headlightRight = new THREE.SpotLight(0xffffff, 3.5, 60, Math.PI / 6, 0.3);
    headlightRight.position.set(0.8, 0.7, -2.1);
    const headlightTargetRight = new THREE.Object3D();
    headlightTargetRight.position.set(0.8, 0, -35);
    vehicleGroup.add(headlightRight);
    vehicleGroup.add(headlightTargetRight);
    headlightRight.target = headlightTargetRight;

    // Rear taillights (Red glow)
    const tailLight = new THREE.PointLight(0xef4444, 2, 8);
    tailLight.position.set(0, 0.8, 2.2);
    vehicleGroup.add(tailLight);

    scene.add(vehicleGroup);

    // 8. 3D Camera Totems at Traffic Camera locations
    const cameraTotemGroups: { group: THREE.Group; cam: any; ring: THREE.Mesh }[] = [];
    cameraPoints3D.forEach(({ camera: cam, position: pos }) => {
      const totem = new THREE.Group();
      totem.position.copy(pos);

      // Pole
      const poleGeo = new THREE.CylinderGeometry(0.2, 0.25, 7, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 3.5;
      totem.add(pole);

      // Camera Box
      const camColor =
        cam.status === 'fluido' ? 0x10b981 : cam.status === 'denso' ? 0xf59e0b : 0xef4444;
      const boxGeo = new THREE.BoxGeometry(1.2, 0.8, 1.4);
      const boxMat = new THREE.MeshStandardMaterial({
        color: camColor,
        emissive: camColor,
        emissiveIntensity: 0.5,
      });
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.position.y = 7.2;
      totem.add(box);

      // Animated scanning radar ring
      const ringGeo = new THREE.RingGeometry(1.5, 2.2, 16);
      const ringMat = new THREE.MeshBasicMaterial({
        color: camColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.3;
      totem.add(ring);

      scene.add(totem);
      cameraTotemGroups.push({ group: totem, cam, ring });
    });

    // 9. Animation Loop
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const now = performance.now();
      const deltaSec = (now - lastTime) / 1000;
      lastTime = now;

      // Update progress if playing
      if (isPlayingRef.current) {
        // Base tour duration: ~45 seconds for full route at 1x speed
        const speed = (1 / 45) * speedMultiplierRef.current;
        let nextP = progressRef.current + speed * deltaSec;
        if (nextP > 1) {
          nextP = 1;
          setIsPlaying(false);
        }
        progressRef.current = nextP;
        setProgress(nextP);
      }

      const t = Math.max(0.0001, Math.min(progressRef.current, 0.9999));

      // Vehicle Position & Heading
      const currentPos = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();
      vehicleGroup.position.copy(currentPos);

      // Orient vehicle along tangent
      const targetLook = new THREE.Vector3().copy(currentPos).add(tangent);
      vehicleGroup.lookAt(targetLook);

      // Point cyan light slightly ahead of vehicle
      cyanLight.position.copy(currentPos).add(new THREE.Vector3(0, 10, 0));

      // Camera Follow Styles
      const mode = cameraModeRef.current;
      if (mode === 'cockpit') {
        // Driver's eye view on the car hood
        const cockpitPos = new THREE.Vector3().copy(currentPos).addScaledVector(tangent, 1.2).add(new THREE.Vector3(0, 1.3, 0));
        camera.position.lerp(cockpitPos, 0.3);
        const lookAhead = new THREE.Vector3().copy(currentPos).addScaledVector(tangent, 40).add(new THREE.Vector3(0, 1.2, 0));
        camera.lookAt(lookAhead);
      } else if (mode === 'chase') {
        // Cinematic chase drone behind and above
        const chasePos = new THREE.Vector3().copy(currentPos).addScaledVector(tangent, -14).add(new THREE.Vector3(0, 6, 0));
        camera.position.lerp(chasePos, 0.15);
        const lookTarget = new THREE.Vector3().copy(currentPos).addScaledVector(tangent, 15).add(new THREE.Vector3(0, 1.5, 0));
        camera.lookAt(lookTarget);
      } else {
        // Aerial helicopter view (High overhead)
        const aerialPos = new THREE.Vector3().copy(currentPos).addScaledVector(tangent, -24).add(new THREE.Vector3(0, 32, 0));
        camera.position.lerp(aerialPos, 0.1);
        const lookTarget = new THREE.Vector3().copy(currentPos).addScaledVector(tangent, 8);
        camera.lookAt(lookTarget);
      }

      // Animate camera radar rings
      cameraTotemGroups.forEach(({ ring }, idx) => {
        const s = 1 + 0.3 * Math.sin(now * 0.004 + idx);
        ring.scale.set(s, s, s);
      });

      // Update Telemetry calculations
      const distCovered = route.distanceKm * t;
      const angleRad = Math.atan2(tangent.x, -tangent.z);
      let bearingDeg = Math.round((angleRad * 180) / Math.PI);
      if (bearingDeg < 0) bearingDeg += 360;

      const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
      const dirIndex = Math.round(bearingDeg / 45) % 8;
      const bearingLabel = directions[dirIndex];

      // Simulated speed in km/h based on route speed and traffic
      const baseSpeed = (route.distanceKm / (route.totalMinutes / 60)) || 55;
      const curSpeed = Math.round(baseSpeed + 8 * Math.sin(t * 20));

      // Nearest Traffic Camera check
      let nearestCam: any = null;
      let minDistance = 250; // trigger proximity within 250 meters

      for (const { camera: c, position: cPos } of cameraPoints3D) {
        const d = currentPos.distanceTo(cPos);
        if (d < minDistance) {
          minDistance = d;
          nearestCam = {
            name: c.name,
            zona: c.zona,
            status: c.status,
            url: c.url,
            distanceMeters: Math.round(d),
          };
        }
      }

      setTelemetry({
        speedKmH: curSpeed,
        distanceCoveredKm: Math.round(distCovered * 10) / 10,
        totalDistanceKm: route.distanceKm,
        bearingDeg,
        bearingLabel,
        nearestCamera: nearestCam,
      });

      renderer.render(scene, camera);
    };

    animate();

    // Handle Resize with Window Listener + ResizeObserver
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || (window.innerHeight - 130);
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    // Initial delayed kick to ensure rendering once DOM transitions finish
    const timer = setTimeout(handleResize, 60);

    // Cleanup WebGL resources
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      renderer.dispose();
      roadGeo.dispose();
      groundGeo.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [curve, route, cameraPoints3D]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setProgress(val);
    progressRef.current = val;
  };

  const handleReset = () => {
    setProgress(0);
    progressRef.current = 0;
    setIsPlaying(true);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing" />

      {/* OVERLAY: Cockpit HUD & Telemetry (Top-Left) */}
      <div className="absolute top-3 left-3 pointer-events-none flex flex-col gap-2 z-10">
        {/* Speedometer & Compass Badge */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 rounded-xl p-3 shadow-xl flex items-center gap-4 text-white">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="text-xl font-black font-mono text-cyan-400 leading-none">
                {telemetry.speedKmH}{' '}
                <span className="text-[10px] text-slate-400 font-normal">km/h</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Velocidad</div>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-800" />

          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-base font-bold font-mono text-emerald-400 leading-none">
                {telemetry.bearingLabel}{' '}
                <span className="text-[11px] text-slate-400 font-normal">({telemetry.bearingDeg}°)</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Rumbo</div>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-800" />

          <div>
            <div className="text-base font-bold font-mono text-slate-200 leading-none">
              {telemetry.distanceCoveredKm}{' '}
              <span className="text-[10px] text-slate-400 font-normal">/ {telemetry.totalDistanceKm} km</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Recorrido</div>
          </div>
        </div>
      </div>

      {/* OVERLAY: Picture-in-Picture Live Camera Alert (Top-Right when passing near camera) */}
      {telemetry.nearestCamera && !showLiveCamPip && (
        <button
          onClick={() => setShowLiveCamPip(true)}
          className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-emerald-500/50 text-slate-200 hover:text-white text-xs font-semibold shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          title="Ver imagen en vivo de la cámara próxima en este tramo"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono text-emerald-400 font-bold truncate max-w-[140px]">
            {telemetry.nearestCamera.name}
          </span>
          <span className="text-[10px] text-slate-400">({telemetry.nearestCamera.distanceMeters}m)</span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono ml-0.5">
            Ver Cámara
          </span>
        </button>
      )}

      {telemetry.nearestCamera && showLiveCamPip && (
        <div className="absolute top-3 right-3 z-10 w-64 sm:w-72 bg-slate-900/95 backdrop-blur-md border border-emerald-500/60 rounded-xl p-2.5 shadow-2xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Cámara en este tramo
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-slate-400">
                {telemetry.nearestCamera.distanceMeters} m
              </span>
              <button
                onClick={() => setShowLiveCamPip(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                title="Cerrar vista de cámara (despejar ruta 3D)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
            <img
              src={`${telemetry.nearestCamera.url}&t=${cacheBuster}`}
              alt={telemetry.nearestCamera.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&q=80';
              }}
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-1.5">
              <p className="text-[11px] font-bold text-white truncate leading-tight">
                {telemetry.nearestCamera.name}
              </p>
              <p className="text-[9px] text-slate-300 font-mono capitalize">
                Tráfico {telemetry.nearestCamera.status} · {telemetry.nearestCamera.zona}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY: Camera Mode Buttons (Middle Right) */}
      <div className="absolute right-3 bottom-20 z-10 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1.5 rounded-xl shadow-xl">
        <button
          onClick={() => setCameraMode('cockpit')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            cameraMode === 'cockpit'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Vista en primera persona (Conductor)"
        >
          <Car className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Conductor</span>
        </button>

        <button
          onClick={() => setCameraMode('chase')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            cameraMode === 'chase'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Vista cinematográfica de persecución (Dron)"
        >
          <Radio className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Dron Seguidor</span>
        </button>

        <button
          onClick={() => setCameraMode('aerial')}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            cameraMode === 'aerial'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Vista aérea cenital (Helicóptero)"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Vista Aérea</span>
        </button>
      </div>

      {/* BOTTOM CONTROLLER BAR: Playback, Scrubber & Speed Selector */}
      <div className="bg-[#0f172a]/95 backdrop-blur-md border-t border-slate-800 p-3 sm:px-5 flex flex-col gap-2 z-10 flex-shrink-0">
        {/* Timeline Scrubber */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-400 w-10 text-right">
            {Math.round(progress * 100)}%
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={progress}
            onChange={handleSeek}
            className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <span className="text-[11px] font-mono text-slate-400 w-14">
            {telemetry.distanceCoveredKm} / {telemetry.totalDistanceKm}k
          </span>
        </div>

        {/* Playback Controls & Speed */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pausar Vuelo' : 'Iniciar Vuelo'}</span>
            </button>

            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
              title="Reiniciar desde el origen"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar</span>
            </button>
          </div>

          {/* Speed Multiplier Segmented Buttons */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
            <span className="text-[10px] text-slate-400 uppercase font-mono px-1 hidden sm:inline">
              Velocidad:
            </span>
            {[0.5, 1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => setSpeedMultiplier(s)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
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
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
        {/* Left 2 Cols: High-Res Camera Viewport */}
        <div className="lg:col-span-2 relative bg-black flex items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800">
          <img
            src={
              imageError
                ? 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80'
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
        <div className="p-4 sm:p-5 flex flex-col justify-between overflow-y-auto bg-[#0b0f19] space-y-4">
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
                  'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=100&q=80';
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
