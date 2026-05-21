import React from 'react';
import { Sun, HelpCircle } from 'lucide-react';
import type { CombinedScenarioResult, ProductionCase, Orientation, ProjectConfig } from '../types';
import { ProfileChart, GenerationChart, ClippingChart } from './Charts';

interface Props {
  scenarios: CombinedScenarioResult[];
  selectedRatio: number;
  productionCase: ProductionCase;
  orientation: Orientation;
  projectConfig: ProjectConfig;
}

export const ProductionClipping: React.FC<Props> = ({ scenarios, selectedRatio, productionCase, orientation, projectConfig }) => {
  if (scenarios.length === 0) return null;

  const combined = scenarios.find(s => s.dcAcRatio === selectedRatio) || scenarios[0];
  const current = productionCase === 'p90' ? combined.p90 : combined.p50;

  const fmt = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 0 });
  const fmtPct = (n: number) => n.toFixed(2) + '%';

  return (
    <div className="space-y-6 animate-fade-in mt-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Sun className="text-amber-400" size={28} />
          <h2 className="text-2xl font-black text-white tracking-tight">Production & Clipping</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Avg. Annual Generated</div>
          <div className="text-2xl font-black text-white">{fmt(current.lifetimeGeneratedMWh / projectConfig.lifetimeYears)} MWh</div>
          <div className="text-[10px] text-slate-500 mt-1">Yr 1: {fmt(current.annualGeneratedMWh)} MWh</div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Avg. Annual Injected</div>
          <div className="text-2xl font-black text-emerald-400">{fmt(current.lifetimeInjectedMWh / projectConfig.lifetimeYears)} MWh</div>
          <div className="text-[10px] text-slate-500 mt-1">Yr 1: {fmt(current.annualInjectedMWh)} MWh</div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Avg. Clipped Energy</div>
          <div className="text-2xl font-black text-amber-400">{fmt(current.lifetimeClippedMWh / projectConfig.lifetimeYears)} MWh</div>
          <div className="text-[10px] text-slate-500 mt-1">{fmtPct(current.clippingPercent)} of generated</div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">P50 / P90 Gen. Spread</div>
          <div className="text-2xl font-black text-blue-400">
            {fmt(combined.p50.annualGeneratedMWh - combined.p90.annualGeneratedMWh)} MWh
          </div>
          <div className="text-xs text-slate-500 mt-1">Difference in expected yield</div>
        </div>
      </div>

      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex gap-3 items-start">
        <HelpCircle className="text-blue-400 shrink-0 mt-0.5" size={18} />
        <div>
          <h4 className="text-sm font-bold text-blue-300 mb-1">Technical Formulas</h4>
          <p className="text-xs text-slate-300 font-mono">
            Injected power = min(generated power, AC capacity)<br/>
            Clipped power = max(generated power - AC capacity, 0)
          </p>
          <p className="text-xs text-slate-400 mt-2">
            These calculations are purely technical and evaluate how much physical energy can pass through the inverter based on the chosen DC/AC ratio. CAPEX or NPV are not included here.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProfileChart orientation={orientation} />
        <GenerationChart scenario={combined} productionCase={productionCase} />
        <div className="md:col-span-2">
          <ClippingChart scenarios={scenarios} productionCase={productionCase} />
        </div>
      </div>
    </div>
  );
};
