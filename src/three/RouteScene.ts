// Shared Three.js engine for the route tours ("Vuelo 3D" and "Conducción 3D").
//
// What it draws, all georeferenced with the same local projection:
//  - the real city as ground texture (Esri tiles: dark basemap at night, satellite by day)
//  - real building footprints from OpenStreetMap, extruded (loaded in the background)
//  - the route as a flat ribbon following the exact polyline (no spline shortcuts)
//  - a car oriented along the direction of travel and the traffic cameras on the route
//
// One renderer per view for its whole life: React only sends commands (play, seek,
// camera mode...) so the WebGL context is never recreated while the tour runs.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CalculatedRoute, RouteTrafficCamera } from '../services/routing';
import { streamBuildings, BuildingFootprint } from '../services/osmBuildings';
import {
  LatLng,
  RouteIndex,
  buildRouteIndex,
  pointAtDistance,
  makeLocalProjection,
  simplifyPolyline,
  angleDifference,
} from '../services/geometry';

export type SceneTheme = 'night' | 'day';
export type CameraMode = 'cockpit' | 'chase' | 'aerial';

export interface SceneTelemetry {
  distanceMeters: number;
  totalMeters: number;
  speedKmH: number;
  bearingDeg: number;
  playing: boolean;
  finished: boolean;
  nearestCamera: {
    id: string;
    name: string;
    zona: string;
    status: string;
    url: string;
    distanceMeters: number;
  } | null;
  buildingsStatus: 'loading' | 'ready' | 'unavailable' | 'off';
}

export interface RouteSceneOptions {
  theme: SceneTheme;
  cameraMode: CameraMode;
  // Simulated seconds per real second (time-lapse factor)
  timeCompression?: number;
  autoplay?: boolean;
  showBuildings?: boolean;
  onTelemetry?: (t: SceneTelemetry) => void;
}

// Phones and car head units: fewer pixels, fewer tiles, fewer buildings
export function isLowPowerDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const cores = navigator.hardwareConcurrency || 4;
  const mobile = /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent);
  return cores <= 4 || mobile;
}

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

// Both themes use real aerial imagery (streets, roofs, coastline); at night it is darkened
// and the street-name labels are drawn on top.
const TILE_SOURCES: Record<SceneTheme, { base: string; overlay?: string; background: string; filter?: string }> = {
  night: {
    base: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    overlay: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    background: '#1b1f27',
    filter: 'brightness(0.5) saturate(0.55) contrast(1.15)',
  },
  day: {
    base: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    background: '#6b7a6a',
  },
};

