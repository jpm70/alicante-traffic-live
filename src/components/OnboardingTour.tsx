import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';

/** localStorage key: 'done' (tour finished) or 'dismissed' (welcome declined) */
export const ONBOARDING_STORAGE_KEY = 'alicante_onboarding_v1';

export function hasSeenOnboarding(): boolean {
  try {
    return Boolean(localStorage.getItem(ONBOARDING_STORAGE_KEY));
  } catch {
    return true; // Storage blocked: never nag
  }
}

function markOnboarding(value: 'done' | 'dismissed') {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, value);
  } catch {
    // Storage blocked: the welcome will show again next time
  }
}

export interface TourStep {
  /** Matches the `data-tour` attribute of the element to highlight */
  target: string;
  title: string;
  body: React.ReactNode;
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: 'planner-points',
    title: '1. ¿De dónde a dónde vas?',
    body: (
      <>
        Escribe una calle o un lugar en el <b>origen</b> y el <b>destino</b> (en castellano o en valenciano). También
        puedes usar tu <b>ubicación actual</b> 🎯, marcar el punto <b>en el mapa</b> 📍 o invertir el trayecto ⇅.
      </>
    ),
  },
  {
    target: 'planner-presets',
    title: '2. Calcula la ruta',
    body: (
      <>
        La ruta se recalcula sola al cambiar el origen o el destino. Si tienes prisa, prueba uno de los{' '}
        <b>trayectos habituales</b> de Alicante con un toque.
      </>
    ),
  },
  {
    target: 'route-summary',
    title: '3. Tu ruta, con tráfico real',
    body: (
      <>
        Aquí tienes el <b>camino más rápido</b>: tiempo, retraso por tráfico, estado de las cámaras, <b>radares</b> e{' '}
        <b>incidencias oficiales de la DGT</b> que hay en el trayecto. Más abajo verás las rutas alternativas.
      </>
    ),
  },
  {
    target: 'route-actions',
    title: '4. Y ahora, ¿qué hago con la ruta?',
    body: (
      <>
        <b>Navegador GPS</b> paso a paso con voz y avisos de radar, <b>Android Auto / Coche</b> para pasarla a Google
        Maps o Waze, el <b>mural con las cámaras</b> de tu ruta y el recorrido en <b>Street View</b> o en{' '}
        <b>vuelo 3D</b> antes de salir.
      </>
    ),
  },
  {
    target: 'map',
    title: '5. El mapa en vivo',
    body: (
      <>
        Cada cámara se colorea según el tráfico (verde fluido, naranja denso, rojo retención). Toca una cámara para
        verla en grande. Abajo tienes la <b>leyenda</b> y arriba puedes cambiar a vista de <b>calles</b> o{' '}
        <b>satélite</b>.
      </>
    ),
  },
  {
    target: 'view-switcher',
    title: '6. Cambia de vista',
    body: (
      <>
        <b>Ruta y Mapa</b> es la vista principal. En <b>Mural</b> ves muchas cámaras a la vez (se refrescan cada 15 s),{' '}
        <b>Dividida</b> junta mapa y cámaras en pantallas grandes y <b>Alertas</b> lista todas las incidencias de la
        DGT.
      </>
    ),
  },
  {
    target: 'header-tools',
    title: '7. Herramientas rápidas',
    body: (
      <ul className="space-y-1">
        <li>
          <b className="text-emerald-300">▲ Navegar GPS</b> y <b className="text-cyan-300">◎ Tour 3D</b> de la ruta
          activa.
        </li>
        <li>
          <b className="text-amber-300">🚖 Transporte público</b>: paradas de taxi, taxímetro, carril bus-taxi y
          demanda en AVE y aeropuerto.
        </li>
        <li>
          <b className="text-amber-300">⚡ Hora punta</b>: simula el tráfico de máxima carga.
        </li>
        <li>
          <b className="text-cyan-300">✨ Clave IA</b>: tu clave gratuita de Google para el dictamen con IA.
        </li>
      </ul>
    ),
  },
  {
    target: 'help-button',
    title: '¡Listo para salir!',
    body: (
      <>
        Puedes repetir este recorrido cuando quieras desde este botón. Consejo: instala la app en el móvil para
        abrirla como una aplicación más y usarla en el soporte del coche. ¡Buen viaje! 🚗
      </>
    ),
  },
];

