import React, { useState, useEffect } from 'react';
import { Key, Sparkles, CheckCircle2, AlertTriangle, Eye, EyeOff, Trash2, ExternalLink, X, ShieldCheck } from 'lucide-react';

import { GEMINI_API_KEY_STORAGE_KEY, testGeminiKey, explainGeminiError } from '../services/gemini';

export { GEMINI_API_KEY_STORAGE_KEY };

interface AiApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyChange?: (hasKey: boolean) => void;
}

export const AiApiKeyModal: React.FC<AiApiKeyModalProps> = ({ isOpen, onClose, onKeyChange }) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Load existing key from localStorage
  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || '';
      setApiKey(storedKey);
      setTestResult(null);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (trimmed) {
      localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, trimmed);
      onKeyChange?.(true);
    } else {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
      onKeyChange?.(false);
    }
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
    setApiKey('');
    setTestResult(null);
    onKeyChange?.(false);
  };

  const handleTestKey = async () => {
    const keyToTest = apiKey.trim();
    if (!keyToTest) {
      setTestResult({
        success: false,
        message: 'Por favor, introduce una clave para probar.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const model = await testGeminiKey(keyToTest);
      setTestResult({
        success: true,
        message: `¡Conexión verificada con éxito con Gemini! La clave es válida (modelo ${model}).`,
      });
    } catch (err) {
      setTestResult({ success: false, message: explainGeminiError(err) });
    } finally {
      setIsTesting(false);
    }
  };

  const hasStoredKey = Boolean(typeof window !== 'undefined' && localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY));

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#0f172a] border border-cyan-500/50 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative text-slate-100 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Configurar Clave API de IA (Gemini)</span>
                {hasStoredKey && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    ACTIVA
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Guarda tu clave de Google AI Studio localmente en este navegador
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Explanation Banner */}
        <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 space-y-2 text-xs text-slate-300">
          <p className="leading-relaxed">
            Puedes configurar tu propia clave de <strong>Gemini API</strong> para generar dictámenes tácticos y análisis inteligente de semáforos, rotondas y retenciones con las 159 cámaras de Alicante.
          </p>
          <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-semibold">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>100% Privado: La clave se almacena exclusivamente en el almacenamiento local de tu navegador (localStorage).</span>
          </div>
        </div>

        {/* Input Form */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-cyan-400" />
              <span>Tu clave Gemini API (AI Studio):</span>
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 font-medium"
            >
              <span>Obtener clave gratis</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </label>

          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 pr-10 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded"
              title={showKey ? 'Ocultar clave' : 'Mostrar clave'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`p-3 rounded-xl text-xs flex items-start gap-2.5 border animate-fadeIn ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="leading-snug">{testResult.message}</div>
          </div>
        )}

        {/* Save confirmation */}
        {saveSuccess && (
          <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>¡Clave guardada correctamente en tu navegador!</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2">
            {apiKey && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/30 transition-colors flex items-center gap-1.5"
                title="Borrar clave del navegador"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Borrar</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleTestKey}
              disabled={isTesting || !apiKey.trim()}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-40"
              title="Probar si la clave funciona con Gemini"
            >
              <Sparkles className={`w-3.5 h-3.5 text-cyan-400 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Probando...' : 'Probar Clave'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar en Navegador</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
