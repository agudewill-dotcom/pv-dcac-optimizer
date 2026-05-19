import React from 'react';
import { Cable, Building2, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { getSubstationRecommendation, calculateCableRoute } from '../engine/gridConnection';
import type { SubstationRecommendation, CableRouteResult } from '../engine/gridConnection';

interface Props {
  acCapacityMWac: number;
}

export const GridConnectionPanel: React.FC<Props> = ({ acCapacityMWac }) => {
  if (acCapacityMWac <= 0) return null;

  const sub = getSubstationRecommendation(acCapacityMWac);
  const cable = calculateCableRoute(acCapacityMWac);

  return (
    <div className="glass-card animate-fade-in">
      <div className="flex items-center gap-2 p-4 border-b border-slate-700/30">
        <Cable className="text-blue-400" size={18} />
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Grid Connection Assessment</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {/* Substation Recommendation */}
        <SubstationCard sub={sub} acMWac={acCapacityMWac} />

        {/* Cable Route */}
        <CableRouteCard cable={cable} acMWac={acCapacityMWac} />
      </div>
    </div>
  );
};

// ─── Substation Card ─────────────────────────────────────────────────────────
const SubstationCard: React.FC<{ sub: SubstationRecommendation; acMWac: number }> = ({ sub }) => {
  const typeColors: Record<string, { bg: string; border: string; icon: string }> = {
    none: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: 'text-emerald-400' },
    compact_station: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'text-blue-400' },
    project_substation: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: 'text-amber-400' },
    hv_substation: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: 'text-orange-400' },
    multi_substation: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: 'text-red-400' },
  };

  const colors = typeColors[sub.type] || typeColors.compact_station;

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-xl p-4 space-y-3`}>
      <div className="flex items-start gap-3">
        <Building2 className={`${colors.icon} shrink-0 mt-0.5`} size={20} />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-bold text-white">{sub.label}</h4>
            {sub.required ? (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">REQUIRED</span>
            ) : (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">NOT NEEDED</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">{sub.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
        <MiniKPI label="Voltage Level" value={sub.voltageLabelKV} />
        <MiniKPI label="Est. Cost" value={sub.estimatedCostRange} />
        <MiniKPI label="Lead Time" value={sub.typicalLeadTime} />
      </div>
    </div>
  );
};

// ─── Cable Route Card ────────────────────────────────────────────────────────
const CableRouteCard: React.FC<{ cable: CableRouteResult; acMWac: number }> = ({ cable }) => {
  const isLong = cable.effectiveMaxKm >= 10;
  const isShort = cable.effectiveMaxKm < 3;

  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <ArrowRight className="text-purple-400 shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="text-sm font-bold text-white mb-1">Maximum Cable Route</h4>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-black font-mono ${
              isShort ? 'text-amber-400' : isLong ? 'text-emerald-400' : 'text-white'
            }`}>
              {cable.effectiveMaxKm.toFixed(1)} km
            </span>
            {isShort && <AlertTriangle className="text-amber-400" size={16} />}
            {isLong && <CheckCircle className="text-emerald-400" size={16} />}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {cable.maxLengthKm < cable.maxLengthLossKm
              ? 'Limited by voltage drop (2% max)'
              : 'Limited by power losses (2% max)'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
        <MiniKPI label="Cable Type" value={cable.cableType} />
        <MiniKPI label="Cross Section" value={`${cable.crossSectionMM2} mm²`} />
        <MiniKPI label="Operating Current" value={`${cable.currentA} A`} />
        <MiniKPI
          label="Parallel Circuits"
          value={cable.parallelCircuits > 1 ? `${cable.parallelCircuits}×` : '1 (single)'}
          accent={cable.parallelCircuits > 1 ? 'amber' : undefined}
        />
        <MiniKPI label="V-Drop @ 2 km" value={`${cable.voltageDrop2km}%`} accent={cable.voltageDrop2km > 1.5 ? 'amber' : undefined} />
        <MiniKPI label="P-Loss @ 2 km" value={`${cable.powerLoss2km}%`} accent={cable.powerLoss2km > 1.5 ? 'amber' : undefined} />
      </div>

      {/* Route distance guide */}
      <div className="pt-2 border-t border-white/5">
        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">Route Distance Guide</div>
        <RouteBar maxKm={cable.effectiveMaxKm} />
      </div>
    </div>
  );
};

// ─── Route distance visualization ────────────────────────────────────────────
const RouteBar: React.FC<{ maxKm: number }> = ({ maxKm }) => {
  const markers = [1, 2, 5, 10, 15, 20].filter(v => v <= maxKm * 1.5);
  const barMax = Math.max(maxKm * 1.3, markers[markers.length - 1] || 5);

  return (
    <div className="relative h-6">
      {/* Background bar */}
      <div className="absolute inset-0 bg-slate-800/60 rounded-full overflow-hidden">
        {/* Green zone */}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500/30 to-emerald-500/10 rounded-l-full"
          style={{ width: `${Math.min(100, (maxKm / barMax) * 100)}%` }}
        />
        {/* Red zone */}
        <div
          className="absolute inset-y-0 right-0 bg-gradient-to-l from-red-500/20 to-transparent rounded-r-full"
          style={{ width: `${Math.max(0, 100 - (maxKm / barMax) * 100)}%` }}
        />
      </div>

      {/* Max marker */}
      <div
        className="absolute top-0 bottom-0 flex flex-col items-center"
        style={{ left: `${Math.min(95, (maxKm / barMax) * 100)}%` }}
      >
        <div className="w-0.5 h-full bg-emerald-400" />
      </div>

      {/* Distance markers */}
      {markers.map(km => (
        <div
          key={km}
          className="absolute bottom-0 text-[8px] text-slate-500 font-mono -translate-x-1/2"
          style={{ left: `${(km / barMax) * 100}%` }}
        >
          {km}
        </div>
      ))}
    </div>
  );
};

// ─── Mini KPI ────────────────────────────────────────────────────────────────
const MiniKPI: React.FC<{
  label: string;
  value: string;
  accent?: 'emerald' | 'amber' | 'red';
}> = ({ label, value, accent }) => (
  <div>
    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{label}</div>
    <div className={`text-[11px] font-bold ${
      accent === 'emerald' ? 'text-emerald-400' :
      accent === 'amber' ? 'text-amber-400' :
      accent === 'red' ? 'text-red-400' : 'text-white'
    }`}>
      {value}
    </div>
  </div>
);
