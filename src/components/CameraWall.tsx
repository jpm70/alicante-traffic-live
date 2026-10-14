import React, { useState, useMemo } from 'react';
import { TrafficCamera, CAMERAS, ZONES, PRESET_ROUTES } from '../data/cameras';
import { CalculatedRoute } from '../services/routing';
import {
  Grid,
  Search,
  CheckSquare,
  Square,
  Maximize2,
  Navigation,
  Compass,
  Layers,
  Filter,
  Eye,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';

interface CameraWallProps {
  selectedCameraIds: Set<string>;
  onToggleCameraSelection: (camId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSelectRouteCameras: (route: CalculatedRoute) => void;
  activeRoute: CalculatedRoute | null;
  onOpenLightbox: (cam: TrafficCamera) => void;
  cacheBuster: number;
}

export const CameraWall: React.FC<CameraWallProps> = ({
  selectedCameraIds,
  onToggleCameraSelection,
  onSelectAll,
  onDeselectAll,
  onSelectRouteCameras,
  activeRoute,
  onOpenLightbox,
  cacheBuster,
}) => {
  const [filterMode, setFilterMode] = useState<'route' | 'selected' | 'all' | 'zone' | 'preset'>('route');
  const [selectedZone, setSelectedZone] = useState<string>(ZONES[0].name);
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('playa');
  const [searchQuery, setSearchQuery] = useState('');
  const [gridLayout, setGridLayout] = useState<'auto' | '2x2' | '3x3' | '4x4' | '1x1'>('auto');

  // Route cameras set for fast lookup
  const routeCameraIds = useMemo(() => {
    if (!activeRoute) return new Set<string>();
    return new Set(activeRoute.cameras.map((c) => c.id));
  }, [activeRoute]);

  // Compute camera list to display based on active filter
  const displayedCameras = useMemo(() => {
    let list: TrafficCamera[] = [];

    if (filterMode === 'route') {
      if (activeRoute && activeRoute.cameras.length > 0) {
        list = activeRoute.cameras;
      } else {
        list = CAMERAS.slice(0, 12);
      }
    } else if (filterMode === 'selected') {
      list = CAMERAS.filter((c) => selectedCameraIds.has(c.id));
    } else if (filterMode === 'zone') {
      list = CAMERAS.filter((c) => c.zona === selectedZone);
    } else if (filterMode === 'preset') {
      const p = PRESET_ROUTES[selectedPresetKey];
      if (p) {
        list = CAMERAS.filter((c) => p.cameraIds.includes(c.id));
      }
    } else {
      list = CAMERAS;
    }

    // Apply search filter if any
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.zona.toLowerCase().includes(q)
      );
    }

    return list;
  }, [filterMode, selectedZone, selectedPresetKey, searchQuery, selectedCameraIds, activeRoute]);

  const timestamp = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  // Determine grid classes based on layout setting
  const getGridClasses = () => {
    switch (gridLayout) {
      case '1x1':
        return 'grid-cols-1 max-w-3xl mx-auto';
      case '2x2':
        return 'grid-cols-1 sm:grid-cols-2';
      case '3x3':
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
      case '4x4':
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4';
      case 'auto':
      default:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0f17] text-slate-100">
      {/* Control bar */}
      <div className="bg-[#111827] border-b border-slate-800 p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Main Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setFilterMode('route')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                filterMode === 'route'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Cámaras de mi Ruta</span>
              {activeRoute && (
                <span className="text-[10px] bg-slate-950/30 px-1.5 py-0.2 rounded-full font-mono">
                  {activeRoute.cameras.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setFilterMode('selected')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                filterMode === 'selected'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Personalizadas</span>
              <span className="text-[10px] bg-slate-950/30 px-1.5 py-0.2 rounded-full font-mono">
                {selectedCameraIds.size}
              </span>
            </button>

            <button
              onClick={() => setFilterMode('zone')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                filterMode === 'zone'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Por Zonas</span>
            </button>

            <button
              onClick={() => setFilterMode('preset')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                filterMode === 'preset'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Ejes Principales</span>
            </button>

            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                filterMode === 'all'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>Todas (159)</span>
            </button>
          </div>

          {/* Grid Layout Selector & Counters */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs text-slate-400">
              <span className="text-[10px] uppercase font-mono px-1.5 text-slate-500 hidden sm:inline">Rejilla:</span>
              <button
                onClick={() => setGridLayout('auto')}
                className={`px-2 py-1 rounded ${gridLayout === 'auto' ? 'bg-slate-800 text-cyan-400 font-bold' : ''}`}
                title="Auto / Flexible"
              >
                Auto
              </button>
              <button
                onClick={() => setGridLayout('2x2')}
                className={`px-2 py-1 rounded ${gridLayout === '2x2' ? 'bg-slate-800 text-cyan-400 font-bold' : ''}`}
                title="2x2"
              >
                2x2
              </button>
              <button
                onClick={() => setGridLayout('3x3')}
                className={`px-2 py-1 rounded ${gridLayout === '3x3' ? 'bg-slate-800 text-cyan-400 font-bold' : ''}`}
                title="3x3 (Mural)"
              >
                3x3
              </button>
              <button
                onClick={() => setGridLayout('4x4')}
                className={`px-2 py-1 rounded ${gridLayout === '4x4' ? 'bg-slate-800 text-cyan-400 font-bold' : ''}`}
                title="4x4 (Denso)"
              >
                4x4
              </button>
            </div>

            {/* Quick batch selection buttons */}
            <button
              onClick={onSelectAll}
              className="text-xs px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 hidden lg:inline"
              title="Marcar todas las cámaras en pantalla"
            >
              Marcar Todas
            </button>
            <button
              onClick={onDeselectAll}
              className="text-xs px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700"
              title="Limpiar selección manual"
            >
              Deseleccionar
            </button>
          </div>
        </div>

        {/* Sub-bar: Search and Zone / Preset selectors */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex-1 min-w-[200px] max-w-md relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cámara por calle, ID o zona (ej. Soler, C04F5, Denia)..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500/70 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sub-selector for Zone */}
          {filterMode === 'zone' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {ZONES.map((z) => (
                <button
                  key={z.name}
                  onClick={() => setSelectedZone(z.name)}
                  className={`text-xs px-2.5 py-1 rounded-md whitespace-nowrap transition-colors ${
                    selectedZone === z.name
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {z.name} ({z.count})
                </button>
              ))}
            </div>
          )}

          {/* Sub-selector for Preset Corridors */}
          {filterMode === 'preset' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {Object.entries(PRESET_ROUTES).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setSelectedPresetKey(key)}
                  className={`text-xs px-2.5 py-1 rounded-md whitespace-nowrap transition-colors ${
                    selectedPresetKey === key
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {val.label}
                </button>
              ))}
            </div>
          )}

          <div className="text-xs text-slate-400 font-mono">
            Mostrando <span className="text-cyan-400 font-bold">{displayedCameras.length}</span> cámaras simultáneas
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {displayedCameras.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-900/40 border border-slate-800 rounded-xl">
            <Eye className="w-10 h-10 text-slate-600 mb-2" />
            <h4 className="text-sm font-semibold text-slate-300">No hay cámaras que coincidan</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              {filterMode === 'selected'
                ? 'Aún no has marcado cámaras. Haz clic en "Cámaras de mi Ruta" o selecciona cámaras de la lista.'
                : 'Prueba a cambiar el filtro o el término de búsqueda.'}
            </p>
          </div>
        ) : (
          <div className={`grid gap-3 ${getGridClasses()}`}>
            {displayedCameras.map((cam) => {
              const isChecked = selectedCameraIds.has(cam.id);
              const isOnActiveRoute = routeCameraIds.has(cam.id);

              return (
                <div
                  key={cam.id}
                  className={`group relative bg-[#111827] rounded-xl overflow-hidden border transition-all shadow-lg hover:shadow-cyan-500/10 ${
                    isOnActiveRoute
                      ? 'border-cyan-500/60 ring-1 ring-cyan-500/30'
                      : isChecked
                      ? 'border-slate-600'
                      : 'border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  {/* Top Bar inside card */}
                  <div className="bg-slate-950/80 px-2.5 py-1.5 flex items-center justify-between border-b border-slate-800/80 text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono font-bold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40 text-[10px]">
                        {cam.id}
                      </span>
                      <span className="font-medium text-slate-300 truncate" title={cam.name}>
                        {cam.name}
                      </span>
                    </div>

                    <button
                      onClick={() => onToggleCameraSelection(cam.id)}
                      className="text-slate-400 hover:text-white p-0.5 ml-1 transition-colors"
                      title={isChecked ? 'Quitar de la selección' : 'Añadir a la selección'}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </button>
                  </div>

                  {/* Camera Frame Preview */}
                  <div
                    onClick={() => onOpenLightbox(cam)}
                    className="relative aspect-video bg-black cursor-pointer overflow-hidden group/img"
                  >
                    <img
                      src={`${cam.url}&t=${cacheBuster}`}
                      alt={cam.name}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.opacity = '0.2';
                      }}
                    />

                    {/* Gradient Overlay for labels */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent pointer-events-none" />

                    {/* Live Dot & Timestamp */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{timestamp}</span>
                    </div>

                    {/* Route Corridor Badge */}
                    {isOnActiveRoute && (
                      <div className="absolute top-2 right-2 bg-cyan-500/90 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                        EN TU RUTA
                      </div>
                    )}

                    {/* Expand Hover Icon */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 bg-slate-950/40 backdrop-blur-[2px] transition-opacity">
                      <span className="px-2.5 py-1 rounded-md bg-cyan-500 text-slate-950 text-xs font-bold flex items-center gap-1 shadow-lg">
                        <Maximize2 className="w-3.5 h-3.5" />
                        Ampliar
                      </span>
                    </div>

                    {/* Bottom Metadata */}
                    <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[10px] text-slate-400 pointer-events-none">
                      <span className="font-mono text-slate-300 truncate">{cam.zona}</span>
                      <span className="text-emerald-400 font-semibold font-mono">Fluido</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
