import React from 'react';
import { Briefcase, AlertCircle, Info, Cpu } from 'lucide-react';
import { CapexPanel } from './CapexPanel';
import { GridConfigPanel } from './GridConfigPanel';
import type { CapexConfig, GridConfig, CombinedScenarioResult, ProjectConfig } from '../types';

interface Props {
  capexConfig: CapexConfig;
  setCapex: (config: CapexConfig) => void;
  gridConfig: GridConfig;
  setGrid: (config: GridConfig) => void;
  scenario: CombinedScenarioResult | null;
  projectConfig: ProjectConfig;
}

export const EconomicsScreening: React.FC<Props> = ({ capexConfig, setCapex, gridConfig, setGrid, scenario, projectConfig }) => {
  const current = scenario?.p50;

  return (
    <div className="space-y-6 animate-fade-in mt-8">
      <div className="flex items-center gap-3 mb-2">
        <Briefcase className="text-emerald-400" size={28} />
        <h2 className="text-2xl font-black text-white tracking-tight">Economics / CAPEX Screening</h2>
      </div>
      
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-2 mb-6">
        <AlertCircle className="text-amber-400 shrink-0" size={16} />
        <span className="text-sm font-bold text-amber-400">Simplified economic screening – not a full financial model.</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <CapexPanel config={capexConfig} onChange={setCapex} />
          <GridConfigPanel config={gridConfig} onChange={setGrid} />
        </div>

        {current && current.totalCapex ? (
          <div className="space-y-4">
            <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-4">Screening Outputs (Selected Ratio: {scenario.dcAcRatio.toFixed(2)}×)</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total System CAPEX</div>
                  <div className="text-xl font-bold text-white">{(current.totalCapex / 1e6).toFixed(2)} M€</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Marginal Revenue (Market)</div>
                  <div className="text-xl font-bold text-blue-400">{(current.marginalRevenueMarket / 1e3).toFixed(1)} k€</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Marginal Rev per Add. MWp</div>
                  <div className="text-xl font-bold text-blue-400">{(current.marginalRevenuePerMWpMarket / 1e3).toFixed(1)} k€/MWp</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Marginal Injected Energy (Avg)</div>
                  <div className="text-xl font-bold text-emerald-400">{(current.marginalInjectedMWh / projectConfig.lifetimeYears).toFixed(1)} MWh</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Marginal Clipped Energy (Avg)</div>
                  <div className="text-xl font-bold text-amber-400">{(current.marginalClippedMWh / projectConfig.lifetimeYears).toFixed(1)} MWh</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Share of Add. Gen. Clipped</div>
                  <div className="text-xl font-bold text-amber-400">{(current.marginalClippingShare * 100).toFixed(1)}%</div>
                </div>
              </div>
            </div>

            <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-5">
              <h3 className="text-sm font-bold text-emerald-400 mb-4">Investment Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Simplified Scenario NPV</div>
                  <div className="text-xl font-bold text-emerald-400">{(current.npv ? current.npv / 1e6 : 0).toFixed(2)} M€</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Simple Payback</div>
                  <div className="text-xl font-bold text-emerald-400">{current.simplePaybackYears ? current.simplePaybackYears.toFixed(1) + ' yrs' : '> Lifetime'}</div>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2 text-xs text-slate-400">
                <Info size={14} className="shrink-0 mt-0.5" />
                <p>Avoid calling this a final project valuation. The outputs here screen the capital efficiency of overbuilding DC relative to a fixed AC limit.</p>
              </div>
            </div>

            {current.inverterResult && (
              <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Cpu className="text-indigo-400" size={18} />
                  <h3 className="text-sm font-bold text-indigo-400">Inverter CAPEX Impact</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Inverter CAPEX</div>
                    <div className="text-xl font-bold text-white">{(current.inverterResult.inverterCapex / 1000).toFixed(1)} k€</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Number of Units</div>
                    <div className="text-xl font-bold text-white">{current.inverterResult.numberOfUnits}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">CAPEX per MWp DC</div>
                    <div className="text-xl font-bold text-white">{((current.inverterResult.inverterCapex / 1000) / current.dcMWp).toFixed(1)} k€/MWp</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">CAPEX per MWac</div>
                    <div className="text-xl font-bold text-white">{((current.inverterResult.inverterCapex / 1000) / current.acMWac).toFixed(1)} k€/MWac</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5 col-span-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Additional CAPEX vs Baseline</div>
                    <div className={`text-xl font-bold ${current.inverterResult.additionalCapexVsBaseline > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {current.inverterResult.additionalCapexVsBaseline > 0 ? '+' : ''}
                      {(current.inverterResult.additionalCapexVsBaseline / 1000).toFixed(1)} k€
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-8 flex flex-col items-center justify-center text-center">
            <Briefcase className="text-slate-600 mb-3" size={32} />
            <h3 className="text-sm font-bold text-white mb-2">Economics Disabled</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Enable CAPEX modeling in the panel to view simplified NPV, marginal revenues, and screening outputs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
