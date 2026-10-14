import React, { useState } from 'react';
import {
  X,
  Receipt,
  Clock,
  Navigation,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Copy,
  Check,
  Share2,
  Calendar,
  Moon,
  Sun,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { CalculatedRoute, RoutePoint } from '../services/routing';
import {
  calculateAlicanteTaxiFare,
  isNightOrHolidayAlicante,
  TaxiFareEstimate,
} from '../data/publicTransport';

interface TaxiFareModalProps {
  route: CalculatedRoute;
  origin: RoutePoint & { name: string };
  destination: RoutePoint & { name: string };
  onClose: () => void;
}

export const TaxiFareModal: React.FC<TaxiFareModalProps> = ({
  route,
  origin,
  destination,
  onClose,
}) => {
  const [selectedRateOverride, setSelectedRateOverride] = useState<'auto' | 'tarifa-1' | 'tarifa-2'>('auto');
  const [extraLuggage, setExtraLuggage] = useState<boolean>(false);
  const [extraSpecialNight, setExtraSpecialNight] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const effectiveRate = selectedRateOverride === 'auto' ? undefined : selectedRateOverride;

  const baseFare = calculateAlicanteTaxiFare(
    route.distanceKm,
    route.trafficDelayMinutes,
    origin.name,
    destination.name,
    effectiveRate
  );

  // Add optional manual supplements
  const manualSupplements: { name: string; amount: number }[] = [];
  if (extraLuggage) {
    manualSupplements.push({ name: 'Bulto / Maleta especial (> 60 cm)', amount: 0.60 });
  }
  if (extraSpecialNight) {
    manualSupplements.push({ name: 'Suplemento Noche Especial (Hogueras / Nochebuena / Nochevieja)', amount: 3.00 });
  }

  const manualTotal = manualSupplements.reduce((sum, item) => sum + item.amount, 0);
  const finalTotal = Math.round((baseFare.estimatedTotal + manualTotal) * 100) / 100;
  const finalRangeMin = Math.round((baseFare.estimatedRange[0] + manualTotal) * 10) / 10;
  const finalRangeMax = Math.round((baseFare.estimatedRange[1] + manualTotal) * 10) / 10;

  const handleCopyTicket = () => {
    const text = `🚖 ESTIMACIÓN TAXÍMETRO OFICIAL DE ALICANTE
---------------------------------------
Trayecto: ${origin.name} ➔ ${destination.name}
Ruta: ${route.name} (${route.distanceKm} km · aprox ${route.totalMinutes} min)
Régimen: ${baseFare.rateLabel}

DESGLOSE ESTIMADO:
• Bajada de bandera: ${baseFare.flagDrop.toFixed(2)} €
• Recorrido (${route.distanceKm} km): ${baseFare.distanceCost.toFixed(2)} €
• Tiempo de espera/tráfico (${route.trafficDelayMinutes} min): ${baseFare.timeDelayCost.toFixed(2)} €
${baseFare.appliedSupplements.map((s) => `• ${s.name}: ${s.amount.toFixed(2)} €`).join('\n')}
${manualSupplements.map((s) => `• ${s.name}: ${s.amount.toFixed(2)} €`).join('\n')}

TOTAL ESTIMADO: ${finalTotal.toFixed(2)} € (Rango: ${finalRangeMin.toFixed(2)} € - ${finalRangeMax.toFixed(2)} €)
*Tarifas oficiales aprobadas por la Generalitat Valenciana y Ayuntamiento de Alicante.`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#0f172a] border-2 border-amber-400/60 rounded-2xl max-w-xl w-full p-4 sm:p-6 shadow-2xl relative text-slate-100 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-md">
              🚖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Estimador de Taxímetro Oficial
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  ALICANTE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tarifas 1 y 2 según normativa de la Generalitat Valenciana
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

        {/* Rate Selector: Auto / Tarifa 1 / Tarifa 2 */}
        <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            Régimen Tarifario:
          </span>
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setSelectedRateOverride('auto')}
              className={`px-2.5 py-1 rounded font-semibold text-xs transition-all ${
                selectedRateOverride === 'auto'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Auto (Hora Real)
            </button>
            <button
              onClick={() => setSelectedRateOverride('tarifa-1')}
              className={`px-2.5 py-1 rounded font-semibold text-xs transition-all ${
                selectedRateOverride === 'tarifa-1'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tarifa 1 (Diurna)
            </button>
            <button
              onClick={() => setSelectedRateOverride('tarifa-2')}
              className={`px-2.5 py-1 rounded font-semibold text-xs transition-all ${
                selectedRateOverride === 'tarifa-2'
                  ? 'bg-purple-500 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tarifa 2 (Noche/Festivo)
            </button>
          </div>
        </div>

        {/* Big Total Box */}
        <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-400/80 rounded-2xl p-4 text-center relative overflow-hidden shadow-xl">
          <div className="text-[11px] font-mono text-amber-400 uppercase tracking-widest font-bold mb-1">
            {baseFare.rateLabel}
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center justify-center gap-1">
            <span>~{finalTotal.toFixed(2)}</span>
            <span className="text-xl sm:text-2xl text-amber-400">€</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Rango estimado de carrera:{' '}
            <strong className="text-slate-200">
              {finalRangeMin.toFixed(2)} € - {finalRangeMax.toFixed(2)} €
            </strong>
          </div>
        </div>

        {/* Trip Summary Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>Ruta seleccionada:</span>
            <span className="font-bold text-white">{route.name}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Distancia del trayecto:</span>
            <span className="font-mono font-bold text-cyan-400">{route.distanceKm} km</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Duración prevista con tráfico:</span>
            <span className="font-mono font-bold text-slate-200">{route.totalMinutes} min</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Retención estimada en semáforos/atascos:</span>
            <span className="font-mono font-bold text-amber-400">{route.trafficDelayMinutes} min</span>
          </div>
        </div>

        {/* Itemized Fare Breakdown */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
            Desglose Oficial del Taxímetro
          </h4>
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Bajada de bandera ({baseFare.rateType === 'tarifa-2' ? 'Tarifa 2' : 'Tarifa 1'}):</span>
              <span className="font-mono font-bold text-white">{baseFare.flagDrop.toFixed(2)} €</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300">
                Kilometraje ({route.distanceKm} km × {baseFare.rateType === 'tarifa-2' ? '1,34' : '1,12'} €/km):
              </span>
              <span className="font-mono font-bold text-white">{baseFare.distanceCost.toFixed(2)} €</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300">
                Tiempo de espera en retención ({route.trafficDelayMinutes} min):
              </span>
              <span className="font-mono font-bold text-white">{baseFare.timeDelayCost.toFixed(2)} €</span>
            </div>

            {/* Supplements detected */}
            {baseFare.appliedSupplements.map((sup, idx) => (
              <div key={idx} className="flex items-center justify-between text-amber-300 font-semibold pt-1 border-t border-slate-800/80">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  {sup.name}
                </span>
                <span className="font-mono font-bold">+{sup.amount.toFixed(2)} €</span>
              </div>
            ))}

            {manualSupplements.map((sup, idx) => (
              <div key={idx} className="flex items-center justify-between text-cyan-300 font-semibold pt-1 border-t border-slate-800/80">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  {sup.name}
                </span>
                <span className="font-mono font-bold">+{sup.amount.toFixed(2)} €</span>
              </div>
            ))}
          </div>
        </div>

        {/* Optional Manual Supplements toggles */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
          <span className="text-slate-400 block font-semibold">Suplementos opcionales bajo petición:</span>
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-950 p-2 rounded-lg border border-slate-800 flex-1">
              <input
                type="checkbox"
                checked={extraLuggage}
                onChange={(e) => setExtraLuggage(e.target.checked)}
                className="accent-amber-400"
              />
              <span className="text-slate-300 text-[11px]">Bulto / Maleta grande (+0,60 €)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer bg-slate-950 p-2 rounded-lg border border-slate-800 flex-1">
              <input
                type="checkbox"
                checked={extraSpecialNight}
                onChange={(e) => setExtraSpecialNight(e.target.checked)}
                className="accent-amber-400"
              />
              <span className="text-slate-300 text-[11px]">Noche Especial Hogueras/Navidad (+3,00 €)</span>
            </label>
          </div>
        </div>

        {/* Copy / Share Ticket Action */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleCopyTicket}
            className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '¡Recibo copiado al portapapeles!' : 'Copiar Ticket de Carrera'}</span>
          </button>
        </div>

        <p className="text-[10px] text-slate-500 text-center leading-relaxed">
          *Estimación calculada según el cuadro tarifario oficial del Área de Prestación Conjunta de Alicante. El importe real puede variar ligeramente en función de la velocidad y tiempos reales de semáforo.
        </p>
      </div>
    </div>
  );
};