/** First visible element with the given `data-tour` (the same anchor may exist in hidden views) */
function findTarget(target: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`);
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return node;
  }
  return null;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SPOTLIGHT_PADDING = 6;

// ---------------------------------------------------------------------------
// Welcome card (first visit)
// ---------------------------------------------------------------------------

interface OnboardingWelcomeProps {
  onStart: () => void;
  onDismiss: () => void;
}

export const OnboardingWelcome: React.FC<OnboardingWelcomeProps> = ({ onStart, onDismiss }) => {
  const startRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    startRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-[2px] animate-fadeIn">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-welcome-title"
        className="w-full max-w-md bg-[#0f172a] border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/40 p-5 sm:p-6 text-slate-200"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-xl">
            👋
          </span>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Cerrar la bienvenida"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <h2 id="onboarding-welcome-title" className="mt-3 text-lg font-extrabold text-white">
          Bienvenido a Alicante Tráfico en Vivo
        </h2>
        <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">
          Rutas con el tráfico real de la DGT, 159 cámaras en directo, GPS paso a paso, recorridos en 3D y herramientas
          para taxistas. ¿Te enseño lo básico? Es <b className="text-white">menos de un minuto</b>.
        </p>
        <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            onClick={onDismiss}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors"
          >
            Ahora no
          </button>
          <button
            ref={startRef}
            onClick={onStart}
            className="px-4 py-2.5 rounded-lg text-sm font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            Empezar el tour
          </button>
        </div>
        <p className="mt-3 text-[11px] text-slate-500 text-center sm:text-right">
          Podrás verlo cuando quieras con el botón <b className="text-slate-300">?</b> de arriba.
        </p>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Guided tour (spotlight + tooltip)
// ---------------------------------------------------------------------------

interface OnboardingTourProps {
  /** Called before showing a step so the app can open the view that contains it */
  onPrepareStep?: (step: TourStep) => void;
  onClose: (finished: boolean) => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onPrepareStep, onClose }) => {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [tooltipHeight, setTooltipHeight] = useState(220);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const directionRef = useRef<1 | -1>(1);
  const step = TOUR_STEPS[index];
  const isLast = index === TOUR_STEPS.length - 1;

  const finish = useCallback(
    (finished: boolean) => {
      markOnboarding(finished ? 'done' : 'dismissed');
      onClose(finished);
    },
    [onClose]
  );

  const go = useCallback(
    (delta: 1 | -1) => {
      directionRef.current = delta;
      const next = index + delta;
      if (next >= TOUR_STEPS.length) finish(true);
      else setIndex(Math.max(0, next));
    },
    [finish, index]
  );

  // Prepare the view, then bring the target into view (skipping steps whose target is not shown)
  useEffect(() => {
    onPrepareStep?.(step);
    let cancelled = false;
    let attempts = 0;
    const locate = () => {
      if (cancelled) return;
      const el = findTarget(step.target);
      if (el) {
        // Tall elements are aligned to their top, just below the sticky header
        const tall = el.getBoundingClientRect().height > window.innerHeight * 0.55;
        const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
        el.style.scrollMarginTop = `${Math.max(0, headerBottom) + 16}px`;
        el.scrollIntoView({ block: tall ? 'start' : 'center', inline: 'nearest', behavior: 'smooth' });
        return;
      }
      if (attempts++ < 10) {
        window.setTimeout(locate, 80);
      } else {
        // Not available right now (e.g. no route calculated): skip it
        go(directionRef.current);
      }
    };
    const id = window.setTimeout(locate, 30);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [index]);

  // Follow the target while it scrolls, resizes or the layout changes
  useEffect(() => {
    let frame = 0;
    let last = '';
    const tick = () => {
      const el = findTarget(step.target);
      const r = el?.getBoundingClientRect();
      const next = r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null;
      const key = next ? `${Math.round(next.top)}|${Math.round(next.left)}|${Math.round(next.width)}|${Math.round(next.height)}` : '';
      if (key !== last) {
        last = key;
        setRect(next);
      }
      if (viewport.width !== window.innerWidth || viewport.height !== window.innerHeight) {
        setViewport({ width: window.innerWidth, height: window.innerHeight });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [step.target, viewport.width, viewport.height]);

  useLayoutEffect(() => {
    if (tooltipRef.current) setTooltipHeight(tooltipRef.current.offsetHeight);
  }, [index, viewport.width]);

  // Keyboard: arrows to move, Esc to leave; focus stays on the tour
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish(false);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish, go]);

  useEffect(() => {
    tooltipRef.current?.querySelector<HTMLButtonElement>('[data-tour-next]')?.focus({ preventScroll: true });
  }, [index]);

  // Tooltip placement: docked to the screen edge on phones, next to the target otherwise
  const isPhone = viewport.width < 640;
  const width = Math.min(360, viewport.width - 24);
  const margin = 12;
  let tooltipStyle: React.CSSProperties;
  if (!rect) {
    tooltipStyle = { left: (viewport.width - width) / 2, top: (viewport.height - tooltipHeight) / 2, width };
  } else {
    const hole = {
      top: rect.top - SPOTLIGHT_PADDING,
      bottom: rect.top + rect.height + SPOTLIGHT_PADDING,
      left: rect.left - SPOTLIGHT_PADDING,
      right: rect.left + rect.width + SPOTLIGHT_PADDING,
    };
    const spaceBelow = viewport.height - hole.bottom - margin;
    const spaceAbove = hole.top - margin;
    const targetCenterY = (Math.max(hole.top, 0) + Math.min(hole.bottom, viewport.height)) / 2;
    if (isPhone) {
      const dockTop = targetCenterY > viewport.height / 2;
      tooltipStyle = dockTop ? { left: 12, right: 12, top: 12 } : { left: 12, right: 12, bottom: 12 };
    } else {
      const left = Math.min(Math.max(hole.left, margin), viewport.width - width - margin);
      if (spaceBelow >= tooltipHeight) tooltipStyle = { left, top: hole.bottom + margin, width };
      else if (spaceAbove >= tooltipHeight) tooltipStyle = { left, top: hole.top - margin - tooltipHeight, width };
      else if (viewport.width - hole.right - margin >= width)
        tooltipStyle = { left: hole.right + margin, top: Math.max(margin, Math.min(targetCenterY - tooltipHeight / 2, viewport.height - tooltipHeight - margin)), width };
      else tooltipStyle = { left: (viewport.width - width) / 2, bottom: margin, width };
    }
  }

  return (
    <div className="fixed inset-0 z-[2000]" aria-live="polite">
      {/* Click shield: the page underneath is not interactive during the tour */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      {/* Spotlight: transparent hole with a huge shadow dimming everything else */}
      {rect ? (
        <div
          className="absolute rounded-xl border-2 border-cyan-400 pointer-events-none transition-all duration-300 ease-out"
          style={{
            top: rect.top - SPOTLIGHT_PADDING,
            left: rect.left - SPOTLIGHT_PADDING,
            width: rect.width + SPOTLIGHT_PADDING * 2,
            height: rect.height + SPOTLIGHT_PADDING * 2,
            boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.72), 0 0 24px 4px rgba(34, 211, 238, 0.35)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-950/70 pointer-events-none" />
      )}

      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-step-title"
        className="absolute bg-[#0f172a] border border-cyan-500/40 rounded-2xl shadow-2xl shadow-black/60 p-4 text-slate-200 transition-[top,left,bottom] duration-300"
        style={tooltipStyle}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="onboarding-step-title" className="text-sm font-extrabold text-white leading-snug">
            {step.title}
          </h2>
          <button
            onClick={() => finish(false)}
            className="-mt-1 -mr-1 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
            aria-label="Salir del tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-1.5 text-[13px] leading-relaxed text-slate-300">{step.body}</div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1" aria-label={`Paso ${index + 1} de ${TOUR_STEPS.length}`}>
            {TOUR_STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-4 bg-cyan-400' : 'w-1.5 bg-slate-700'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {index > 0 ? (
              <button
                onClick={() => go(-1)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Atrás
              </button>
            ) : (
              <button
                onClick={() => finish(false)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Saltar
              </button>
            )}
            <button
              data-tour-next
              onClick={() => go(1)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-1 transition-colors"
            >
              {isLast ? 'Terminar' : 'Siguiente'}
              {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
