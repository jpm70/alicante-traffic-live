import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { TrafficCamera, CAMERAS } from '../data/cameras';
import { CalculatedRoute, RoutePoint } from '../services/routing';
import { TrafficAlert } from '../data/trafficAlerts';
import { ALICANTE_TAXI_STANDS, TaxiStand, ALICANTE_LOCAL_CLOSURES } from '../data/publicTransport';

type MapStyle = 'dark' | 'streets' | 'satellite';

interface InteractiveMapProps {
  origin: RoutePoint & { name: string };
  destination: RoutePoint & { name: string };
  routes: CalculatedRoute[];
  selectedRouteId: string;
  onSelectRoute: (id: string) => void;
  onOpenLightbox: (cam: TrafficCamera) => void;
  onToggleCameraSelection: (camId: string) => void;
  selectedCameraIds: Set<string>;
  isPickOnMapActive: 'origin' | 'destination' | null;
  onMapClickSetPoint: (point: { lat: number; lng: number }, forceType?: 'origin' | 'destination') => void;
  cacheBuster: number;
  alerts?: TrafficAlert[];
  selectedAlertId?: string | null;
  onAlertClick?: (alert: TrafficAlert) => void;
  onCancelPickMode?: () => void;
  isModalOpen?: boolean;
  isPublicTransportMode?: boolean;
  showTaxiStands?: boolean;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  origin,
  destination,
  routes,
  selectedRouteId,
  onSelectRoute,
  onOpenLightbox,
  onToggleCameraSelection,
  selectedCameraIds,
  isPickOnMapActive,
  onMapClickSetPoint,
  cacheBuster,
  alerts = [],
  selectedAlertId = null,
  onAlertClick,
  onCancelPickMode,
  isModalOpen = false,
  isPublicTransportMode = false,
  showTaxiStands = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const routeLayersRef = useRef<L.Polyline[]>([]);
  const cameraMarkersRef = useRef<L.CircleMarker[]>([]);
  const pinMarkersRef = useRef<L.Marker[]>([]);
  const alertMarkersRef = useRef<L.Marker[]>([]);
  const taxiStandMarkersRef = useRef<L.Marker[]>([]);
  const closureMarkersRef = useRef<L.Marker[]>([]);
  const [mapStyle, setMapStyle] = useState<MapStyle>('dark');
  const [showAlertsOverlay, setShowAlertsOverlay] = useState<boolean>(true);

  // Close any open popups when 3D or GPS tour is displayed
  useEffect(() => {
    if (isModalOpen && mapInstanceRef.current) {
      mapInstanceRef.current.closePopup();
    }
  }, [isModalOpen]);

  // Keep live mutable refs to avoid stale closures in Leaflet events
  const onMapClickSetPointRef = useRef(onMapClickSetPoint);
  onMapClickSetPointRef.current = onMapClickSetPoint;

  const isPickOnMapActiveRef = useRef(isPickOnMapActive);
  isPickOnMapActiveRef.current = isPickOnMapActive;

