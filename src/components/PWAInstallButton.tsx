import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Check } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  // If already running inside installed standalone PWA, hide
  if (isInstalled) {
    return (
      <span className="hidden xl:inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-800/40">
        <Check className="w-3 h-3 text-cyan-400" />
        <span>PWA Instalada</span>
      </span>
    );
  }

  const handleInstallClick = async () => {
    const ok = await install();
    if (ok) {
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 4000);
    }
  };

  // Android / Chromium / Desktop prompt
  if (isInstallable) {
    return (
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
        title="Instalar como App nativa en tu móvil o pantalla de coche"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden">Instalar</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-slate-200 hover:text-white text-xs font-semibold shadow transition-all active:scale-95"
          title="Instalar en iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Añadir a Inicio</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-cyan-500/40 p-5 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Instalar en iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-300 space-y-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <p className="flex items-start gap-2">
                  <span className="font-bold font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded">1</span>
                  <span>Toca el botón <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba en Safari).</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-bold font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded">2</span>
                  <span>Desliza hacia abajo y pulsa en <strong>"Añadir a la pantalla de inicio"</strong>.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-bold font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded">3</span>
                  <span>Pulsa <strong>Añadir</strong>. Se ejecutará a pantalla completa como una app nativa en tu coche.</span>
                </p>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback indicator / button for general browsers
  return null;
};
