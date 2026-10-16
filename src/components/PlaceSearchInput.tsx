import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Building2, Loader2, MapPin, Route as RouteIcon, Star } from 'lucide-react';
import {
  PlaceSuggestion,
  StreetIndex,
  findHouseNumber,
  loadStreetIndex,
  parseQuery,
  searchLandmarks,
  searchPlaces,
  searchStreets,
} from '../services/addressSearch';
import type { RoutePoint } from '../services/routing';

interface PlaceSearchInputProps {
  label: string;
  value: string; // name of the current point
  placeholder: string;
  accent: 'emerald' | 'rose';
  onSelect: (point: RoutePoint & { name: string }) => void;
  children?: React.ReactNode; // buttons next to the field (GPS, pick on map)
}

const PLACES_DELAY_MS = 350;
// Below Tailwind's lg the planner is a short scrolling box above the map, which would clip
// the list: there the search opens full screen, like a phone maps app.
const FULL_SCREEN_QUERY = '(max-width: 1023px)';

function useFullScreenSearch(): boolean {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(FULL_SCREEN_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(FULL_SCREEN_QUERY);
    const update = () => setMatch(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return match;
}

// Search box with suggestions: streets (own index, both languages), places (Photon) and
// the app's popular places. Typing a number after the street ("maisonnave 10") looks the
// house number up when the street is chosen.
export const PlaceSearchInput: React.FC<PlaceSearchInputProps> = ({ label, value, placeholder, accent, onSelect, children }) => {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const fullScreenQuery = useFullScreenSearch();
  const [open, setOpen] = useState(false);
  const [rowHeight, setRowHeight] = useState(0);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<StreetIndex | null>(null);
  const [indexState, setIndexState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [places, setPlaces] = useState<PlaceSuggestion[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [resolving, setResolving] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 7000);
    return () => clearTimeout(t);
  }, [notice]);

  // The street index is only downloaded when someone starts searching
  useEffect(() => {
    if (!open || indexState !== 'idle') return;
    setIndexState('loading');
    loadStreetIndex().then((idx) => {
      setIndex(idx);
      setIndexState(idx ? 'ready' : 'error');
    });
  }, [open, indexState]);

  // Places from Photon, after a short pause in typing
  useEffect(() => {
    const { tokens } = parseQuery(query);
    if (!open || tokens.join('').length < 3) {
      setPlaces([]);
      setPlacesLoading(false);
      return;
    }
    const controller = new AbortController();
    setPlacesLoading(true);
    const timer = setTimeout(() => {
      searchPlaces(query, controller.signal)
        .then(setPlaces)
        .catch(() => setPlaces([]))
        .finally(() => !controller.signal.aborted && setPlacesLoading(false));
    }, PLACES_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  const typing = query.trim().length > 0;
  const { number } = parseQuery(query);
  const streets = useMemo(() => (typing && index ? searchStreets(index, query, 6) : []), [typing, index, query]);
  const landmarks = useMemo(() => searchLandmarks(query, typing ? 3 : 20), [typing, query]);
  const suggestions: PlaceSuggestion[] = typing ? [...streets, ...landmarks, ...places] : landmarks;

  useEffect(() => setHighlight(0), [query]);

  const close = () => {
    setOpen(false);
    setQuery('');
    setResolving(null);
  };

  const choose = async (s: PlaceSuggestion) => {
    if (s.kind === 'street' && number) {
      setResolving(s.id);
      const point = await findHouseNumber(s, number).catch(() => null);
      const town = s.municipality ? `, ${s.municipality}` : '';
      if (point) onSelect({ ...point, name: `${s.label} ${number}${town}` });
      else {
        onSelect({ lat: s.lat, lng: s.lng, name: `${s.label}${town}` });
        setNotice(`El nº ${number} de ${s.label} no está en OpenStreetMap: se usa un punto de la calle.`);
      }
    } else {
      const town = s.kind === 'street' && s.municipality ? `, ${s.municipality}` : '';
      onSelect({ lat: s.lat, lng: s.lng, name: `${s.label}${town}` });
    }
    close();
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const s = suggestions[highlight];
      if (s) choose(s);
    } else if (e.key === 'Escape') {
      close();
      inputRef.current?.blur();
    }
  };

  const ring = accent === 'emerald' ? 'focus-within:border-emerald-500/70' : 'focus-within:border-rose-500/70';
  const dot = accent === 'emerald' ? 'bg-emerald-500 ring-emerald-500/20' : 'bg-rose-500 ring-rose-500/20';
  const icon = (s: PlaceSuggestion) =>
    s.kind === 'street' ? <RouteIcon className="w-4 h-4 text-cyan-400" /> : s.kind === 'landmark' ? <Star className="w-4 h-4 text-amber-400" /> : <Building2 className="w-4 h-4 text-violet-300" />;

  let status: string | null = null;
  if (typing && indexState === 'loading') status = 'Cargando el callejero…';
  else if (typing && indexState === 'error') status = 'No se pudo cargar el callejero: solo lugares.';
  else if (typing && !suggestions.length && !placesLoading) status = 'No se encontraron calles ni lugares.';

  const fullScreen = open && fullScreenQuery;

  return (
    // While full screen, the box keeps its height in the page so nothing jumps behind it
    <div className="relative" data-place-search style={fullScreen ? { height: rowHeight } : undefined}>
      <div className={fullScreen ? 'fixed inset-0 z-[2000] bg-[#0b1120] p-3 flex flex-col gap-2' : ''}>
        <div ref={rowRef} className={`flex items-center gap-2 bg-slate-900/90 border border-slate-800 ${ring} rounded-lg px-3 py-2 transition-all`}>
          {fullScreen && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                close();
                inputRef.current?.blur();
              }}
              className="-ml-1 p-1.5 rounded-md text-slate-300 hover:text-white"
              aria-label="Cerrar la búsqueda"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <span className={`flex-shrink-0 w-3 h-3 rounded-full ring-4 ${dot}`} />
          <div className="flex-1 min-w-0">
            <label htmlFor={`${listId}-input`} className="block text-[10px] uppercase font-mono tracking-wider text-slate-400">
              {label}
            </label>
            <input
              ref={inputRef}
              id={`${listId}-input`}
              type="search"
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={open && suggestions[highlight] ? `${listId}-${highlight}` : undefined}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="search"
              enterKeyHint="search"
              value={open ? query : value}
              onFocus={() => {
                setRowHeight(rowRef.current?.offsetHeight || 0);
                setOpen(true);
                setQuery('');
              }}
              onBlur={() => setTimeout(close, 150)}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              // 16 px on phones: smaller text makes iOS zoom the page when the field gets focus
              className="w-full bg-transparent text-base sm:text-sm font-semibold text-white focus:outline-none placeholder-slate-500 truncate [&::-webkit-search-cancel-button]:hidden"
            />
          </div>
          {!fullScreen && children}
        </div>

        {open && (
          <div
            id={listId}
            role="listbox"
            aria-label={`Sugerencias para ${label.toLowerCase()}`}
            className={`bg-[#1e293b] border border-slate-700 rounded-lg shadow-2xl overflow-y-auto divide-y divide-slate-800 ${
              fullScreen ? 'min-h-0' : 'absolute top-full left-0 right-0 mt-1 z-50 max-h-[min(22rem,55vh)]'
            }`}
          >
            <div className="px-3 py-2 text-[11px] text-slate-400 font-medium bg-slate-900/60 flex items-center justify-between gap-2">
              <span>{typing ? (number ? `Calles y lugares · portal nº ${number}` : 'Calles y lugares') : 'Escribe una calle o un lugar · lugares populares:'}</span>
              {placesLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 flex-shrink-0" aria-label="Buscando lugares" />}
            </div>
            {suggestions.map((s, i) => (
              <button
                key={s.id}
                id={`${listId}-${i}`}
                type="button"
                role="option"
                aria-selected={i === highlight}
                // Keep the focus in the field so the blur does not close the list first
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s)}
                onMouseEnter={() => setHighlight(i)}
                className={`w-full text-left px-3 py-2.5 sm:py-2 flex items-center gap-2.5 transition-colors ${i === highlight ? 'bg-slate-800/90' : 'hover:bg-slate-800/60'}`}
              >
                <span className="flex-shrink-0">{resolving === s.id ? <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> : icon(s)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm sm:text-xs font-semibold text-slate-100 truncate">
                    {s.label}
                    {s.kind === 'street' && number ? <span className="text-cyan-300"> {number}</span> : null}
                  </span>
                  <span className="block text-[11px] text-slate-400 truncate">{s.detail}</span>
                </span>
              </button>
            ))}
            {status && (
              <div className="p-3 text-xs text-slate-400 text-center flex items-center justify-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {status}
              </div>
            )}
            {typing && (
              <div className="px-3 py-1.5 text-[10px] text-slate-500 bg-slate-900/60">Calles y lugares © colaboradores de OpenStreetMap</div>
            )}
          </div>
        )}
      </div>
      {notice && !open && (
        <div role="status" className="mt-1 px-2.5 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px]">
          {notice}
        </div>
      )}
    </div>
  );
};