// --- Web Mercator tile math ----------------------------------------------------
const lng2tile = (lng: number, z: number) => ((lng + 180) / 360) * 2 ** z;
const lat2tile = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
};
const tile2lng = (x: number, z: number) => (x / 2 ** z) * 360 - 180;
const tile2lat = (y: number, z: number) => {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

// --- Buildings: OpenStreetMap footprints (src/services/osmBuildings.ts) -----------
// -------------------------------------------------------------------------------
export class RouteScene {
  private container: HTMLElement;
  private route: CalculatedRoute;
  private opts: Required<Omit<RouteSceneOptions, 'onTelemetry'>> & Pick<RouteSceneOptions, 'onTelemetry'>;
  private lowPower = isLowPowerDevice();

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private car = new THREE.Group();
  private cameraTotems: { cam: RouteTrafficCamera; pos: THREE.Vector3; ring: THREE.Mesh }[] = [];

  private proj: ReturnType<typeof makeLocalProjection>;
  private index: RouteIndex;

  private distance = 0;
  private speedKmH = 0;
  private followTarget: number | null = null;
  private playing: boolean;
  private speedMultiplier = 1;
  private heading = 0; // radians, smoothed
  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  private camInitialized = false;

  private rafId = 0;
  private lastFrame = 0;
  private lastTelemetry = 0;
  private dirty = true;
  private disposed = false;
  private buildingsStatus: SceneTelemetry['buildingsStatus'] = 'off';
  private resizeObserver: ResizeObserver;
  private groundTexture: THREE.CanvasTexture | null = null;
  private avgSpeedKmH: number;

  constructor(container: HTMLElement, route: CalculatedRoute, options: RouteSceneOptions) {
    this.container = container;
    this.route = route;
    this.opts = {
      timeCompression: 10,
      autoplay: true,
      showBuildings: true,
      ...options,
    };
    this.playing = this.opts.autoplay;

    // Route geometry in local meters, centred on the route
    const coords = route.coordinates.length >= 2 ? route.coordinates : [route.coordinates[0], route.coordinates[0]];
    const mid = coords[Math.floor(coords.length / 2)];
    this.proj = makeLocalProjection(mid[0], mid[1]);
    this.index = buildRouteIndex(coords);

    const hours = Math.max(route.totalMinutes, 1) / 60;
    this.avgSpeedKmH = Math.min(90, Math.max(15, route.distanceKm / hours));
    this.speedKmH = 0;

    // Renderer (throws if WebGL is unavailable; the React view shows a message)
    this.renderer = new THREE.WebGLRenderer({ antialias: !this.lowPower, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.lowPower ? 1 : 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.5, 8000);

    this.buildEnvironment();
    this.buildGround();
    this.buildRoad();
    this.buildCar();
    this.buildCameraTotems();
    this.buildEndpoints();
    if (this.opts.showBuildings) this.buildBuildings();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    document.addEventListener('visibilitychange', this.onVisibility);
    this.lastFrame = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  // --- Public commands ------------------------------------------------------
  setPlaying(playing: boolean) {
    if (playing && this.distance >= this.index.totalMeters - 0.5) this.distance = 0;
    this.playing = playing;
    this.dirty = true;
    this.emitTelemetry(true);
  }

  setSpeedMultiplier(multiplier: number) {
    this.speedMultiplier = multiplier;
  }

  setCameraMode(mode: CameraMode) {
    this.opts.cameraMode = mode;
    this.dirty = true;
  }

  seek(meters: number) {
    this.distance = Math.max(0, Math.min(this.index.totalMeters, meters));
    this.camInitialized = false;
    this.dirty = true;
    this.emitTelemetry(true);
  }

  // Follow mode: the car eases towards an externally controlled position
  // (used by the Street View timeline). null returns to free-running playback.
  setFollowTarget(meters: number | null) {
    this.followTarget = meters === null ? null : Math.max(0, Math.min(this.index.totalMeters, meters));
    this.dirty = true;
  }

  get totalMeters() {
    return this.index.totalMeters;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);

    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      const materials = Array.isArray(material) ? material : material ? [material] : [];
      for (const m of materials) {
        for (const value of Object.values(m)) {
          if (value instanceof THREE.Texture) value.dispose();
        }
        m.dispose();
      }
    });
    this.groundTexture?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  // --- Scene construction ---------------------------------------------------
  private toScene(lat: number, lng: number, y = 0): THREE.Vector3 {
    const p = this.proj.toXY(lat, lng);
    return new THREE.Vector3(p.x, y, -p.y);
  }

  private buildEnvironment() {
    const night = this.opts.theme === 'night';
    const sky = new THREE.Color(night ? 0x0a0f1d : 0x9fd3f5);
    this.scene.background = sky;
    this.scene.fog = night ? new THREE.FogExp2(0x0a0f1d, 0.0007) : new THREE.Fog(0xbfe0f5, 900, 4200);

    this.scene.add(new THREE.HemisphereLight(night ? 0x7dd3fc : 0xffffff, night ? 0x0b1220 : 0x8a7f6a, night ? 0.9 : 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, night ? 0.5 : 1.6);
    sun.position.set(400, 900, 300);
    this.scene.add(sun);
  }

  private buildGround() {
    const theme = TILE_SOURCES[this.opts.theme];
    const coords = this.index.coords;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const [lat, lng] of coords) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
    const marginLat = 700 / 111320;
    const marginLng = 700 / (111320 * Math.cos((minLat * Math.PI) / 180));
    minLat -= marginLat;
    maxLat += marginLat;
    minLng -= marginLng;
    maxLng += marginLng;

    const maxTex = Math.min(this.renderer.capabilities.maxTextureSize, this.lowPower ? 2048 : 4096);
    const maxTiles = this.lowPower ? 40 : 96;
    let zoom = 17;
    let x0 = 0, x1 = 0, y0 = 0, y1 = 0;
    for (; zoom >= 11; zoom--) {
      x0 = Math.floor(lng2tile(minLng, zoom));
      x1 = Math.floor(lng2tile(maxLng, zoom));
      y0 = Math.floor(lat2tile(maxLat, zoom));
      y1 = Math.floor(lat2tile(minLat, zoom));
      const nx = x1 - x0 + 1;
      const ny = y1 - y0 + 1;
      if (nx * 256 <= maxTex && ny * 256 <= maxTex && nx * ny <= maxTiles) break;
    }
    const nx = x1 - x0 + 1;
    const ny = y1 - y0 + 1;

    const canvas = document.createElement('canvas');
    canvas.width = nx * 256;
    canvas.height = ny * 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.groundTexture = texture;

    // Ground mesh: a grid whose vertices sit at their true local positions and whose
    // UVs follow Web Mercator, so tiles line up with the route to the meter.
    const segX = Math.min(48, nx * 4);
    const segY = Math.min(48, ny * 4);
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    for (let j = 0; j <= segY; j++) {
      for (let i = 0; i <= segX; i++) {
        const fx = x0 + (nx * i) / segX;
        const fy = y0 + (ny * j) / segY;
        const v = this.toScene(tile2lat(fy, zoom), tile2lng(fx, zoom), 0);
        positions.push(v.x, 0, v.z);
        uvs.push(i / segX, 1 - j / segY);
      }
    }
    for (let j = 0; j < segY; j++) {
      for (let i = 0; i < segX; i++) {
        const a = j * (segX + 1) + i;
        const b = a + 1;
        const c = a + segX + 1;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texture }));
    this.scene.add(ground);

    // Load tiles progressively; the texture updates as they arrive
    const loadImage = (url: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
    const tileUrl = (tpl: string, x: number, y: number) =>
      tpl.replace('{z}', String(zoom)).replace('{x}', String(x)).replace('{y}', String(y));

    // Nearest tiles to the route start first, so the beginning of the tour is sharp quickly
    const startTile = { x: lng2tile(coords[0][1], zoom), y: lat2tile(coords[0][0], zoom) };
    const tiles: { x: number; y: number }[] = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles.push({ x, y });
    tiles.sort((a, b) => Math.hypot(a.x - startTile.x, a.y - startTile.y) - Math.hypot(b.x - startTile.x, b.y - startTile.y));

    let pendingUpdate = false;
    const scheduleUpdate = () => {
      if (pendingUpdate) return;
      pendingUpdate = true;
      setTimeout(() => {
        pendingUpdate = false;
        if (this.disposed) return;
        texture.needsUpdate = true;
        this.dirty = true;
      }, 120);
    };

    // A few parallel downloads at a time (mobile connections, tile server etiquette)
    let next = 0;
    const worker = async () => {
      while (next < tiles.length && !this.disposed) {
        const t = tiles[next++];
        try {
          const img = await loadImage(tileUrl(theme.base, t.x, t.y));
          if (this.disposed) return;
          if (theme.filter) ctx.filter = theme.filter;
          ctx.drawImage(img, (t.x - x0) * 256, (t.y - y0) * 256);
          ctx.filter = 'none';
          if (theme.overlay) {
            try {
              const ov = await loadImage(tileUrl(theme.overlay, t.x, t.y));
              if (this.disposed) return;
              ctx.drawImage(ov, (t.x - x0) * 256, (t.y - y0) * 256);
            } catch {
              // labels are optional
            }
          }
          scheduleUpdate();
        } catch {
          // keep the plain background for this tile
        }
      }
    };
    for (let i = 0; i < (this.lowPower ? 4 : 6); i++) worker();
  }

  private buildRoad() {
    const night = this.opts.theme === 'night';
    const pts = simplifyPolyline(this.index.coords, 1).map(([lat, lng]) => this.proj.toXY(lat, lng));
    if (pts.length < 2) return;
    const halfWidth = night ? 5 : 4;

    const positions: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const prev = pts[Math.max(0, i - 1)];
      const next = pts[Math.min(pts.length - 1, i + 1)];
      let dx = next.x - prev.x;
      let dy = next.y - prev.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      // Miter: use the averaged direction, limit the stretch on hairpins
      let scale = 1;
      if (i > 0 && i < pts.length - 1) {
        const ax = pts[i].x - prev.x, ay = pts[i].y - prev.y;
        const al = Math.hypot(ax, ay) || 1;
        const cos = (ax / al) * dx + (ay / al) * dy;
        scale = Math.min(2.5, 1 / Math.max(0.4, cos));
      }
      const nx = -dy * halfWidth * scale;
      const ny = dx * halfWidth * scale;
      positions.push(pts[i].x + nx, 0.15, -(pts[i].y + ny));
      positions.push(pts[i].x - nx, 0.15, -(pts[i].y - ny));
      if (i < pts.length - 1) {
        const b = i * 2;
        indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    const color = this.route.isApproximate ? 0x94a3b8 : night ? 0x06b6d4 : 0x22d3ee;
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: night ? 0.38 : 0.42,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const ribbon = new THREE.Mesh(geo, mat);
    ribbon.renderOrder = 1;
    this.scene.add(ribbon);

    // Centre line on top for crispness at any zoom
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, 0.3, -p.y))),
      new THREE.LineBasicMaterial({ color: night ? 0x67e8f9 : 0x0e7490 })
    );
    line.renderOrder = 2;
    this.scene.add(line);
  }

  private buildCar() {
    // Modelled facing +Z, which is the axis we align with the direction of travel
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.8, 4.3),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.4, roughness: 0.35, emissive: 0x075985, emissiveIntensity: 0.25 })
    );
    body.position.y = 0.65;
    this.car.add(body);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.6, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6, roughness: 0.2 })
    );
    cabin.position.set(0, 1.3, -0.25);
    this.car.add(cabin);

    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff7d6 });
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    for (const x of [-0.65, 0.65]) {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.06), lightMat);
      head.position.set(x, 0.75, 2.16); // front
      this.car.add(head);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.06), tailMat);
      tail.position.set(x, 0.8, -2.16); // rear
      this.car.add(tail);
    }

    if (this.opts.theme === 'night') {
      // Headlight beam on the road ahead
      const beam = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 26),
        new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0.18, depthWrite: false })
      );
      beam.rotation.x = -Math.PI / 2;
      beam.position.set(0, 0.25, 2.2 + 13);
      this.car.add(beam);
    }
    this.scene.add(this.car);
  }

  private buildCameraTotems() {
    const poleGeo = new THREE.CylinderGeometry(0.25, 0.3, 9, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6, roughness: 0.4 });
    const boxGeo = new THREE.BoxGeometry(1.4, 1, 1.8);
    const ringGeo = new THREE.RingGeometry(3, 4, 24);
    for (const cam of this.route.cameras) {
      const color = cam.status === 'fluido' ? 0x10b981 : cam.status === 'denso' ? 0xf59e0b : 0xef4444;
      const pos = this.toScene(cam.lat, cam.lng);
      const group = new THREE.Group();
      group.position.copy(pos);
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 4.5;
      group.add(pole);
      const box = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6 }));
      box.position.y = 9.4;
      group.add(box);
      const ring = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.4;
      group.add(ring);
      this.scene.add(group);
      this.cameraTotems.push({ cam, pos, ring });
    }
  }

  private buildEndpoints() {
    const coords = this.index.coords;
    const marker = (latlng: LatLng, color: number) => {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(4, 4, 6, 24, 1, true),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })
      );
      m.position.copy(this.toScene(latlng[0], latlng[1], 3));
      this.scene.add(m);
    };
    marker(coords[0], 0x22c55e);
    marker(coords[coords.length - 1], 0xef4444);
  }

  private buildingMaterial: THREE.Material | null = null;
  private buildingCount = 0;

  // Adds one stretch of buildings as a single merged mesh
  private addBuildings(buildings: BuildingFootprint[]) {
    const geometries: THREE.BufferGeometry[] = [];
    for (const b of buildings) {
      if (b.p.length < 3) continue;
      const shape = new THREE.Shape(b.p.map(([lat, lng]) => {
        const p = this.proj.toXY(lat, lng);
        return new THREE.Vector2(p.x, p.y);
      }));
      const geo = new THREE.ExtrudeGeometry(shape, { depth: b.h, bevelEnabled: false, curveSegments: 1 });
      geo.rotateX(-Math.PI / 2);
      geometries.push(geo.index ? geo.toNonIndexed() : geo);
    }
    if (geometries.length === 0) return;
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((g) => g.dispose());
    if (!merged) return;
    merged.computeVertexNormals();
    if (!this.buildingMaterial) {
      const night = this.opts.theme === 'night';
      this.buildingMaterial = new THREE.MeshLambertMaterial({
        color: night ? 0x64748b : 0xe7dccb,
        emissive: night ? 0x172033 : 0x000000,
        transparent: night,
        opacity: night ? 0.92 : 1,
      });
    }
    this.scene.add(new THREE.Mesh(merged, this.buildingMaterial));
    this.buildingCount += geometries.length;
    this.dirty = true;
  }

  // Buildings arrive stretch by stretch (from the start of the route) and are added
  // as they come, so the city fills in progressively instead of after a long wait.
  private buildBuildings(attempt = 0) {
    if (this.route.isApproximate) return;
    this.buildingsStatus = 'loading';
    streamBuildings(
      this.index.coords,
      { overpassRadius: 80, keepRadius: this.lowPower ? 140 : 250, limit: this.lowPower ? 3000 : 8000 },
      (chunk) => this.addBuildings(chunk),
      () => this.disposed
    )
      .then(() => {
        if (this.disposed) return;
        this.buildingsStatus = this.buildingCount > 0 ? 'ready' : 'unavailable';
        this.emitTelemetry(true);
      })
      .catch(() => {
        if (this.disposed) return;
        // Public Overpass servers are often busy for a few seconds: one more try
        if (attempt === 0 && this.buildingCount === 0) {
          setTimeout(() => !this.disposed && this.buildBuildings(1), 8000);
          return;
        }
        this.buildingsStatus = this.buildingCount > 0 ? 'ready' : 'unavailable';
        this.emitTelemetry(true);
      });
  }

  // --- Animation --------------------------------------------------------------
  private onVisibility = () => {
    this.lastFrame = performance.now();
  };

  private resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  // Bearing of the road over the next stretch, smoothed to avoid jitter on dense polylines
  private roadBearing(d: number): number {
    const a = pointAtDistance(this.index, d - 6);
    const b = pointAtDistance(this.index, d + 18);
    const pa = this.proj.toXY(a.lat, a.lng);
    const pb = this.proj.toXY(b.lat, b.lng);
    if (Math.hypot(pb.x - pa.x, pb.y - pa.y) < 0.5) return pointAtDistance(this.index, d).bearing;
    return ((Math.atan2(pb.x - pa.x, pb.y - pa.y) * 180) / Math.PI + 360) % 360;
  }

  // Target speed: the route's average speed, lower on bends and near congested cameras
  private targetSpeedKmH(d: number, carPos: THREE.Vector3): number {
    const turn = Math.abs(angleDifference(this.roadBearing(d), this.roadBearing(d + 35)));
    let factor = turn > 70 ? 0.35 : turn > 35 ? 0.6 : turn > 15 ? 0.85 : 1;
    for (const t of this.cameraTotems) {
      if (t.cam.status === 'fluido') continue;
      if (t.pos.distanceTo(carPos) < 140) factor = Math.min(factor, t.cam.status === 'retencion' ? 0.4 : 0.65);
    }
    return Math.max(8, this.avgSpeedKmH * 1.2 * factor);
  }

  private loop = (now: number) => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.loop);
    if (document.hidden) return;

    const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    const total = this.index.totalMeters;
    const prevDistance = this.distance;

    const here = pointAtDistance(this.index, this.distance);
    const carPos = this.toScene(here.lat, here.lng);

    if (this.followTarget !== null) {
      const delta = this.followTarget - this.distance;
      this.distance += delta * (1 - Math.exp(-dt * 1.8));
      if (Math.abs(this.followTarget - this.distance) < 0.05) this.distance = this.followTarget;
      this.speedKmH = Math.min(140, (Math.abs(this.distance - prevDistance) / Math.max(dt, 1e-3)) * 3.6 / this.opts.timeCompression);
    } else if (this.playing) {
      const target = this.targetSpeedKmH(this.distance, carPos);
      // Smooth acceleration / braking
      this.speedKmH += (target - this.speedKmH) * (1 - Math.exp(-dt * 1.5));
      const compression = this.opts.timeCompression * this.speedMultiplier;
      this.distance += (this.speedKmH / 3.6) * dt * compression;
      if (this.distance >= total) {
        this.distance = total;
        this.playing = false;
        this.speedKmH = 0;
        this.emitTelemetry(true);
      }
    } else {
      this.speedKmH += (0 - this.speedKmH) * (1 - Math.exp(-dt * 4));
    }

    const moved = Math.abs(this.distance - prevDistance) > 1e-3;
    const pos = pointAtDistance(this.index, this.distance);
    const p = this.toScene(pos.lat, pos.lng);
    const bearing = this.roadBearing(this.distance);
    const targetHeading = (bearing * Math.PI) / 180;
    if (!this.camInitialized) this.heading = targetHeading;
    const dh = ((targetHeading - this.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    this.heading += dh * (1 - Math.exp(-dt * 5));

    // Car: +Z axis to the travel direction (bearing 0 = north = scene -Z)
    this.car.position.copy(p);
    this.car.rotation.y = Math.PI - this.heading;

    const fwd = new THREE.Vector3(Math.sin(this.heading), 0, -Math.cos(this.heading));
    let desiredPos: THREE.Vector3;
    let desiredLook: THREE.Vector3;
    switch (this.opts.cameraMode) {
      case 'cockpit':
        // Slightly above a real driver's eye height so the aerial imagery of the road ahead is readable
        desiredPos = p.clone().addScaledVector(fwd, 0.6).add(new THREE.Vector3(0, 2.4, 0));
        desiredLook = p.clone().addScaledVector(fwd, 45).add(new THREE.Vector3(0, -0.5, 0));
        this.car.visible = false;
        break;
      case 'aerial':
        desiredPos = p.clone().addScaledVector(fwd, -70).add(new THREE.Vector3(0, 110, 0));
        desiredLook = p.clone().addScaledVector(fwd, 40);
        this.car.visible = true;
        this.car.scale.setScalar(3);
        break;
      default:
        desiredPos = p.clone().addScaledVector(fwd, -18).add(new THREE.Vector3(0, 8, 0));
        desiredLook = p.clone().addScaledVector(fwd, 14).add(new THREE.Vector3(0, 1, 0));
        this.car.visible = true;
        this.car.scale.setScalar(1);
        break;
    }
    if (this.opts.cameraMode === 'cockpit') this.car.scale.setScalar(1);

    if (!this.camInitialized) {
      this.camPos.copy(desiredPos);
      this.camLook.copy(desiredLook);
      this.camInitialized = true;
    } else {
      const k = 1 - Math.exp(-dt * (this.opts.cameraMode === 'cockpit' ? 12 : 4));
      this.camPos.lerp(desiredPos, k);
      this.camLook.lerp(desiredLook, k);
    }
    const settling = this.camPos.distanceTo(desiredPos) > 0.05;
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    // Render only when something changed: saves battery on phones and head units
    if (moved || settling || this.dirty) {
      const pulse = 1 + 0.25 * Math.sin(now * 0.004);
      for (const t of this.cameraTotems) t.ring.scale.setScalar(pulse);
      this.renderer.render(this.scene, this.camera);
      this.dirty = false;
    }

    this.emitTelemetry(false, pos.bearing, p);
  };

  private emitTelemetry(force: boolean, bearing?: number, carPos?: THREE.Vector3) {
    if (!this.opts.onTelemetry) return;
    const now = performance.now();
    // ~6 updates per second is plenty for the HUD and keeps React re-renders cheap
    if (!force && now - this.lastTelemetry < 160) return;
    this.lastTelemetry = now;

    const pos = carPos || (() => {
      const here = pointAtDistance(this.index, this.distance);
      return this.toScene(here.lat, here.lng);
    })();

    let nearest: SceneTelemetry['nearestCamera'] = null;
    let best = 220;
    for (const t of this.cameraTotems) {
      const d = t.pos.distanceTo(pos);
      if (d < best) {
        best = d;
        nearest = { id: t.cam.id, name: t.cam.name, zona: t.cam.zona, status: t.cam.status, url: t.cam.url, distanceMeters: Math.round(d) };
      }
    }

    this.opts.onTelemetry({
      distanceMeters: this.distance,
      totalMeters: this.index.totalMeters,
      speedKmH: Math.round(this.speedKmH),
      bearingDeg: Math.round(bearing ?? pointAtDistance(this.index, this.distance).bearing),
      playing: this.playing,
      finished: this.distance >= this.index.totalMeters - 0.5,
      nearestCamera: nearest,
      buildingsStatus: this.buildingsStatus,
    });
  }
}
