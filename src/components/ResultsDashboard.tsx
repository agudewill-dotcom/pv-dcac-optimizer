import React from 'react';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import type { ScenarioResult, RevenueMode } from '../types';

interface Props {
  scenarios: ScenarioResult[];
  selectedRatio: number;
  revenueMode: RevenueMode;
}

export const ResultsDashboard: React.FC<Props> = ({ scenarios, selectedRatio, revenueMode }) => {
  if (scenarios.length === 0) return null;

  const current = scenarios.find(s => s.dcAcRatio === selectedRatio) || scenarios[0];
  const techOptimal = scenarios.find(s => s.isOptimalTechnical);
  const econOptimal = scenarios.find(s => s.isOptimalEconomic);
  const balancedOptimal = scenarios.find(s => s.isOptimalMarginal);

  const fmt = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 0 });
  const fmtM = (n: number) => (n / 1_000_000).toFixed(2) + ' M€';
  const fmtPct = (n: number) => n.toFixed(2) + '%';

  const showMarket = revenueMode !== 'tariff';
  const showTariff = revenueMode !== 'market';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Recommendation panel showing all three optima */}
      <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="text-emerald-400 shrink-0" size={16} />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Recommended Scenarios</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
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

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="DC Capacity" value={`${current.dcMWp} MWp`} />
        <KPI label="AC Capacity" value={`${current.acMWac} MWac`} />
        <KPI label="DC/AC Ratio" value={`${current.dcAcRatio}×`}
          accent={current.isOptimalEconomic ? 'emerald' : undefined} />
        <KPI label="Clipping" value={fmtPct(current.clippingPercent)}
          accent={current.clippingPercent > 5 ? 'amber' : undefined} />

        <KPI label="Annual Gen. (Yr1)" value={`${fmt(current.annualGeneratedMWh)} MWh`} />
        <KPI label="Annual Injected" value={`${fmt(current.annualInjectedMWh)} MWh`} />
        <KPI label="FLH AC" value={`${fmt(current.fullLoadHoursAC)} h`} />
        <KPI label="Cap. Factor AC" value={fmtPct(current.capacityFactorAC * 100)} />

        <KPI label="Lifetime Generated" value={`${fmt(current.lifetimeGeneratedMWh)} MWh`} sub="span" />
        <KPI label="Lifetime Injected" value={`${fmt(current.lifetimeInjectedMWh)} MWh`} sub="span" />
        {showMarket && (
          <KPI label="Lifetime Revenue (Market)" value={fmtM(current.lifetimeRevenueMarket)} accent="emerald" />
        )}
        {showTariff && (
          <KPI label="Lifetime Revenue (Tariff)" value={fmtM(current.lifetimeRevenueTariff)} accent="blue" />
        )}
        {current.bessRecoveredMWh > 0 && (
          <KPI label="BESS Recovered" value={`${fmt(current.bessRecoveredMWh)} MWh`} accent="cyan" />
        )}
        {current.bessRevenueMarket > 0 && showMarket && (
          <KPI label="BESS Revenue (incl.)" value={fmtM(current.bessRevenueMarket)} accent="cyan" />
        )}
      </div>
    </div>
  );
};

const KPI: React.FC<{
  label: string; value: string; accent?: 'emerald' | 'blue' | 'amber' | 'cyan'; sub?: string;
}> = ({ label, value, accent }) => (
  <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3">
    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</div>
    <div className={`text-sm font-bold ${
      accent === 'emerald' ? 'text-emerald-400' :
      accent === 'blue' ? 'text-blue-400' :
      accent === 'amber' ? 'text-amber-400' :
      accent === 'cyan' ? 'text-cyan-400' : 'text-white'
    }`}>
      {value}
    </div>
  </div>
);
