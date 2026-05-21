import React, { useState, useMemo } from 'react';
import { Table, ArrowUpDown } from 'lucide-react';
import type { CombinedScenarioResult, RevenueMode, ProductionCase } from '../types';

interface Props {
  scenarios: CombinedScenarioResult[];
  selectedRatio: number;
  onSelectRatio: (ratio: number) => void;
  revenueMode: RevenueMode;
  productionCase: ProductionCase;
}

type SortField = 'dcAcRatio' | 'lifetimeRevenueMarket' | 'clippingPercent' | 'marginalRevenueMarket' | 'npv' | 'balancedScore';

export const OptimizationTable: React.FC<Props> = ({
  scenarios,
  selectedRatio,
  onSelectRatio,
  revenueMode,
  productionCase,
}) => {
  const [sortField, setSortField] = useState<SortField>('dcAcRatio');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // Default to desc for most financial metrics
    }
  };

  const sortedScenarios = useMemo(() => {
    return [...scenarios].sort((a, b) => {
      const pA = productionCase === 'p90' ? a.p90 : a.p50;
      const pB = productionCase === 'p90' ? b.p90 : b.p50;

      let valA = 0;
      let valB = 0;

      switch (sortField) {
        case 'dcAcRatio':
          valA = a.dcAcRatio;
          valB = b.dcAcRatio;
          break;
        case 'lifetimeRevenueMarket':
          valA = revenueMode === 'tariff' ? pA.lifetimeRevenueTariff : pA.lifetimeRevenueMarket;
          valB = revenueMode === 'tariff' ? pB.lifetimeRevenueTariff : pB.lifetimeRevenueMarket;
          break;
        case 'clippingPercent':
          valA = pA.clippingPercent;
          valB = pB.clippingPercent;
          break;
        case 'marginalRevenueMarket':
          valA = revenueMode === 'tariff' ? pA.marginalRevenueTariff : pA.marginalRevenueMarket;
          valB = revenueMode === 'tariff' ? pB.marginalRevenueTariff : pB.marginalRevenueMarket;
          break;
        case 'npv':
          valA = pA.npv || 0;
          valB = pB.npv || 0;
          break;
        case 'balancedScore':
          valA = pA.isOptimalMarginal ? 1 : 0;
          valB = pB.isOptimalMarginal ? 1 : 0;
          break;
      }

      return sortAsc ? valA - valB : valB - valA;
    });
  }, [scenarios, sortField, sortAsc, revenueMode, productionCase]);

  const fmt = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 0 });
  const fmtM = (n: number) => (n / 1_000_000).toFixed(2);
  const fmtK = (n: number) => (n / 1_000).toFixed(1);

  if (scenarios.length === 0) return null;

  const baseP50 = scenarios[0].p50;
  const lifetimeYears = baseP50.lifetimeGeneratedMWh / baseP50.annualGeneratedMWh || 30; // Approx back-calculation

  return (
    <div className="bg-slate-900/40 rounded-xl border border-slate-700/50 overflow-hidden animate-fade-in shadow-xl">
      <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Table className="text-slate-400" size={20} />
          <h3 className="font-bold text-white tracking-wide">Detailed Scenario Comparison</h3>
        </div>
        <div className="text-xs text-slate-400">Click headers to sort</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-[10px] uppercase bg-slate-900/80 text-slate-400 sticky top-0">
            <tr>
              <th className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('dcAcRatio')}>
                <div className="flex items-center gap-1">Ratio {sortField === 'dcAcRatio' && <ArrowUpDown size={10}/>}</div>
              </th>
              <th className="px-4 py-3 text-right">DC (MWp)</th>
              <th className="px-4 py-3 text-right">AC (MWac)</th>
              <th className="px-4 py-3 text-right">Gen MWh (Avg)</th>
              <th className="px-4 py-3 text-right">Inj MWh (Avg)</th>
              <th className="px-4 py-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('clippingPercent')}>
                <div className="flex items-center justify-end gap-1">Clip % {sortField === 'clippingPercent' && <ArrowUpDown size={10}/>}</div>
              </th>
              <th className="px-4 py-3 text-right">AC FLH</th>
              <th className="px-4 py-3 text-right">Cap Price</th>
              <th className="px-4 py-3 text-right">Yr 1 Rev (k€)</th>
              <th className="px-4 py-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('lifetimeRevenueMarket')}>
                <div className="flex items-center justify-end gap-1">Life Rev (M€) {sortField === 'lifetimeRevenueMarket' && <ArrowUpDown size={10}/>}</div>
              </th>
              <th className="px-4 py-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('marginalRevenueMarket')}>
                <div className="flex items-center justify-end gap-1">Marg Rev (k€) {sortField === 'marginalRevenueMarket' && <ArrowUpDown size={10}/>}</div>
              </th>
              <th className="px-4 py-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('npv')}>
                <div className="flex items-center justify-end gap-1">Δ NPV (k€) {sortField === 'npv' && <ArrowUpDown size={10}/>}</div>
              </th>
              <th className="px-4 py-3 text-center">Badges</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sortedScenarios.map((s) => {
              const current = productionCase === 'p90' ? s.p90 : s.p50;
              const isSelected = s.dcAcRatio === selectedRatio;
              
              const baseScenario = scenarios[0];
              const baseCurrent = productionCase === 'p90' ? baseScenario.p90 : baseScenario.p50;
              const deltaNpv = (current.npv || 0) - (baseCurrent.npv || 0);

              const revMarket = revenueMode === 'tariff' ? current.lifetimeRevenueTariff : current.lifetimeRevenueMarket;
              const yr1Rev = revenueMode === 'tariff' ? current.year1RevenueTariff : current.year1RevenueMarket;
              const margRev = revenueMode === 'tariff' ? current.marginalRevenueTariff : current.marginalRevenueMarket;

              return (
                <tr
                  key={s.dcAcRatio}
                  onClick={() => onSelectRatio(s.dcAcRatio)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-emerald-500/10 hover:bg-emerald-500/20' : 'hover:bg-slate-800/50'
                  }`}
                >
                  <td className="px-4 py-3 font-mono font-bold">
                    <span className={isSelected ? 'text-emerald-400' : 'text-white'}>
                      {s.dcAcRatio.toFixed(2)}×
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{s.dcMWp.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-400">{s.acMWac.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{fmt(current.lifetimeGeneratedMWh / lifetimeYears)}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400">{fmt(current.lifetimeInjectedMWh / lifetimeYears)}</td>
                  <td className={`px-4 py-3 text-right font-mono font-bold ${
                    current.clippingPercent > 5 ? 'text-amber-400' : 'text-slate-300'
                  }`}>
                    {current.clippingPercent.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{fmt(current.fullLoadHoursAC)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-400">{current.capturePriceMarket.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">{fmtK(yr1Rev)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">{fmtM(revMarket)}</td>
                  <td className={`px-4 py-3 text-right font-mono ${margRev < 50000 ? 'text-amber-400' : 'text-blue-400'}`}>
                    {s.dcAcRatio > scenarios[0].dcAcRatio ? fmtK(margRev) : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-bold ${deltaNpv < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {s.dcAcRatio === scenarios[0].dcAcRatio ? 'Base' : (deltaNpv > 0 ? '+' : '') + fmtK(deltaNpv)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {s.isRobustOptimum && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Robust</span>}
                      {current.isOptimalEconomic && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Econ</span>}
                      {current.isOptimalTechnical && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">Tech</span>}
                      {current.isOptimalMarginal && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">Bal</span>}
                      {current.clippingWarning && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">High Clip</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
