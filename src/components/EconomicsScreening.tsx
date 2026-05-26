import React from 'react';
import { Briefcase, AlertCircle, Cpu } from 'lucide-react';
import { CapexPanel } from './CapexPanel';
import { GridConfigPanel } from './GridConfigPanel';
import type { CapexConfig, GridConfig, CombinedScenarioResult, ProjectConfig } from '../types';

interface Props {
  capexConfig: CapexConfig;
  setCapex: (config: CapexConfig) => void;
  gridConfig: GridConfig;
  setGrid: (config: GridConfig) => void;
  scenario: CombinedScenarioResult | null;
  scenarios?: CombinedScenarioResult[];
  selectedRatio?: number;
  projectConfig: ProjectConfig;
}

export const EconomicsScreening: React.FC<Props> = ({ capexConfig, setCapex, gridConfig, setGrid, scenario, scenarios, selectedRatio, projectConfig }) => {
  const current = scenario?.p50;
  
  const currentIndex = scenarios?.findIndex(s => s.dcAcRatio === selectedRatio) ?? -1;
  const prevScenario = currentIndex > 0 && scenarios ? scenarios[currentIndex - 1].p50 : null;
  const ratioText = prevScenario ? `${prevScenario.dcAcRatio.toFixed(2)}× → ${current?.dcAcRatio.toFixed(2)}×` : 'Base Case';
  const addedDC = prevScenario && current ? current.dcMWp - prevScenario.dcMWp : 0;
  const addedAC = prevScenario && current ? current.acMWac - prevScenario.acMWac : 0;

  return (
    <div className="space-y-6 animate-fade-in mt-8">
      <div className="flex items-center gap-3 mb-2">
        <Briefcase className="text-emerald-400" size={28} />
        <h2 className="text-2xl font-black text-white tracking-tight">Economics / CAPEX Screening</h2>
      </div>
      
      <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-4 text-sm text-slate-300 mb-6">
        <p>This section evaluates whether additional DC overbuild creates enough monetized value to justify additional CAPEX. It considers injected energy after clipping, capture price, marginal revenue, inverter component count and simplified CAPEX. It is not a full financial model.</p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-2 mb-6">
        <AlertCircle className="text-amber-400 shrink-0" size={16} />
        <span className="text-sm font-bold text-amber-400">Directional scenario comparison – not a bankable financial model.</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <CapexPanel config={capexConfig} onChange={setCapex} />
          <GridConfigPanel config={gridConfig} onChange={setGrid} />
        </div>

        {current && current.totalCapex ? (
          <div className="space-y-4">
            <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-4">CAPEX Breakdown (Selected Ratio: {scenario.dcAcRatio.toFixed(2)}×)</h3>
              
              {current.capexBreakdown ? (
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                    <span>DC CAPEX ({current.dcMWp.toFixed(1)} MWp × {(capexConfig.capexPerMWpDC / 1000).toFixed(0)} k€/MWp)</span>
                    <span className="font-medium text-white">{(current.capexBreakdown.dcCapex / 1e6).toFixed(2)} M€</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                    <span>AC CAPEX ({current.acMWac.toFixed(1)} MWac × {(capexConfig.capexPerMWacAC / 1000).toFixed(0)} k€/MWac)</span>
                    <span className="font-medium text-white">{(current.capexBreakdown.acCapex / 1e6).toFixed(2)} M€</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                    <span>Inverter CAPEX</span>
                    <span className="font-medium text-white">{(current.capexBreakdown.inverterCapex / 1e6).toFixed(2)} M€</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                    <span>HV Substation CAPEX</span>
                    <span className="font-medium text-white">{(current.capexBreakdown.gridHvCapex / 1e6).toFixed(2)} M€</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                    <span>MV Transfer Station CAPEX</span>
                    <span className="font-medium text-white">{(current.capexBreakdown.gridMvCapex / 1e6).toFixed(2)} M€</span>
                  </div>
                  {current.capexBreakdown.bessStorageCapex > 0 || current.capexBreakdown.bessPowerCapex > 0 ? (
                    <>
                      <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                        <span>BESS Power CAPEX</span>
                        <span className="font-medium text-white">{(current.capexBreakdown.bessPowerCapex / 1e6).toFixed(2)} M€</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                        <span>BESS Storage CAPEX</span>
                        <span className="font-medium text-white">{(current.capexBreakdown.bessStorageCapex / 1e6).toFixed(2)} M€</span>
                      </div>
                    </>
                  ) : null}
                  <div className="flex justify-between text-sm font-bold text-emerald-400 pt-2 border-t border-emerald-500/30">
                    <span>Total System CAPEX</span>
                    <span>{(current.totalCapex / 1e6).toFixed(2)} M€</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total System CAPEX</div>
                    <div className="text-xl font-bold text-white">{(current.totalCapex / 1e6).toFixed(2)} M€</div>
                  </div>
                </div>
              )}

              <h3 className="text-sm font-bold text-white mb-4 mt-6 border-t border-white/10 pt-4">
                Marginal Values <span className="text-emerald-400 font-normal">({ratioText})</span>
              </h3>
              <div className="text-xs text-slate-400 mb-3">
                Added: {addedDC > 0 ? `+${addedDC.toFixed(2)} MWp DC` : '0 MWp'} {addedAC > 0 ? `/ +${addedAC.toFixed(2)} MWac AC` : ''}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Marginal Lifetime Market Revenue</div>
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
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Share of Add. Gen. Clipped</div>
                  <div className="text-xl font-bold text-amber-400">{(current.marginalClippingShare * 100).toFixed(1)}%</div>
                </div>
              </div>
            </div>

            <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-5">
              <h3 className="text-sm font-bold text-emerald-400 mb-4">Investment Metrics (NPV Bridge)</h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                  <span>Initial CAPEX (Year 0)</span>
                  <span className="font-medium text-red-400">-{(current.totalCapex / 1e6).toFixed(2)} M€</span>
                </div>
                <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                  <span>Year 1 Market Revenue</span>
                  <span className="font-medium text-white">{(current.year1RevenueMarket / 1e6).toFixed(2)} M€</span>
                </div>
                <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                  <span>Lifetime Market Revenue (Undiscounted)</span>
                  <span className="font-medium text-white">{(current.lifetimeRevenueMarket / 1e6).toFixed(2)} M€</span>
                </div>
                <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                  <span>Lifetime OPEX (Undiscounted)</span>
                  <span className="font-medium text-red-400">-{( (current.annualOpex || 0) * projectConfig.lifetimeYears / 1e6 ).toFixed(2)} M€</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-emerald-400 pt-2 border-t border-emerald-500/30">
                  <span>Simplified Scenario NPV (Discounted at {(capexConfig.discountRate * 100).toFixed(1)}%)</span>
                  <span className={current.npv && current.npv < 0 ? "text-amber-400" : "text-emerald-400"}>{(current.npv ? current.npv / 1e6 : 0).toFixed(2)} M€</span>
                </div>
                {current.npv && current.npv < 0 && (
                  <div className="text-xs text-amber-400 mt-2 italic">
                    NPV is negative. Main driver: {current.totalCapex > current.lifetimeRevenueMarket * 0.8 ? 'High initial CAPEX relative to captured revenue.' : 'Insufficient discounted revenue to cover OPEX and capital costs.'}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Simple Payback</div>
                  <div className="text-xl font-bold text-emerald-400">{current.simplePaybackYears ? current.simplePaybackYears.toFixed(1) + ' yrs' : '> Lifetime'}</div>
                </div>
              </div>
            </div>

            {current.inverterResult && (
              <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Cpu className="text-indigo-400" size={18} />
                  <h3 className="text-sm font-bold text-indigo-400">Inverter CAPEX Impact</h3>
                </div>
                
                <div className="space-y-2 mb-4 text-xs text-indigo-200/80">
                  <div className="flex justify-between py-1 border-b border-indigo-500/10">
                    <span>Selected Product</span>
                    <span className="font-bold text-indigo-300">{current.inverterResult.manufacturer} - {current.inverterResult.productName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-indigo-500/10">
                    <span>Max Allowed Oversizing</span>
                    <span className="font-bold text-indigo-300">{(current.inverterResult.maxOversizingRatio * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-indigo-500/10">
                    <span>Target Export AC</span>
                    <span className="font-bold text-indigo-300">{current.inverterResult.targetExportAcMW.toFixed(1)} MWac</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-indigo-500/10">
                    <span>Required Inverter AC (Due to rules)</span>
                    <span className="font-bold text-amber-300">{current.inverterResult.requiredInverterAcMW.toFixed(1)} MWac</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-indigo-500/10">
                    <span>Actual Installed Inverter AC (Units)</span>
                    <span className="font-bold text-white">{current.inverterResult.actualInstalledInverterAcMW.toFixed(2)} MWac ({current.inverterResult.numberOfUnits} units)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-indigo-500/10">
                    <span>Additional Inverter AC above Export</span>
                    <span className={`font-bold ${current.inverterResult.additionalInverterAcMW > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      +{current.inverterResult.additionalInverterAcMW.toFixed(2)} MWac
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Inverter CAPEX</div>
                    <div className="text-xl font-bold text-white">{(current.inverterResult.inverterCapex / 1000).toFixed(1)} k€</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Number of Units</div>
                    <div className="text-xl font-bold text-white">{current.inverterResult.numberOfUnits}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5 col-span-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Additional CAPEX vs Baseline</div>
                    <div className={`text-xl font-bold ${current.inverterResult.additionalCapexVsBaseline > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {current.inverterResult.additionalCapexVsBaseline > 0 ? '+' : ''}
                      {(current.inverterResult.additionalCapexVsBaseline / 1000).toFixed(1)} k€
                    </div>
                    {current.inverterResult.additionalCapexVsBaseline === 0 && (
                      <div className="text-[10px] text-slate-400 mt-1">0.0 k€ difference indicates this is the baseline manufacturer, or no alternative was selected for comparison.</div>
                    )}
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
