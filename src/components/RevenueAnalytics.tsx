import React from 'react';
import { Download, Info, AlertTriangle, DollarSign, CheckCircle2 } from 'lucide-react';
import type { PriceConfig, ProjectConfig, CombinedScenarioResult, ProductionCase } from '../types';
import { getPriceStats } from '../engine/priceData';
import { MarginalRevenueChart, CumulativeCashflowChart } from './Charts';

interface Props {
  priceConfig: PriceConfig;
  projectConfig: ProjectConfig;
  scenarios: CombinedScenarioResult[];
  selectedRatio: number;
  productionCase: ProductionCase;
}

export const RevenueAnalytics: React.FC<Props> = ({ priceConfig, projectConfig, scenarios, selectedRatio, productionCase }) => {
  if (scenarios.length === 0) return null;

  const combinedSelected = scenarios.find(s => s.dcAcRatio === selectedRatio) || scenarios[0];
  const selected = productionCase === 'p90' ? combinedSelected.p90 : combinedSelected.p50;
  const stats = getPriceStats(priceConfig.priceProfile);
  
  const isSample = priceConfig.priceSource === 'smard_2024';

  const downloadTimestepCSV = () => {
    if (!selected.hourlyGenerated || !selected.hourlyInjected) return;
    
    let csv = 'Hour,Generated_MW,Injected_MW,Clipped_MW,Price_EUR_MWh,Revenue_EUR\n';
    for (let h = 0; h < 8760; h++) {
      const gen = selected.hourlyGenerated[h] || 0;
      const inj = selected.hourlyInjected[h] || 0;
      const clip = Math.max(0, gen - inj);
      const price = priceConfig.priceProfile[h] || 0;
      const rev = inj * price;
      csv += `${h + 1},${gen.toFixed(3)},${inj.toFixed(3)},${clip.toFixed(3)},${price.toFixed(2)},${rev.toFixed(2)}\n`;
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timestep_calculation_dcac_${selectedRatio}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in mt-8">
      <div className="flex items-center gap-3">
        <DollarSign className="text-emerald-400" size={28} />
        <h2 className="text-2xl font-black text-white tracking-tight">Economic Screening Layer</h2>
      </div>

      {/* ─── EXECUTIVE ROI DASHBOARD ─────────────────────────────────────────── */}
      {selected.totalCapex ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total System CAPEX</div>
              <div className="text-2xl font-black text-white">{(selected.totalCapex / 1e6).toFixed(2)} M€</div>
            </div>
            <div className="text-xs text-slate-400 mt-2 flex justify-between">
              <span>{(selected.totalCapex / (selected.dcMWp * 1e6)).toFixed(2)} €/Wp DC</span>
              <span>{(selected.totalCapex / (selected.acMWac * 1e6)).toFixed(2)} €/Wac AC</span>
            </div>
          </div>
          <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Simplified scenario NPV</div>
              <div className="text-2xl font-black text-emerald-400">{(selected.npv ? selected.npv / 1e6 : 0).toFixed(2)} M€</div>
            </div>
            <div className="text-xs text-emerald-500/70 mt-2 flex items-center gap-1">
              <CheckCircle2 size={12} /> Expected profitability over {projectConfig.lifetimeYears} yrs
            </div>
          </div>
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Simple Payback</div>
              <div className="text-2xl font-black text-blue-400">{selected.simplePaybackYears ? selected.simplePaybackYears.toFixed(1) : '> Lifetime'} <span className="text-lg">yrs</span></div>
            </div>
            <div className="text-xs text-blue-500/70 mt-2">
              ROI: {((selected.lifetimeRevenueMarket / (selected.totalCapex || 1) - 1) * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      ) : null}

      {/* ─── SANITY CHECKS BANNER ────────────────────────────────────────────── */}
      {isSample && priceConfig.revenueMode !== 'tariff' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-sm font-bold text-amber-400">Illustrative Price Data Used</h4>
            <p className="text-xs text-amber-300/80 mt-1">
              Sample price profile (SMARD 2024 DE-LU) is active. This is illustrative and not based on your specific project node. Upload a custom CSV for bankable results.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CumulativeCashflowChart scenario={combinedSelected} productionCase={productionCase} />

        {/* ─── DATA SOURCE & ASSUMPTIONS ───────────────────────────────────────── */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Info className="text-blue-400" size={18} />
            <h3 className="text-sm font-bold text-white">Data Source & Assumptions</h3>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Price Source</div>
              <div className="text-sm font-medium text-slate-300">{isSample ? 'SMARD 2024 DE-LU' : 'CSV Upload'}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Time Resolution</div>
              <div className="text-sm font-medium text-slate-300">Hourly (8760 timestamps)</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Average Market Price</div>
              <div className="text-sm font-medium text-slate-300">{stats.averagePrice.toFixed(2)} EUR/MWh</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Min / Max Price</div>
              <div className="text-sm font-medium text-slate-300">{stats.minPrice.toFixed(1)} / {stats.maxPrice.toFixed(1)} EUR/MWh</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Negative Price Hours</div>
              <div className="text-sm font-medium text-slate-300">{stats.negativeHours} h</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Missing Timestamps</div>
              <div className="text-sm font-medium text-slate-300">{stats.missingHours} h</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <MarginalRevenueChart scenarios={scenarios} productionCase={productionCase} />
        </div>
      </div>
      
      {/* ─── BOTTOM ACTIONS ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 pt-4 border-t border-white/10">
        <button
          onClick={downloadTimestepCSV}
          className="btn-premium py-2 px-4 flex items-center gap-2 text-sm"
        >
          <Download size={16} />
          Export 8760h Timestep Calculation (.csv)
        </button>
      </div>

    </div>
  );
};
