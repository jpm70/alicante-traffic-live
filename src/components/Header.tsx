import React from 'react';
import { GhostLogo } from './GhostLogo';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Video,
  RefreshCw,
  Zap,
  Sliders,
  Layers,
  LayoutGrid,
  Map as MapIcon,
  Columns,
  Compass,
  Navigation,
  ExternalLink,
  Sparkles,
  Key,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'map' | 'wall' | 'split' | 'alerts';
  setActiveTab: (tab: 'map' | 'wall' | 'split' | 'alerts') => void;
  countdown: number;
  onRefresh: () => void;
  isRefreshing: boolean;
  totalCameras: number;
  selectedCamerasCount: number;
  rushHourActive: boolean;
  setRushHourActive: (val: boolean) => void;
  alertsCount?: number;
  onOpenTour?: () => void;
  onStartGpsNavigation?: () => void;
  hasActiveRoute?: boolean;
  onOpenAiConfigModal?: () => void;
  hasUserAiKey?: boolean;
  isPublicTransportMode?: boolean;
  onTogglePublicTransportMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  countdown,
  onRefresh,
  isRefreshing,
  totalCameras,
  selectedCamerasCount,
  rushHourActive,
  setRushHourActive,
  alertsCount = 0,
  onOpenTour,
  onStartGpsNavigation,
  hasActiveRoute = false,
  onOpenAiConfigModal,
  hasUserAiKey = false,
  isPublicTransportMode = false,
  onTogglePublicTransportMode,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800 text-slate-100 px-3 sm:px-4 lg:px-6 py-2 flex flex-wrap items-center justify-between gap-3 shadow-lg">
      {/* Brand logo, Creator Link & Live Badge */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Creator Logo & Link to unfantasmaenelsistema.com (without distortion) */}
        <a
          href="https://www.unfantasmaenelsistema.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2 p-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/60 transition-all shadow-md active:scale-95 shrink-0"
          title="Visitar Un Fantasma en el Sistema (https://www.unfantasmaenelsistema.com/)"
        >
          <div className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-slate-950 border border-slate-800/80 p-1 overflow-hidden shrink-0 aspect-square">
            <GhostLogo className="w-full h-full object-contain aspect-square select-none group-hover:scale-105 transition-transform" />
          </div>
          <div className="hidden sm:flex flex-col pr-1 text-left select-none">
            <span className="text-[9px] font-mono uppercase tracking-wider text-cyan-400 font-bold leading-none">
              Un Fantasma
            </span>
            <span className="text-[11px] font-black text-slate-100 group-hover:text-cyan-300 transition-colors leading-tight">
              en el Sistema
            </span>
          </div>
        </a>

        <div className="h-7 w-px bg-slate-800 hidden sm:block" />

        {/* Alicante Tráfico Title */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
              <span>ALICANTE</span>
              <span className="text-cyan-400 font-black">TRÁFICO</span>
            </h1>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              EN VIVO
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">
            {totalCameras} cámaras · {alertsCount} alertas activas · Detección de ruta más rápida
          </p>
        </div>
      </div>

      {/* Center: View Switcher */}
      <div className="flex items-center bg-slate-900/90 p-1 rounded-lg border border-slate-800">
        <button
          onClick={() => setActiveTab('map')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'map'
              ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Vista de Mapa y Planificador de Ruta"
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>Ruta y Mapa</span>
        </button>

        <button
          onClick={() => setActiveTab('split')}
          className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'split'
              ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Pantalla Dividida: Mapa + Mural en simultáneo"
        >
          <Columns className="w-3.5 h-3.5" />
          <span>Dividida</span>
        </button>

        <button
          onClick={() => setActiveTab('wall')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'wall'
              ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Visualizar todas las cámaras seleccionadas en una sola pantalla"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Mural</span>
          {selectedCamerasCount > 0 && (
            <span
              className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'wall' ? 'bg-slate-900 text-cyan-300' : 'bg-cyan-500/20 text-cyan-400'
              }`}
            >
              {selectedCamerasCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'alerts'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Panel de Alertas e Incidencias en Alicante"
        >
          <span className="text-xs">⚠️</span>
          <span>Alertas</span>
          {alertsCount > 0 && (
            <span
              className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'alerts' ? 'bg-slate-950 text-amber-300' : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {alertsCount}
            </span>
          )}
        </button>
      </div>

      {/* Right controls: GPS Nav, Tour Button, Rush Hour switch & Refresh Countdown */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 max-w-full">
        {/* GPS Navigator Quick Launch Button */}
        {hasActiveRoute && onStartGpsNavigation && (
          <button
            onClick={onStartGpsNavigation}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-md active:scale-95"
            title="Iniciar modo navegador GPS con guiado paso a paso por voz"
          >
            <Navigation className="w-3.5 h-3.5 fill-slate-950" />
            <span className="hidden sm:inline">Navegar GPS</span>
          </button>
        )}

        {/* Tour 3D & Cameras Quick Launch Button */}
        {hasActiveRoute && onOpenTour && (
          <button
            onClick={onOpenTour}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-slate-200 hover:text-white transition-all shadow-sm active:scale-95"
            title="Abrir Tour Virtual: Vuelo 3D y Cámaras en Vivo por la ruta"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Tour 3D</span>
          </button>
        )}

        {/* Public Transport & Taxi Mode Toggle Button */}
        {onTogglePublicTransportMode && (
          <button
            onClick={onTogglePublicTransportMode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition-all ${
              isPublicTransportMode
                ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-md ring-1 ring-amber-400/40'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-300 hover:border-amber-400/50'
            }`}
            title="Activar Modo Transporte Público / Taxi (Paradas de Taxi, Taxímetro, Carril Bus-Taxi, AVE/Aeropuerto)"
          >
            <span className="text-xs">🚖</span>
            <span className="hidden sm:inline">Transporte Público</span>
            {isPublicTransportMode && (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
            )}
          </button>
        )}

        {/* Rush Hour simulator */}
        <button
          onClick={() => setRushHourActive(!rushHourActive)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition-colors ${
            rushHourActive
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
          }`}
          title="Alternar simulación de hora punta con tráfico pesado en accesos clave"
        >
          <Zap className={`w-3.5 h-3.5 ${rushHourActive ? 'text-amber-400 animate-bounce' : 'text-slate-500'}`} />
          <span className="hidden sm:inline">Hora Punta</span>
        </button>

        {/* Gemini AI API Key Settings button */}
        {onOpenAiConfigModal && (
          <button
            onClick={onOpenAiConfigModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition-all ${
              hasUserAiKey
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-semibold shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
            title="Configurar tu propia clave API de Gemini (Google AI Studio) guardada en este navegador"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Clave IA</span>
            {hasUserAiKey && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        )}

        {/* PWA Install Button for mobile / Android Auto */}
        <PWAInstallButton />

        {/* Auto-refresh timer */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-2.5 py-1.5 rounded-md text-xs font-mono text-slate-300">
          <span className="text-slate-500 text-[10px]">↻</span>
          <span className="w-4 text-center font-bold text-cyan-400">{countdown}s</span>
          <div className="w-10 h-1 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
            <div
              className="h-full bg-cyan-400 transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / 15) * 100}%` }}
            />
          </div>
        </div>

        {/* Manual refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center justify-center p-1.5 sm:px-3 sm:py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all text-xs font-medium active:scale-95 disabled:opacity-50"
          title="Refrescar fotogramas de cámaras ahora"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          <span className="hidden md:inline ml-1.5">Refrescar</span>
        </button>
      </div>
    </header>
  );
};
