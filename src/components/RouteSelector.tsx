import React, { useState } from 'react';
import { ALICANTE_LANDMARKS, Landmark } from '../data/cameras';
import { RoutePoint } from '../services/routing';
import {
  ArrowDownUp,
  MapPin,
  Navigation,
  Compass,
  Search,
  Sparkles,
  Crosshair,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface RouteSelectorProps {
  origin: RoutePoint & { name: string };
  destination: RoutePoint & { name: string };
  onOriginChange: (point: RoutePoint & { name: string }) => void;
  onDestinationChange: (point: RoutePoint & { name: string }) => void;
  onSwapPoints: () => void;
  isCalculating: boolean;
  onCalculateRoute: () => void;
  isPickOnMapActive: 'origin' | 'destination' | null;
  setIsPickOnMapActive: (type: 'origin' | 'destination' | null) => void;
}

const PRESET_JOURNEYS = [
  {
    title: 'Centro ➔ Playa San Juan',
    desc: 'Corredor marítimo vs Gran Vía',
    origin: ALICANTE_LANDMARKS[0], // Luceros
    dest: ALICANTE_LANDMARKS[5], // Playa San Juan
  },
  {
    title: 'Renfe ➔ Univ. Alicante',
    desc: 'Salamanca a Campus San Vicente',
    origin: ALICANTE_LANDMARKS[1], // Renfe
    dest: ALICANTE_LANDMARKS[8], // UA
  },
  {
    title: 'Gran Vía ➔ Puerto / Explanada',
    desc: 'Comercial Gran Vía a Muelle',
    origin: ALICANTE_LANDMARKS[9], // CC Gran Vía
    dest: ALICANTE_LANDMARKS[3], // Puerto
  },
  {
    title: 'San Gabriel ➔ Políg. Atalayas',
    desc: 'Acceso Sur a zona industrial',
    origin: ALICANTE_LANDMARKS[14], // San Gabriel
    dest: ALICANTE_LANDMARKS[12], // Las Atalayas
  },
  {
    title: 'Albufereta ➔ Renfe Estación',
    desc: 'Costa a estación de tren',
    origin: ALICANTE_LANDMARKS[6], // Albufereta
    dest: ALICANTE_LANDMARKS[1], // Renfe
  },
];

export const RouteSelector: React.FC<RouteSelectorProps> = ({
  origin,
  destination,
  onOriginChange,
  onDestinationChange,
  onSwapPoints,
  isCalculating,
  onCalculateRoute,
  isPickOnMapActive,
  setIsPickOnMapActive,
}) => {
  const [originSearch, setOriginSearch] = useState('');
  const [destSearch, setDestSearch] = useState('');
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Detect live GPS location
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Tu navegador no soporta geolocalización GPS.');
      setTimeout(() => setLocationError(null), 4000);
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    setLocationSuccess(false);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        let detectedName = `Mi ubicación actual [${latitude.toFixed(4)}, ${longitude.toFixed(4)}]`;

        try {
          // Fast reverse geocode for Alicante street name
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=17&addressdetails=1`,
            { headers: { 'Accept-Language': 'es' }, signal: AbortSignal.timeout(3000) }
          );
          if (res.ok) {
            const data = await res.json();
            const road = data.address?.road || data.address?.pedestrian || data.address?.suburb;
            const city = data.address?.city || data.address?.town || 'Alicante';
            if (road) {
              detectedName = `${road}, ${city}`;
            }
          }
        } catch {
          // Keep coordinate label
        }

        onOriginChange({
          lat: latitude,
          lng: longitude,
          name: detectedName,
        });

        setIsLocating(false);
        setLocationSuccess(true);
        setTimeout(() => setLocationSuccess(false), 3000);
      },
      (err) => {
        setIsLocating(false);
        let msg = 'No se pudo obtener tu ubicación.';
        if (err.code === 1) msg = 'Permiso de ubicación denegado.';
        else if (err.code === 2) msg = 'Ubicación GPS no disponible.';
        else if (err.code === 3) msg = 'Tiempo de espera de GPS agotado.';
        setLocationError(msg);
        setTimeout(() => setLocationError(null), 4500);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 10000,
      }
    );
  };

  const filteredOriginLandmarks = ALICANTE_LANDMARKS.filter((l) =>
    l.name.toLowerCase().includes(originSearch.toLowerCase()) ||
    l.zone.toLowerCase().includes(originSearch.toLowerCase())
  );

  const filteredDestLandmarks = ALICANTE_LANDMARKS.filter((l) =>
    l.name.toLowerCase().includes(destSearch.toLowerCase()) ||
    l.zone.toLowerCase().includes(destSearch.toLowerCase())
  );

  const selectOrigin = (l: Landmark) => {
    onOriginChange({ lat: l.lat, lng: l.lng, name: l.name });
    setShowOriginDropdown(false);
    setOriginSearch('');
  };

  const selectDest = (l: Landmark) => {
    onDestinationChange({ lat: l.lat, lng: l.lng, name: l.name });
    setShowDestDropdown(false);
    setDestSearch('');
  };

  const applyPreset = (preset: typeof PRESET_JOURNEYS[0]) => {
    onOriginChange({ lat: preset.origin.lat, lng: preset.origin.lng, name: preset.origin.name });
    onDestinationChange({ lat: preset.dest.lat, lng: preset.dest.lng, name: preset.dest.name });
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5" />
          Planificador de Trayecto en Alicante
        </h2>
        {isPickOnMapActive && (
          <span className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded font-mono animate-pulse">
            Haz clic en el mapa para marcar {isPickOnMapActive === 'origin' ? 'Origen' : 'Destino'}
          </span>
        )}
      </div>

      {locationError && (
        <div className="mb-2 p-2 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-1.5 animate-fadeIn">
          <span>⚠️ {locationError}</span>
        </div>
      )}

      {locationSuccess && (
        <div className="mb-2 p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-1.5 animate-fadeIn">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span>¡Ubicación actual fijada como punto de partida!</span>
        </div>
      )}

      <div className="space-y-2.5 relative">
        {/* Origin Selector */}
        <div className="relative">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 focus-within:border-emerald-500/70 rounded-lg px-3 py-2 transition-all">
            <span className="flex-shrink-0 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400">
                Punto de Partida (Origen)
              </label>
              <input
                type="text"
                value={showOriginDropdown ? originSearch : origin.name}
                onFocus={() => {
                  setShowOriginDropdown(true);
                  setOriginSearch('');
                }}
                onChange={(e) => setOriginSearch(e.target.value)}
                placeholder="Seleccionar o escribir ubicación en Alicante..."
                className="w-full bg-transparent text-sm font-semibold text-white focus:outline-none placeholder-slate-500 truncate"
              />
            </div>

            {/* GPS Detect My Location Button */}
            <button
              onClick={handleDetectLocation}
              disabled={isLocating}
              className={`p-1.5 rounded-md border text-xs transition-all flex items-center gap-1 ${
                isLocating
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border-slate-700'
              }`}
              title="Detectar mi ubicación actual como punto de partida (GPS)"
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              ) : (
                <Crosshair className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Pick on Map Button */}
            <button
              onClick={() => setIsPickOnMapActive(isPickOnMapActive === 'origin' ? null : 'origin')}
              className={`p-1.5 rounded-md border text-xs transition-colors ${
                isPickOnMapActive === 'origin'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
              title="Seleccionar punto directamente en el mapa de Alicante"
            >
              <MapPin className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Origin Dropdown Autocomplete */}
          {showOriginDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#1e293b] border border-slate-700 rounded-lg shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-800">
              <div className="p-2 text-[11px] text-slate-400 font-medium bg-slate-900/60 flex items-center justify-between">
                <span>Lugares populares de Alicante</span>
                <button
                  onClick={() => setShowOriginDropdown(false)}
                  className="text-slate-400 hover:text-white text-xs px-1"
                >
                  ✕ Cerrar
                </button>
              </div>
              {filteredOriginLandmarks.length > 0 ? (
                filteredOriginLandmarks.map((l) => (
                  <button
                    key={l.name}
                    onClick={() => selectOrigin(l)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800/90 flex items-center justify-between transition-colors"
                  >
                    <span className="font-medium text-slate-200">{l.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                      {l.zone}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-3 text-xs text-slate-400 text-center">No se encontraron ubicaciones</div>
              )}
            </div>
          )}
        </div>

        {/* Swap Button Divider */}
        <div className="flex items-center justify-center -my-1 z-10 relative">
          <button
            onClick={onSwapPoints}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-full shadow transition-transform active:rotate-180"
            title="Invertir origen y destino"
          >
            <ArrowDownUp className="w-3 h-3 text-cyan-400" />
          </button>
        </div>

        {/* Destination Selector */}
        <div className="relative">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 focus-within:border-rose-500/70 rounded-lg px-3 py-2 transition-all">
            <span className="flex-shrink-0 w-3 h-3 rounded-full bg-rose-500 ring-4 ring-rose-500/20" />
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400">
                Punto de Llegada (Destino)
              </label>
              <input
                type="text"
                value={showDestDropdown ? destSearch : destination.name}
                onFocus={() => {
                  setShowDestDropdown(true);
                  setDestSearch('');
                }}
                onChange={(e) => setDestSearch(e.target.value)}
                placeholder="Seleccionar o escribir destino en Alicante..."
                className="w-full bg-transparent text-sm font-semibold text-white focus:outline-none placeholder-slate-500 truncate"
              />
            </div>
            <button
              onClick={() => setIsPickOnMapActive(isPickOnMapActive === 'destination' ? null : 'destination')}
              className={`p-1.5 rounded-md border text-xs transition-colors ${
                isPickOnMapActive === 'destination'
                  ? 'bg-rose-500 text-white border-rose-400 font-bold'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
              title="Seleccionar destino directamente en el mapa"
            >
              <MapPin className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Destination Dropdown Autocomplete */}
          {showDestDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#1e293b] border border-slate-700 rounded-lg shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-800">
              <div className="p-2 text-[11px] text-slate-400 font-medium bg-slate-900/60 flex items-center justify-between">
                <span>Lugares populares de Alicante</span>
                <button
                  onClick={() => setShowDestDropdown(false)}
                  className="text-slate-400 hover:text-white text-xs px-1"
                >
                  ✕ Cerrar
                </button>
              </div>
              {filteredDestLandmarks.length > 0 ? (
                filteredDestLandmarks.map((l) => (
                  <button
                    key={l.name}
                    onClick={() => selectDest(l)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800/90 flex items-center justify-between transition-colors"
                  >
                    <span className="font-medium text-slate-200">{l.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                      {l.zone}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-3 text-xs text-slate-400 text-center">No se encontraron ubicaciones</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Calculate Button */}
      <button
        onClick={onCalculateRoute}
        disabled={isCalculating}
        className="w-full mt-3 py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
      >
        <Compass className={`w-4 h-4 ${isCalculating ? 'animate-spin' : ''}`} />
        <span>{isCalculating ? 'Analizando Cámaras y Tráfico...' : 'Calcular Camino Más Rápido'}</span>
      </button>

      {/* Presets Tray */}
      <div className="mt-3.5 pt-3 border-t border-slate-800">
        <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Trayectos Habituales de Alicante:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_JOURNEYS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => applyPreset(p)}
              className="text-[11px] px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 transition-colors truncate max-w-full"
              title={`${p.title} (${p.desc})`}
            >
              {p.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
