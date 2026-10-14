import React from 'react';
import { createPortal } from 'react-dom';
import { CalculatedRoute, RoutePoint } from '../services/routing';
import { generateRouteGpx, generateRouteKml, downloadRouteFile } from '../services/routeExport';
import {
  Navigation,
  ExternalLink,
  Download,
  Share2,
  FileCode,
  Smartphone,
  Gauge,
  Radio,
  X,
  CheckCircle2,
  Car,
  Compass,
} from 'lucide-react';

interface CarNavigationLauncherModalProps {
  route: CalculatedRoute;
  origin: RoutePoint & { name: string };
  destination: RoutePoint & { name: string };
  onClose: () => void;
  onStartBuiltInGps: () => void;
}

export const CarNavigationLauncherModal: React.FC<CarNavigationLauncherModalProps> = ({
  route,
  origin,
  destination,
  onClose,
  onStartBuiltInGps,
}) => {
  // Android Auto / Google Maps URLs
  const androidAutoIntent = `google.navigation:q=${destination.lat},${destination.lng}&mode=d`;
  const googleMapsWebUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;

  // Waze URLs
  const wazeAppUrl = `waze://?ll=${destination.lat},${destination.lng}&navigate=yes`;
  const wazeWebUrl = `https://waze.com/ul?ll=${destination.lat},${destination.lng}&navigate=yes`;

  const handleLaunchGoogleMaps = () => {
    // Attempt app protocol intent first, with fallback to web navigation
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (/Android/i.test(navigator.userAgent)) {
      window.location.href = androidAutoIntent;
    } else {
      window.open(googleMapsWebUrl, '_blank');
    }
  };

  const handleLaunchWaze = () => {
    if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
      window.location.href = wazeAppUrl;
      setTimeout(() => {
        window.open(wazeWebUrl, '_blank');
      }, 500);
    } else {
      window.open(wazeWebUrl, '_blank');
    }
  };

  const handleDownloadGpx = () => {
    const xml = generateRouteGpx(route, origin, destination);
    const cleanName = route.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadRouteFile(xml, `ruta-alicante-${cleanName}.gpx`, 'application/gpx+xml');
  };

  const handleDownloadKml = () => {
    const xml = generateRouteKml(route, origin, destination);
    const cleanName = route.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadRouteFile(xml, `ruta-alicante-${cleanName}.kml`, 'application/vnd.google-earth.kml+xml');
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0f172a] border border-cyan-500/40 p-4 sm:p-6 shadow-2xl text-slate-100 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-400">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
                <span>Navegación en Coche</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  Android Auto
                </span>
              </h2>
              <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
                Ruta seleccionada: <strong className="text-slate-200">{route.name}</strong> ({route.distanceKm} km · {route.totalMinutes} min)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Proyección Directa a Android Auto / Google Maps / Waze */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block font-bold">
            1. Proyección a la Pantalla del Salpicadero
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Android Auto & Google Maps Button */}
            <button
              onClick={handleLaunchGoogleMaps}
              className="p-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-slate-950 font-bold text-xs flex flex-col justify-between gap-1 shadow-lg transition-all active:scale-95 text-left group"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-black flex items-center gap-1 text-white">
                  <Navigation className="w-4 h-4" />
                  Android Auto / Maps
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-white/80 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[10px] text-blue-100 font-normal leading-tight">
                Lanza navegación guiada directamente en la pantalla central de tu coche
              </p>
            </button>

            {/* Waze Button */}
            <button
              onClick={handleLaunchWaze}
              className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-400 text-white font-bold text-xs flex flex-col justify-between gap-1 shadow-lg transition-all active:scale-95 text-left group"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-black flex items-center gap-1 text-cyan-300">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  Abrir en Waze
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-[10px] text-slate-400 font-normal leading-tight">
                Navegar con avisos comunitarios de radar y tráfico en Waze
              </p>
            </button>
          </div>
        </div>

        {/* 2. Modo Conducción en Soporte (Navegador Integrado con Cámaras en Vivo) */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block font-bold">
            2. Modo Conducción en Soporte (Móvil en Salpicadero)
          </span>

          <button
            onClick={() => {
              onClose();
              onStartBuiltInGps();
            }}
            className="w-full p-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border-2 border-emerald-500/50 text-white flex items-center justify-between gap-3 shadow-lg transition-all active:scale-95 group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black flex-shrink-0">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-emerald-300 flex items-center gap-2">
                  <span>Navegador GPS con Cámaras en Vivo + HUD</span>
                  <span className="text-[9px] font-mono bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800">
                    EXCLUSIVO
                  </span>
                </h4>
                <p className="text-[11px] text-slate-300">
                  Pantalla siempre encendida (Wake Lock), avisos por voz de las 159 cámaras y modo espejo para el parabrisas.
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-emerald-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* 3. Exportación GPX y KML */}
        <div className="space-y-2 border-t border-slate-800 pt-3">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">
            3. Exportación para GPS Externos (Garmin, OsmAnd, TomTom)
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownloadGpx}
              className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              title="Descargar archivo GPX con la trayectoria y las cámaras de tráfico"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Descargar .GPX</span>
            </button>

            <button
              onClick={handleDownloadKml}
              className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              title="Descargar archivo KML para Google Earth"
            >
              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>Descargar .KML</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