  // Tile layer configs that require NO API KEY and have NO WATERMARKS
  const TILE_PROVIDERS: Record<MapStyle, { url: string; options: L.TileLayerOptions }> = {
    dark: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      options: {
        maxZoom: 19,
        attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      },
    },
    streets: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      options: {
        maxZoom: 19,
        attribution: '&copy; Esri &mdash; Fuentes: Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China, NOSTRA',
      },
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      options: {
        maxZoom: 19,
        attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      },
    },
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on Alicante
    const map = L.map(mapContainerRef.current, {
      center: [38.3452, -0.4810],
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
    });

    // Initial tile layer (Esri Dark Gray - No API key needed)
    const initialConfig = TILE_PROVIDERS.dark;
    const initialLayer = L.tileLayer(initialConfig.url, initialConfig.options).addTo(map);
    tileLayerRef.current = initialLayer;

    // Map click handler for picking origin/destination
    map.on('click', (e: L.LeafletMouseEvent) => {
      const activeMode = isPickOnMapActiveRef.current;

      // If user activated Pick Mode from UI (pin button)
      if (activeMode) {
        onMapClickSetPointRef.current({ lat: e.latlng.lat, lng: e.latlng.lng }, activeMode);
        return;
      }

      // If user clicks anywhere on the map normally, offer quick action popup to set Origin or Destination
      const clickPopup = L.popup({ maxWidth: 260, offset: [0, -4] })
        .setLatLng(e.latlng)
        .setContent(`
          <div style="font-family:system-ui, sans-serif; padding:4px;">
            <div style="font-weight:700; font-size:12px; color:#f8fafc; margin-bottom:2px;">
              📍 Punto en el mapa
            </div>
            <div style="font-size:10px; color:#94a3b8; margin-bottom:8px; font-family:monospace;">
              ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}
            </div>
            <div style="display:flex; gap:6px;">
              <button id="map-set-origin-btn" style="flex:1; background:#10b981; color:#0f172a; font-weight:800; font-size:11px; padding:6px 8px; border-radius:6px; border:none; cursor:pointer;">
                🟢 Fijar Origen
              </button>
              <button id="map-set-dest-btn" style="flex:1; background:#ef4444; color:#ffffff; font-weight:800; font-size:11px; padding:6px 8px; border-radius:6px; border:none; cursor:pointer;">
                🔴 Fijar Destino
              </button>
            </div>
          </div>
        `)
        .openOn(map);

      setTimeout(() => {
        const btnOrigin = document.getElementById('map-set-origin-btn');
        const btnDest = document.getElementById('map-set-dest-btn');
        if (btnOrigin) {
          btnOrigin.onclick = () => {
            onMapClickSetPointRef.current({ lat: e.latlng.lat, lng: e.latlng.lng }, 'origin');
            map.closePopup();
          };
        }
        if (btnDest) {
          btnDest.onclick = () => {
            onMapClickSetPointRef.current({ lat: e.latlng.lat, lng: e.latlng.lng }, 'destination');
            map.closePopup();
          };
        }
      }, 50);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer when mapStyle changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    const cfg = TILE_PROVIDERS[mapStyle];
    const newLayer = L.tileLayer(cfg.url, cfg.options).addTo(map);
    tileLayerRef.current = newLayer;

    // Send tile layer to back so polylines and markers stay on top
    newLayer.bringToBack();
  }, [mapStyle]);

  // Update Map Cursor when picking point
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (isPickOnMapActive) {
      mapContainerRef.current.style.cursor = 'crosshair';
    } else {
      mapContainerRef.current.style.cursor = '';
    }
  }, [isPickOnMapActive]);

  // Update Origin and Destination Pins
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old pin markers
    pinMarkersRef.current.forEach((m) => m.remove());
    pinMarkersRef.current = [];

    const isMyLocation =
      origin.name.toLowerCase().includes('mi ubicación') ||
      origin.name.toLowerCase().includes('ubicación actual');

    // Origin Icon
    const originIcon = L.divIcon({
      className: 'custom-origin-icon',
      html: `
        <div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center;">
          <div style="position:absolute; width:${isMyLocation ? '32px' : '26px'}; height:${isMyLocation ? '32px' : '26px'}; border-radius:50%; background:${isMyLocation ? 'rgba(6,182,212,0.45)' : 'rgba(34,197,94,0.35)'}; animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:relative; width:22px; height:22px; border-radius:50%; background:${isMyLocation ? '#06b6d4' : '#22c55e'}; border:2.5px solid #ffffff; box-shadow:0 0 12px ${isMyLocation ? 'rgba(6,182,212,0.9)' : 'rgba(34,197,94,0.8)'}; display:flex; align-items:center; justify-content:center; color:#0f172a; font-size:${isMyLocation ? '11px' : '10px'}; font-weight:900;">
            ${isMyLocation ? '📍' : 'A'}
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    // Destination Icon
    const destIcon = L.divIcon({
      className: 'custom-dest-icon',
      html: `
        <div style="position:relative; width:30px; height:30px; display:flex; align-items:center; justify-content:center;">
          <div style="position:absolute; width:26px; height:26px; border-radius:50%; background:rgba(239,68,68,0.3); animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:relative; width:18px; height:18px; border-radius:50%; background:#ef4444; border:2.5px solid #ffffff; box-shadow:0 0 10px rgba(239,68,68,0.8); display:flex; align-items:center; justify-content:center; color:#ffffff; font-size:10px; font-weight:900;">B</div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    const mOrigin = L.marker([origin.lat, origin.lng], { icon: originIcon }).addTo(map);
    mOrigin.bindTooltip(`<b>${isMyLocation ? 'Tu Ubicación Actual' : 'Origen'}:</b><br/>${origin.name}`, { direction: 'top', offset: [0, -10] });

    const mDest = L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map);
    mDest.bindTooltip(`<b>Destino:</b><br/>${destination.name}`, { direction: 'top', offset: [0, -10] });

    pinMarkersRef.current = [mOrigin, mDest];

    // If live location was just selected, fly to it
    if (isMyLocation) {
      map.flyTo([origin.lat, origin.lng], 14, { duration: 1.2 });
    }
  }, [origin, destination]);

  // Update Route Polylines
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    routeLayersRef.current.forEach((l) => l.remove());
    routeLayersRef.current = [];

    if (routes.length === 0) return;

    routes.forEach((route) => {
      const isSelected = route.id === selectedRouteId;

      // Draw background glow for selected route
      if (isSelected) {
        const glow = L.polyline(route.coordinates, {
          color: '#ffffff',
          weight: 10,
          opacity: 0.35,
          lineCap: 'round',
        }).addTo(map);
        routeLayersRef.current.push(glow);
      }

      const poly = L.polyline(route.coordinates, {
        color: route.color,
        weight: isSelected ? 6 : 4,
        opacity: isSelected ? 0.95 : 0.45,
        dashArray: isSelected ? undefined : '6, 6',
        lineCap: 'round',
      }).addTo(map);

      poly.on('click', () => onSelectRoute(route.id));

      poly.bindTooltip(
        `<b>${route.name}</b><br/>${route.totalMinutes} min · ${route.distanceKm} km · ${route.cameras.length} cámaras`,
        { sticky: true }
      );

      routeLayersRef.current.push(poly);
    });

    // Fit bounds to routes or markers
    const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
    if (selectedRoute && selectedRoute.coordinates.length > 0) {
      map.fitBounds(selectedRoute.coordinates, { padding: [50, 50], maxZoom: 15 });
    }
  }, [routes, selectedRouteId]);

  // Update 159 Camera Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    cameraMarkersRef.current.forEach((m) => m.remove());
    cameraMarkersRef.current = [];

    const activeRoute = routes.find((r) => r.id === selectedRouteId);
    const routeCamMap = new Map<string, string>();
    if (activeRoute) {
      activeRoute.cameras.forEach((c) => routeCamMap.set(c.id, c.status));
    }

    CAMERAS.forEach((cam) => {
      const isOnRoute = routeCamMap.has(cam.id);
      const isUserSelected = selectedCameraIds.has(cam.id);
      const routeStatus = routeCamMap.get(cam.id);

      // Color coding:
      // Red: congestion/retencion
      // Amber: denso/moderado
      // Green/Cyan: fluido
      let fillColor = '#10b981'; // Green
      if (routeStatus === 'retencion') fillColor = '#ef4444';
      else if (routeStatus === 'denso') fillColor = '#f59e0b';
      else if (isUserSelected) fillColor = '#06b6d4';

      const radius = isOnRoute ? 8 : 5.5;

      const marker = L.circleMarker([cam.lat, cam.lng], {
        radius,
        fillColor,
        color: isOnRoute ? '#ffffff' : '#1e293b',
        weight: isOnRoute ? 2.5 : 1,
        opacity: 1,
        fillOpacity: isOnRoute ? 0.95 : 0.75,
      }).addTo(map);

      // Camera popup content
      const popupHtml = `
        <div style="min-width: 220px; font-family: system-ui, sans-serif;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-weight: 800; font-size: 11px; background: #0284c7; color: white; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${cam.id}</span>
            <span style="font-size: 10px; color: #94a3b8; font-weight: 600;">${cam.zona}</span>
          </div>
          <div style="font-weight: 700; font-size: 13px; color: #f8fafc; margin-bottom: 8px;">${cam.name}</div>
          
          <div style="position: relative; width: 100%; height: 120px; background: #000; border-radius: 6px; overflow: hidden; margin-bottom: 8px; border: 1px solid #334155;">
            <img 
              src="${cam.url}&t=${cacheBuster}" 
              alt="${cam.name}" 
              referrerpolicy="no-referrer"
              style="width: 100%; height: 100%; object-fit: cover;"
              onerror="this.style.opacity='0.2'; this.parentElement.insertAdjacentHTML('beforeend', '<div style=\\'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px;\\'>Cámara no disponible</div>');"
            />
            <div style="position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.7); color: #22c55e; font-size: 9px; font-family: monospace; padding: 2px 4px; border-radius: 3px;">● EN VIVO</div>
          </div>

          <div style="display: flex; gap: 6px;">
            <button 
              id="pop-view-${cam.id}" 
              style="flex: 1; background: #0284c7; color: white; border: none; padding: 6px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;"
            >
              ↗ Ampliar
            </button>
            <button 
              id="pop-select-${cam.id}" 
              style="flex: 1; background: ${isUserSelected ? '#ef4444' : '#334155'}; color: white; border: none; padding: 6px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;"
            >
              ${isUserSelected ? 'Quitar del Mural' : '+ Al Mural'}
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280 });

      marker.on('popupopen', () => {
        const btnView = document.getElementById(`pop-view-${cam.id}`);
        const btnSel = document.getElementById(`pop-select-${cam.id}`);
        if (btnView) {
          btnView.onclick = () => onOpenLightbox(cam);
        }
        if (btnSel) {
          btnSel.onclick = () => {
            onToggleCameraSelection(cam.id);
            marker.closePopup();
          };
        }
      });

      cameraMarkersRef.current.push(marker);
    });
  }, [routes, selectedRouteId, selectedCameraIds, cacheBuster]);

  // Render Traffic Alert Hazard Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old alert markers
    alertMarkersRef.current.forEach((m) => m.remove());
    alertMarkersRef.current = [];

    if (!showAlertsOverlay || alerts.length === 0) return;

    alerts.forEach((alert) => {
      let iconEmoji = '🚧';
      let iconBg = '#f59e0b';
      let pulseColor = 'rgba(245, 158, 11, 0.4)';

      if (alert.type === 'accidente') {
        iconEmoji = '💥';
        iconBg = '#ef4444';
        pulseColor = 'rgba(239, 68, 68, 0.45)';
      } else if (alert.type === 'corte') {
        iconEmoji = '⛔';
        iconBg = '#dc2626';
        pulseColor = 'rgba(220, 38, 38, 0.45)';
      } else if (alert.type === 'retencion') {
        iconEmoji = '⏳';
        iconBg = '#ea580c';
        pulseColor = 'rgba(234, 88, 12, 0.4)';
      } else if (alert.type === 'evento') {
        iconEmoji = '🎪';
        iconBg = '#9333ea';
        pulseColor = 'rgba(147, 51, 234, 0.4)';
      }

      const isSelected = selectedAlertId === alert.id;

      const alertIcon = L.divIcon({
        className: 'custom-alert-hazard-icon',
        html: `
          <div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
            <div style="position:absolute; inset:0; border-radius:50%; background:${pulseColor}; animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="position:relative; width:26px; height:26px; border-radius:50%; background:${iconBg}; border:${isSelected ? '2.5px solid #ffffff' : '2px solid rgba(255,255,255,0.9)'}; box-shadow:0 4px 12px rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; font-size:13px; transform:${isSelected ? 'scale(1.2)' : 'scale(1)'}; transition:transform 0.2s;">
              ${iconEmoji}
            </div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([alert.lat, alert.lng], {
        icon: alertIcon,
        zIndexOffset: isSelected ? 1500 : 800,
      }).addTo(map);

      const popupHtml = `
        <div style="min-width: 230px; font-family: system-ui, sans-serif; line-height: 1.4;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; background: ${iconBg}; color: white; padding: 2px 6px; border-radius: 4px; font-family: monospace;">
              ${alert.type.toUpperCase()} · ${alert.severity.toUpperCase()}
            </span>
            <span style="font-size: 11px; font-weight: 800; color: #f59e0b; font-family: monospace;">
              +${alert.delayMin} min
            </span>
          </div>

          <div style="font-weight: 800; font-size: 13px; color: #f8fafc; margin-bottom: 4px;">
            ${alert.title}
          </div>

          <div style="font-size: 11px; color: #38bdf8; font-weight: 600; margin-bottom: 6px;">
            📍 ${alert.street}
          </div>

          <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(51, 65, 85, 0.8); border-radius: 6px; padding: 6px 8px; font-size: 11px; color: #cbd5e1; margin-bottom: 6px;">
            ${alert.description}
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #94a3b8; font-family: monospace;">
            <span>${alert.source}</span>
            <span>${alert.timestamp}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 300 });

      marker.on('click', () => {
        if (onAlertClick) onAlertClick(alert);
      });

      // If this alert is specifically selected, open its popup
      if (isSelected) {
        marker.openPopup();
      }

      alertMarkersRef.current.push(marker);
    });
  }, [alerts, selectedAlertId, showAlertsOverlay, onAlertClick]);

  // Smooth fly/pan to selected alert if user clicks from panel
  useEffect(() => {
    if (!selectedAlertId || !mapInstanceRef.current) return;
    const targetAlert = alerts.find((a) => a.id === selectedAlertId);
    if (targetAlert) {
      mapInstanceRef.current.flyTo([targetAlert.lat, targetAlert.lng], 15, {
        duration: 1.2,
      });
    }
  }, [selectedAlertId, alerts]);

  // When returning from any modal, ensure Leaflet recalculates dimensions smoothly
  useEffect(() => {
    if (!isModalOpen && mapInstanceRef.current) {
      const timer = setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen]);

  // Render Official Taxi Stands and Local Closures when in Public Transport Mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clean up previous markers
    taxiStandMarkersRef.current.forEach((m) => m.remove());
    taxiStandMarkersRef.current = [];
    closureMarkersRef.current.forEach((m) => m.remove());
    closureMarkersRef.current = [];

    // Only render if Public Transport mode is active or user explicitly toggled taxi stands
    if (!isPublicTransportMode && !showTaxiStands) return;

    // 1. Render Official Taxi Stands
    ALICANTE_TAXI_STANDS.forEach((stand) => {
      const standIcon = L.divIcon({
        className: 'custom-taxi-stand-icon',
        html: `
          <div style="position:relative; width:36px; height:36px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
            <div style="position:absolute; inset:0; border-radius:50%; background:rgba(251, 191, 36, 0.35); animation:pulse 2s infinite;"></div>
            <div style="position:relative; width:28px; height:28px; border-radius:8px; background:#fbbf24; border:2px solid #000000; box-shadow:0 4px 10px rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; font-size:14px;">
              🚖
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([stand.lat, stand.lng], {
        icon: standIcon,
        zIndexOffset: 1200,
      }).addTo(map);

      const popupHtml = `
        <div style="min-width: 230px; font-family: system-ui, sans-serif; line-height: 1.4;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 900; background: #fbbf24; color: #000; padding: 2px 6px; border-radius: 4px; font-family: monospace;">
              🚖 PARADA OFICIAL DE TAXI
            </span>
            <span style="font-size: 10px; font-weight: 700; color: #38bdf8; font-family: monospace;">
              ${stand.capacity} PLAZAS
            </span>
          </div>

          <div style="font-weight: 800; font-size: 13px; color: #f8fafc; margin-bottom: 2px;">
            ${stand.name}
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px;">
            📍 ${stand.address} (${stand.zone})
          </div>

          ${
            stand.notes
              ? `<div style="font-size: 10px; color: #cbd5e1; background: #0f172a; padding: 4px 6px; border-radius: 4px; margin-bottom: 8px; border: 1px solid #334155;">
                  ℹ️ ${stand.notes}
                </div>`
              : ''
          }

          <div style="display: flex; gap: 6px;">
            <button 
              id="stand-dest-${stand.id}" 
              style="flex: 1; background: #fbbf24; color: #000; border: none; padding: 6px; border-radius: 6px; font-size: 11px; font-weight: 800; cursor: pointer;"
            >
              ➔ Fijar como Destino
            </button>
            <button 
              id="stand-orig-${stand.id}" 
              style="flex: 1; background: #1e293b; color: #38bdf8; border: 1px solid #475569; padding: 6px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;"
            >
              Fijar Origen
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280 });

      marker.on('popupopen', () => {
        const btnDest = document.getElementById(`stand-dest-${stand.id}`);
        const btnOrig = document.getElementById(`stand-orig-${stand.id}`);
        if (btnDest) {
          btnDest.onclick = () => {
            onMapClickSetPointRef.current({ lat: stand.lat, lng: stand.lng }, 'destination');
            marker.closePopup();
          };
        }
        if (btnOrig) {
          btnOrig.onclick = () => {
            onMapClickSetPointRef.current({ lat: stand.lat, lng: stand.lng }, 'origin');
            marker.closePopup();
          };
        }
      });

      taxiStandMarkersRef.current.push(marker);
    });

    // 2. Render Local Closures Warning Markers
    ALICANTE_LOCAL_CLOSURES.forEach((closure) => {
      const closureIcon = L.divIcon({
        className: 'custom-local-closure-icon',
        html: `
          <div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
            <div style="position:absolute; inset:0; border-radius:50%; background:rgba(239, 68, 68, 0.4); animation:ping 2s infinite;"></div>
            <div style="position:relative; width:26px; height:26px; border-radius:50%; background:#dc2626; border:2px solid #ffffff; box-shadow:0 4px 10px rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; font-size:13px;">
              ⛔
            </div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([closure.lat, closure.lng], {
        icon: closureIcon,
        zIndexOffset: 1100,
      }).addTo(map);

      const popupHtml = `
        <div style="min-width: 230px; font-family: system-ui, sans-serif; line-height: 1.4;">
          <div style="font-size: 10px; font-weight: 800; background: #dc2626; color: white; padding: 2px 6px; border-radius: 4px; font-family: monospace; display: inline-block; margin-bottom: 4px;">
            ${closure.festivityOrReason.toUpperCase()}
          </div>
          <div style="font-weight: 800; font-size: 13px; color: #f8fafc; margin-bottom: 2px;">
            ${closure.title}
          </div>
          <div style="font-size: 11px; color: #f87171; margin-bottom: 6px;">
            📍 ${closure.location}
          </div>
          <div style="font-size: 11px; color: #10b981; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); padding: 5px 7px; border-radius: 5px; margin-bottom: 6px;">
            <strong>Desvío Taxi:</strong> ${closure.detourAdvice}
          </div>
          <div style="font-size: 10px; color: #94a3b8;">
            ⏱️ ${closure.dateOrHours}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280 });
      closureMarkersRef.current.push(marker);
    });
  }, [isPublicTransportMode, showTaxiStands]);

  return (
    <div
      className={`relative w-full h-full min-h-[420px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl ${
        isModalOpen ? 'hidden pointer-events-none' : ''
      }`}
    >
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Active Pick Mode Banner */}
      {isPickOnMapActive && (
        <div className="absolute top-3 left-3 z-[400] bg-emerald-950/95 border-2 border-emerald-500 rounded-lg px-3 py-2 text-xs shadow-2xl flex items-center gap-2 pointer-events-auto animate-pulse">
          <span className="text-base">📍</span>
          <div>
            <span className="font-black text-white uppercase font-mono">
              Modo Selección: {isPickOnMapActive === 'origin' ? 'Punto de Partida (Origen)' : 'Punto de Llegada (Destino)'}
            </span>
            <p className="text-[10px] text-emerald-300 font-medium">
              Haz clic en cualquier calle o rotonda de Alicante para fijarlo
            </p>
          </div>
          {onCancelPickMode && (
            <button
              onClick={onCancelPickMode}
              className="ml-2 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700 transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      )}

      {/* Top Right Map Style & Alerts Selector */}
      <div className="absolute top-3 right-3 z-[400] flex flex-wrap items-center gap-2 pointer-events-auto">
        {/* Toggle Alerts Overlay button */}
        {alerts.length > 0 && (
          <button
            onClick={() => setShowAlertsOverlay(!showAlertsOverlay)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border shadow-lg backdrop-blur-md transition-all ${
              showAlertsOverlay
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-300'
            }`}
            title="Mostrar u ocultar avisos de obras y accidentes en el mapa"
          >
            <span className="text-xs">⚠️</span>
            <span>Alertas ({alerts.length})</span>
            <span
              className={`w-2 h-2 rounded-full ${
                showAlertsOverlay ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'
              }`}
            />
          </button>
        )}

        {/* Style Selector */}
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-lg p-1 text-xs shadow-lg flex items-center gap-1">
          <button
            onClick={() => setMapStyle('dark')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              mapStyle === 'dark'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Modo Oscuro de Alto Contraste (Esri)"
          >
            Oscuro
          </button>
          <button
            onClick={() => setMapStyle('streets')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              mapStyle === 'streets'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Plano de Calles Detallado (OpenStreetMap)"
          >
            Calles
          </button>
          <button
            onClick={() => setMapStyle('satellite')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
              mapStyle === 'satellite'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Vista Aérea Satelital (Esri Imagery)"
          >
            Satélite
          </button>
        </div>
      </div>

      {/* Map Overlay Legend */}
      <div className="absolute bottom-3 left-3 z-[400] bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-2.5 text-[11px] shadow-lg pointer-events-auto">
        <div className="font-bold text-slate-200 mb-1.5 flex items-center justify-between gap-3">
          <span>Mapa de Alicante en Vivo</span>
          <span className="text-[10px] text-cyan-400 font-mono">159 cámaras · {alerts.length} alertas</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Fluido</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Denso</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Retención</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-white/50" />
            <span>En tu Ruta</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs">🚧</span>
            <span>Obras / Incidencia</span>
          </div>
        </div>
      </div>
    </div>
  );
};
