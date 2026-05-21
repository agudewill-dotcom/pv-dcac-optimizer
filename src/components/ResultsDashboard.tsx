import React from 'react';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import type { CombinedScenarioResult, RevenueMode, ProductionCase } from '../types';

interface Props {
  scenarios: CombinedScenarioResult[];
  selectedRatio: number;
  revenueMode: RevenueMode;
  productionCase: ProductionCase;
}

export const ResultsDashboard: React.FC<Props> = ({ scenarios, selectedRatio, revenueMode, productionCase }) => {
  const combined = scenarios.find(s => s.dcAcRatio === selectedRatio) || scenarios[0];
  if (!combined) return null;
  const current = productionCase === 'p90' ? combined.p90 : combined.p50;

  const techOptimal = scenarios.find(s => s.p50.isOptimalTechnical)?.p50;
  const econOptimal = scenarios.find(s => s.p50.isOptimalEconomic)?.p50;
  const balancedOptimal = scenarios.find(s => s.p50.isOptimalMarginal)?.p50;
  const robustOptimal = scenarios.find(s => s.isRobustOptimum);

  const fmt = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 0 });
  const fmtM = (n: number) => (n / 1_000_000).toFixed(2) + ' M€';
  const fmtPct = (n: number) => n.toFixed(2) + '%';

  const showMarket = revenueMode !== 'tariff';
  const showTariff = revenueMode !== 'market';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Recommendation panel showing all optima */}
      <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-emerald-400 shrink-0" size={16} />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Recommended DC/AC bucket</span>
          </div>
          <span className="text-[10px] text-slate-500 italic">
            The economic layer is intended for directional comparison between DC/AC buckets. It is not a complete project valuation.
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {techOptimal && (
            <div className={`p-3 rounded-xl border transition-all ${current.dcAcRatio === techOptimal.dcAcRatio ? 'bg-blue-500/15 border-blue-500/40' : 'bg-slate-900/40 border-white/5'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300">Tech</span>
                <span className="text-[10px] font-bold text-blue-300">{techOptimal.dcAcRatio.toFixed(2)}×</span>
              </div>
              <div className="text-[9px] text-slate-500 leading-tight">
                Lowest clipping ({fmtPct(techOptimal.clippingPercent)}). Full AC utilization: {fmt(techOptimal.fullLoadHoursAC)} FLH.
              </div>
            </div>
          )}
          {econOptimal && (
            <div className={`p-3 rounded-xl border transition-all ${current.dcAcRatio === econOptimal.dcAcRatio ? 'bg-emerald-500/15 border-emerald-500/40' : 'bg-slate-900/40 border-white/5'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">Econ</span>
                <span className="text-[10px] font-bold text-emerald-300">{econOptimal.dcAcRatio.toFixed(2)}×</span>
              </div>
              <div className="text-[9px] text-slate-500 leading-tight">
                Highest lifetime revenue ({fmtM(showMarket ? econOptimal.lifetimeRevenueMarket : econOptimal.lifetimeRevenueTariff)}). Cap. factor: {fmtPct(econOptimal.capacityFactorAC * 100)}.
              </div>
            </div>
          )}
          {balancedOptimal && (
            <div className={`p-3 rounded-xl border transition-all ${current.dcAcRatio === balancedOptimal.dcAcRatio ? 'bg-purple-500/15 border-purple-500/40' : 'bg-slate-900/40 border-white/5'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300">Balanced</span>
                <span className="text-[10px] font-bold text-purple-300">{balancedOptimal.dcAcRatio.toFixed(2)}×</span>
              </div>
              <div className="text-[9px] text-slate-500 leading-tight">
                Best incremental return per MWp DC. Clipping: {fmtPct(balancedOptimal.clippingPercent)}, injected: {fmt(balancedOptimal.annualInjectedMWh)} MWh/a.
              </div>
            </div>
          )}
          {robustOptimal && (
            <div className={`p-3 rounded-xl border transition-all ${combined.dcAcRatio === robustOptimal.dcAcRatio ? 'bg-indigo-500/15 border-indigo-500/40' : 'bg-slate-900/40 border-white/5'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">Robust</span>
                <span className="text-[10px] font-bold text-indigo-300">{robustOptimal.dcAcRatio.toFixed(2)}×</span>
              </div>
              <div className="text-[9px] text-slate-500 leading-tight">
                Highest expected NPV while avoiding underperformance in conservative P90 scenarios.
              </div>
            </div>
          )}
        </div>
      </div>

      {current.clippingWarning && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
          <AlertTriangle className="text-amber-400 shrink-0" size={16} />
          <span className="text-sm text-amber-300">
            Warning: Over 50% of incremental DC generation at this ratio is clipped.
          </span>
        </div>
      )}

      {/* Grouped KPI Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* System Capacity */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
            <div className="text-slate-300 font-bold text-xs tracking-wider uppercase">System Sizing</div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <KPI label="DC Capacity" value={`${current.dcMWp} MWp`} />
            <KPI label="AC Capacity" value={`${current.acMWac} MWac`} />
            <KPI label="DC/AC Ratio" value={`${current.dcAcRatio}×`} />
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
            <div className="text-slate-300 font-bold text-xs tracking-wider uppercase">Efficiency</div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <KPI label="FLH AC" value={`${fmt(current.fullLoadHoursAC)} h`} />
            <KPI label="Cap. Factor AC" value={fmtPct(current.capacityFactorAC * 100)} />
            <KPI label="Clipping" value={fmtPct(current.clippingPercent)} accent={current.clippingPercent > 5 ? 'amber' : undefined} />
          </div>
        </div>

        {/* Annual Yield */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
            <div className="text-slate-300 font-bold text-xs tracking-wider uppercase">Annual Yield (Yr 1)</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <KPI label="Total Generated" value={`${fmt(current.annualGeneratedMWh)} MWh`} />
            <KPI label="Grid Injected" value={`${fmt(current.annualInjectedMWh)} MWh`} />
          </div>
        </div>

        {/* Lifetime Economics */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
            <div className="text-slate-300 font-bold text-xs tracking-wider uppercase">Lifetime Return</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {showMarket && <KPI label="Market Revenue" value={fmtM(current.lifetimeRevenueMarket)} />}
            {showTariff && <KPI label="Tariff Revenue" value={fmtM(current.lifetimeRevenueTariff)} />}
            <KPI label="Total Energy" value={`${fmt(current.lifetimeInjectedMWh)} MWh`} />
          </div>
        </div>

        {/* Storage Impact (only if active) */}
        {current.bessRecoveredMWh > 0 && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 md:col-span-2 shadow-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
              <div className="text-slate-300 font-bold text-xs tracking-wider uppercase">Storage Impact (BESS)</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI label="Recovered Energy" value={`${fmt(current.bessRecoveredMWh)} MWh`} />
              {showMarket && <KPI label="Additional Revenue" value={fmtM(current.bessRevenueMarket)} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const KPI: React.FC<{
  label: string; value: string; accent?: 'emerald' | 'blue' | 'amber' | 'cyan'; sub?: string;
}> = ({ label, value, accent }) => (
  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3">
    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</div>
    <div className={`text-sm font-bold ${
      accent === 'amber' ? 'text-amber-400' : 'text-slate-100'
    }`}>
      {value}
    </div>
  </div>
);
