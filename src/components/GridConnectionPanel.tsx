import React from 'react';
import { Cable, Building2, ArrowRight, AlertTriangle, CheckCircle, Scale, TrendingDown, TrendingUp } from 'lucide-react';
import { getSubstationRecommendation, calculateCableRoute, calculateSubstationEconomics } from '../engine/gridConnection';
import type { SubstationRecommendation, CableRouteResult, SubstationEconomics } from '../engine/gridConnection';
import type { ScenarioResult } from '../types';

interface Props {
  acCapacityMWac: number;
  dcCapacityMWp: number;
  scenario: ScenarioResult | null;  // selected scenario with clipping data
}

export const GridConnectionPanel: React.FC<Props> = ({ acCapacityMWac, dcCapacityMWp, scenario }) => {
  if (acCapacityMWac <= 0) return null;

  const sub = getSubstationRecommendation(acCapacityMWac);
  const cable = calculateCableRoute(acCapacityMWac);

  // Calculate MV vs HV economics if we have scenario data
  const economics = scenario ? calculateSubstationEconomics(
    dcCapacityMWp,
    acCapacityMWac,
    scenario.lifetimeClippedMWh,
    scenario.lifetimeRevenueMarket / 1e6,  // EUR → M€
    scenario.lifetimeInjectedMWh,
    scenario.clippingPercent,
  ) : null;

  return (
    <div className="glass-card animate-fade-in">
      <div className="flex items-center gap-2 p-4 border-b border-slate-700/30">
        <Cable className="text-blue-400" size={18} />
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Grid Connection Assessment</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        <SubstationCard sub={sub} />
        <CableRouteCard cable={cable} />
      </div>

      {/* MV vs HV Economics Comparison */}
      {economics && economics.recommendation !== 'same_level' && (
        <div className="px-4 pb-4">
          <EconomicsComparison econ={economics} />
        </div>
      )}
      {economics && economics.recommendation === 'same_level' && (
        <div className="px-4 pb-4">
          <div className="bg-slate-800/40 border border-white/5 rounded-xl p-3 text-center">
            <p className="text-[11px] text-slate-400">{economics.recommendationText}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Economics Comparison Card ────────────────────────────────────────────────
const EconomicsComparison: React.FC<{ econ: SubstationEconomics }> = ({ econ }) => {
  const recColors = {
    mv_preferred: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
    hv_preferred: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
    marginal: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
    same_level: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400' },
  };
  const colors = recColors[econ.recommendation];
  const fmt = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)} M€` : `${v} k€`;

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-xl overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-white/5">
        <Scale className={colors.text} size={16} />
        <span className="text-xs font-bold text-white uppercase tracking-wider">MV vs. HV Substation Economic Comparison</span>
        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text} ml-auto`}>
          {econ.recommendation === 'mv_preferred' ? 'MV PREFERRED' :
           econ.recommendation === 'hv_preferred' ? 'HV PREFERRED' : 'MARGINAL'}
        </span>
      </div>

      {/* Two-column comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-white/5">
        {/* Option A: HV (DC/AC = 1.0) */}
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-[10px] font-bold text-orange-300 uppercase">Option A: HV Connection</span>
            <span className="text-[9px] text-slate-500">(DC/AC = 1.0×)</span>
          </div>
          <div className="text-[10px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>AC Capacity (= DC)</span>
              <span className="font-bold text-white">{econ.hvAcCapacityMWac} MWac</span>
            </div>
            <div className="flex justify-between">
              <span>Connection Level</span>
              <span className="font-bold text-white">{econ.hvSubstation.voltageLabelKV}</span>
            </div>
            <div className="flex justify-between">
              <span>Substation Type</span>
              <span className="font-bold text-white">{econ.hvSubstation.label}</span>
            </div>
            <div className="flex justify-between border-t border-white/5 pt-1 mt-1">
              <span>Substation Cost</span>
              <span className="font-bold text-orange-400">{fmt(econ.hvCostKEur.substationKEur)}</span>
            </div>
            <div className="flex justify-between">
              <span>Permitting & Studies</span>
              <span className="font-bold text-orange-400">{fmt(econ.hvCostKEur.permittingKEur)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-white/5 pt-1">
              <span className="text-slate-300">Total Infrastructure</span>
              <span className="text-orange-300">{fmt(econ.hvCostKEur.totalKEur)}</span>
            </div>
            <div className="flex justify-between">
              <span>Clipping Loss</span>
              <span className="font-bold text-emerald-400">0%</span>
            </div>
            <div className="flex justify-between">
              <span>Lead Time</span>
              <span className="font-bold text-white">{econ.hvSubstation.typicalLeadTime}</span>
            </div>
          </div>
        </div>

        {/* Option B: MV (current config) */}
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-300 uppercase">Option B: MV Connection</span>
            <span className="text-[9px] text-slate-500">(DC/AC = {econ.dcAcRatio.toFixed(2)}×)</span>
          </div>
          <div className="text-[10px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>AC Capacity</span>
              <span className="font-bold text-white">{econ.mvAcCapacityMWac} MWac</span>
            </div>
            <div className="flex justify-between">
              <span>Connection Level</span>
              <span className="font-bold text-white">{econ.mvSubstation.voltageLabelKV}</span>
            </div>
            <div className="flex justify-between">
              <span>Substation Type</span>
              <span className="font-bold text-white">{econ.mvSubstation.label}</span>
            </div>
            <div className="flex justify-between border-t border-white/5 pt-1 mt-1">
              <span>Substation Cost</span>
              <span className="font-bold text-emerald-400">{fmt(econ.mvCostKEur.substationKEur)}</span>
            </div>
            <div className="flex justify-between">
              <span>Permitting & Studies</span>
              <span className="font-bold text-emerald-400">{fmt(econ.mvCostKEur.permittingKEur)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-white/5 pt-1">
              <span className="text-slate-300">Total Infrastructure</span>
              <span className="text-emerald-300">{fmt(econ.mvCostKEur.totalKEur)}</span>
            </div>
            <div className="flex justify-between">
              <span>Clipping Loss</span>
              <span className="font-bold text-amber-400">{econ.clippingPercent.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Lead Time</span>
              <span className="font-bold text-white">{econ.mvSubstation.typicalLeadTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom summary */}
      <div className="p-3 border-t border-white/5 bg-black/20 space-y-2">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-[9px] font-bold text-slate-500 uppercase">Infrastructure Saving</div>
            <div className="flex items-center justify-center gap-1">
              <TrendingDown className="text-emerald-400" size={12} />
              <span className="text-sm font-black text-emerald-400">{fmt(econ.infrastructureSavingKEur)}</span>
            </div>
            <div className="text-[8px] text-slate-500">by choosing MV</div>
          </div>
          <div>
            <div className="text-[9px] font-bold text-slate-500 uppercase">Clipping Revenue Loss</div>
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="text-amber-400" size={12} />
              <span className="text-sm font-black text-amber-400">{fmt(econ.lifetimeClippingRevenueLossKEur)}</span>
            </div>
            <div className="text-[8px] text-slate-500">{Math.round(econ.lifetimeClippedMWh).toLocaleString('de-DE')} MWh clipped</div>
          </div>
          <div>
            <div className="text-[9px] font-bold text-slate-500 uppercase">Net Advantage</div>
            <div className="flex items-center justify-center gap-1">
              {econ.netAdvantageKEur > 0
                ? <CheckCircle className="text-emerald-400" size={12} />
                : <AlertTriangle className="text-orange-400" size={12} />
              }
              <span className={`text-sm font-black ${econ.netAdvantageKEur > 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                {econ.netAdvantageKEur > 0 ? '+' : ''}{fmt(econ.netAdvantageKEur)}
              </span>
            </div>
            <div className="text-[8px] text-slate-500">{econ.netAdvantageKEur > 0 ? 'MV saves' : 'HV justified'}</div>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed text-center pt-1 border-t border-white/5">
          {econ.recommendationText}
        </p>
      </div>
    </div>
  );
};

// ─── Substation Card ─────────────────────────────────────────────────────────
const SubstationCard: React.FC<{ sub: SubstationRecommendation }> = ({ sub }) => {
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
const CableRouteCard: React.FC<{ cable: CableRouteResult }> = ({ cable }) => {
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
        <MiniKPI label="Parallel Circuits" value={cable.parallelCircuits > 1 ? `${cable.parallelCircuits}×` : '1 (single)'} accent={cable.parallelCircuits > 1 ? 'amber' : undefined} />
        <MiniKPI label="V-Drop @ 2 km" value={`${cable.voltageDrop2km}%`} accent={cable.voltageDrop2km > 1.5 ? 'amber' : undefined} />
        <MiniKPI label="P-Loss @ 2 km" value={`${cable.powerLoss2km}%`} accent={cable.powerLoss2km > 1.5 ? 'amber' : undefined} />
      </div>
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
      <div className="absolute inset-0 bg-slate-800/60 rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500/30 to-emerald-500/10 rounded-l-full" style={{ width: `${Math.min(100, (maxKm / barMax) * 100)}%` }} />
        <div className="absolute inset-y-0 right-0 bg-gradient-to-l from-red-500/20 to-transparent rounded-r-full" style={{ width: `${Math.max(0, 100 - (maxKm / barMax) * 100)}%` }} />
      </div>
      <div className="absolute top-0 bottom-0 flex flex-col items-center" style={{ left: `${Math.min(95, (maxKm / barMax) * 100)}%` }}>
        <div className="w-0.5 h-full bg-emerald-400" />
      </div>
      {markers.map(km => (
        <div key={km} className="absolute bottom-0 text-[8px] text-slate-500 font-mono -translate-x-1/2" style={{ left: `${(km / barMax) * 100}%` }}>{km}</div>
      ))}
    </div>
  );
};

// ─── Mini KPI ────────────────────────────────────────────────────────────────
const MiniKPI: React.FC<{ label: string; value: string; accent?: 'emerald' | 'amber' | 'red' }> = ({ label, value, accent }) => (
  <div>
    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{label}</div>
    <div className={`text-[11px] font-bold ${
      accent === 'emerald' ? 'text-emerald-400' :
      accent === 'amber' ? 'text-amber-400' :
      accent === 'red' ? 'text-red-400' : 'text-white'
    }`}>{value}</div>
  </div>
);
