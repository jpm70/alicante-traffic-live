import React from 'react';
import {
  Car,
  MapPin,
  Clock,
  Gauge,
  Navigation,
  ExternalLink,
  ChevronRight,
  Zap,
  TrendingUp,
  AlertTriangle,
  Receipt,
  X,
  Smartphone,
  Plane,
  Train,
  CheckCircle2,
} from 'lucide-react';
import { TaxiStand, ALICANTE_TAXI_STANDS, calculateAlicanteTaxiFare } from '../data/publicTransport';
import { CalculatedRoute, RoutePoint } from '../services/routing';

interface PublicTransportBarProps {
  busTaxiLaneActive: boolean;
  onToggleBusTaxiLane: () => void;
  showTaxiStandsOnMap: boolean;
  onToggleTaxiStandsOnMap: () => void;
  onOpenTaxiFareModal: () => void;
  onOpenDemandRadarModal: () => void;
  onOpenTaxiDashboardModal: () => void;
  onOpenLocalClosuresModal: () => void;
  onClosePublicTransportMode: () => void;
  activeRoute?: CalculatedRoute | null;
  origin: RoutePoint & { name: string };
  destination: RoutePoint & { name: string };
  onSelectTaxiStandAsDestination: (stand: TaxiStand) => void;
}

export const PublicTransportBar: React.FC<PublicTransportBarProps> = ({
  busTaxiLaneActive,
  onToggleBusTaxiLane,
  showTaxiStandsOnMap,
  onToggleTaxiStandsOnMap,
  onOpenTaxiFareModal,
  onOpenDemandRadarModal,
  onOpenTaxiDashboardModal,
  onOpenLocalClosuresModal,
  onClosePublicTransportMode,
  activeRoute,
  origin,
  destination,
  onSelectTaxiStandAsDestination,
}) => {
  // Quick fare estimate for active route
  const fare = activeRoute
    ? calculateAlicanteTaxiFare(
        activeRoute.distanceKm,
        activeRoute.trafficDelayMinutes,
        origin.name,
        destination.name
      )
    : null;

  return (
    <div className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/10 border-b-2 border-amber-400/70 px-3 sm:px-6 py-2.5 text-xs text-slate-100 flex-shrink-0 animate-in slide-in-from-top duration-200 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        
        {/* Left: Badge & Mode Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-amber-400 text-slate-950 px-2.5 py-1 rounded-lg font-black text-xs shadow-md">
            <span className="text-sm">🚖</span>
            <span className="tracking-wide">MODO TRANSPORTE PÚBLICO · TAXI</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-amber-200/90 font-medium">
            <span>Herramientas para conductores profesionales en Alicante</span>
          </div>
        </div>

        {/* Center: 6 Requested Features Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* 1. Paradas de Taxi */}
          <button
            onClick={onToggleTaxiStandsOnMap}
            className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all border ${
              showTaxiStandsOnMap
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow'
                : 'bg-slate-900 text-amber-300 border-amber-400/40 hover:bg-slate-800'
            }`}
            title="Mostrar paradas oficiales de taxi en el mapa de Alicante"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>1. Paradas Taxi ({ALICANTE_TAXI_STANDS.length})</span>
          </button>

          {/* 2. Estimador Taxímetro */}
          <button
            onClick={onOpenTaxiFareModal}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 hover:border-emerald-400 font-bold flex items-center gap-1.5 transition-all shadow-sm"
            title="Calcular precio estimado oficial de taxímetro (Tarifas 1 y 2 de Alicante)"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>2. Taxímetro {fare ? `(~${fare.estimatedTotal}€)` : 'Oficial'}</span>
          </button>

          {/* 3. Carril Bus / Taxi Toggle */}
          <button
            onClick={onToggleBusTaxiLane}
            className={`px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all border ${
              busTaxiLaneActive
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Activar cálculo con prioridad en carriles Bus-Taxi de Alicante"
          >
            <Zap className={`w-3.5 h-3.5 ${busTaxiLaneActive ? 'text-slate-950 fill-slate-950' : 'text-slate-400'}`} />
            <span>3. Carril Bus-Taxi {busTaxiLaneActive ? 'ON' : 'OFF'}</span>
          </button>

          {/* 4. Monitor de Demanda (AVE / Aeropuerto) */}
          <button
            onClick={onOpenDemandRadarModal}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-300 border border-sky-500/40 hover:border-sky-400 font-bold flex items-center gap-1.5 transition-all shadow-sm"
            title="Ver afluencia de pasajeros en Estación AVE y Aeropuerto"
          >
            <Train className="w-3.5 h-3.5 text-sky-400" />
            <span>4. Demanda AVE / Vuelos</span>
          </button>

          {/* 5. Modo Salpicadero HUD */}
          <button
            onClick={onOpenTaxiDashboardModal}
            className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            title="Abrir vista de salpicadero de alto contraste para soporte móvil"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>5. Modo Salpicadero</span>
          </button>

          {/* 6. Cortes y Fiestas Locales */}
          <button
            onClick={onOpenLocalClosuresModal}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-rose-300 border border-rose-500/40 hover:border-rose-400 font-bold flex items-center gap-1.5 transition-all shadow-sm"
            title="Ver avisos de calles cortadas por fiestas (Hogueras, Santa Faz) u obras"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>6. Cortes y Fiestas</span>
          </button>
        </div>

        {/* Right: Exit Public Transport Mode */}
        <div className="flex items-center justify-end">
          <button
            onClick={onClosePublicTransportMode}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 text-[11px]"
            title="Salir del modo transporte público"
          >
            <span>Salir</span>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
