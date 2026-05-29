import React from 'react';
import { Briefcase, AlertCircle, Cpu } from 'lucide-react';
import type { DetailedCapexConfig, CombinedScenarioResult, ProjectConfig } from '../types';

interface Props {
  capexConfig: DetailedCapexConfig;
  scenario: CombinedScenarioResult | null;
  scenarios?: CombinedScenarioResult[];
  selectedRatio?: number;
  projectConfig: ProjectConfig;
}

export const EconomicOutput: React.FC<Props> = ({ capexConfig, scenario, scenarios, selectedRatio, projectConfig }) => {
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
        <h2 className="text-2xl font-black text-white tracking-tight">Economic Output</h2>
      </div>
      
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-2 mb-6">
        <AlertCircle className="text-amber-400 shrink-0" size={16} />
        <span className="text-sm font-bold text-amber-400">Directional scenario comparison – this is a pre-feasibility screening based on catalog parameters, not a bankable financial EPC budget.</span>
      </div>

      {!capexConfig.enabled || !current || !current.capexBreakdown ? (
         <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-8 flex flex-col items-center justify-center text-center">
            <Briefcase className="text-slate-600 mb-3" size={32} />
            <h3 className="text-sm font-bold text-white mb-2">Economics Disabled</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Enable the detailed CAPEX model in the "Economics Input" tab to view outputs.
            </p>
         </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-4">Detailed CAPEX Breakdown (Selected Ratio: {scenario?.dcAcRatio.toFixed(2)}×)</h3>
              
              <div className="space-y-2 mb-6">
                 {/* Group: Inverter */}
                 <div className="text-xs font-bold text-slate-500 uppercase mt-4 mb-1 border-b border-white/10 pb-1">Inverter & Power Conversion</div>
                 {current.capexBreakdown.comboName && (
                   <div className="flex justify-between text-xs text-indigo-300 py-1 border-b border-white/5">
                     <span>Selected Combo</span>
                     <span className="font-medium">{current.capexBreakdown.comboName}</span>
                   </div>
                 )}
                 <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                   <span>Inverters (Standalone)</span>
                   <span className="font-medium text-white">{(current.capexBreakdown.inverterCapex / 1e6).toFixed(3)} M€</span>
                 </div>
                 {current.capexBreakdown.inverterIncludedInCombo && (
                   <div className="flex justify-between text-[10px] text-indigo-400 py-1 border-b border-white/5">
                     <span>(Inverter cost included in Transformer/Station combo)</span>
                     <span></span>
                   </div>
                 )}

                 {/* Group: LV / Plant */}
                 <div className="text-xs font-bold text-slate-500 uppercase mt-4 mb-1 border-b border-white/10 pb-1">LV / Plant-Side</div>
                 <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                   <span>Modules</span>
                   <span className="font-medium text-white">{(current.capexBreakdown.moduleCapex / 1e6).toFixed(3)} M€</span>
                 </div>
                 <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                   <span>Mounting Structure (UK)</span>
                   <span className="font-medium text-white">{(current.capexBreakdown.ukCapex / 1e6).toFixed(3)} M€</span>
                 </div>
                 <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                   <span>LV Cabling (Material)</span>
                   <span className="font-medium text-white">{(current.capexBreakdown.lvCableMaterialCapex / 1e6).toFixed(3)} M€</span>
                 </div>
                 <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                   <span>LV Route / Trenching</span>
                   <span className="font-medium text-white">{(current.capexBreakdown.lvRouteInstallationCapex / 1e6).toFixed(3)} M€</span>
                 </div>
                 <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                   <span>Assembly & Installation</span>
                   <span className="font-medium text-white">{(current.capexBreakdown.lvAssemblyCapex / 1e6).toFixed(3)} M€</span>
                 </div>
                 
                 {/* Adders */}
                 {current.capexBreakdown.compensatoryCapex > 0 && (
                   <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                     <span>Compensatory Measures</span>
                     <span className="font-medium text-white">{(current.capexBreakdown.compensatoryCapex / 1000).toFixed(1)} k€</span>
                   </div>
                 )}
                 {current.capexBreakdown.ordnanceCapex > 0 && (
                   <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                     <span>Ordnance Clearance</span>
                     <span className="font-medium text-white">{(current.capexBreakdown.ordnanceCapex / 1000).toFixed(1)} k€</span>
                   </div>
                 )}
                 <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                   <span>Fence & Gates</span>
                   <span className="font-medium text-white">{(current.capexBreakdown.fenceCapex / 1000).toFixed(1)} k€</span>
                 </div>
                 <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                   <span>Roads</span>
                   <span className="font-medium text-white">{(current.capexBreakdown.roadCapex / 1000).toFixed(1)} k€</span>
                 </div>

                 {/* Group: MV/HV/Grid */}
                 <div className="text-xs font-bold text-slate-500 uppercase mt-4 mb-1 border-b border-white/10 pb-1">MV / HV / Grid-Side</div>
                 <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                   <span>MV Cabling (Material)</span>
                   <span className="font-medium text-white">{(current.capexBreakdown.mvCableMaterialCapex / 1000).toFixed(1)} k€</span>
                 </div>
                 <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                   <span>MV Route / Trenching / Easements</span>
                   <span className="font-medium text-white">{(current.capexBreakdown.mvRouteInstallationCapex / 1000).toFixed(1)} k€</span>
                 </div>
                 <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                   <span>Transformers</span>
                   <span className="font-medium text-white">{(current.capexBreakdown.transformerCapex / 1000).toFixed(1)} k€</span>
                 </div>
                 <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                   <span>Transfer/Combined Station (ÜGS/Kombi)</span>
                   <span className="font-medium text-white">{(current.capexBreakdown.ugsKombiCapex / 1000).toFixed(1)} k€</span>
                 </div>
                 <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                   <span>HV Substation / Feed-In</span>
                   <span className="font-medium text-white">{(current.capexBreakdown.hvSubstationCapex / 1e6).toFixed(3)} M€</span>
                 </div>

                 {/* Group: BESS */}
                 {current.capexBreakdown.bessCapex > 0 && (
                   <>
                     <div className="text-xs font-bold text-slate-500 uppercase mt-4 mb-1 border-b border-white/10 pb-1">Storage (BESS)</div>
                     <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                       <span>BESS Installation & Hardware</span>
                       <span className="font-medium text-white">{(current.capexBreakdown.bessCapex / 1e6).toFixed(3)} M€</span>
                     </div>
                   </>
                 )}

                 {/* Group: Other */}
                 <div className="text-xs font-bold text-slate-500 uppercase mt-4 mb-1 border-b border-white/10 pb-1">Other / Contingency</div>
                 <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                   <span>Certification</span>
                   <span className="font-medium text-white">{(current.capexBreakdown.certificationCapex / 1000).toFixed(1)} k€</span>
                 </div>
                 <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                   <span>Contingency Buffer</span>
                   <span className="font-medium text-white">{(current.capexBreakdown.contingencyCapex / 1e6).toFixed(3)} M€</span>
                 </div>

                 <div className="flex justify-between text-sm font-bold text-emerald-400 pt-3 mt-2 border-t border-emerald-500/30">
                   <span>Total Detailed System CAPEX</span>
                   <span>{((current.totalCapex || 0) / 1e6).toFixed(3)} M€</span>
                 </div>
              </div>
            </div>

            {current.inverterResult && (
              <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Cpu className="text-indigo-400" size={18} />
                  <h3 className="text-sm font-bold text-indigo-400">Inverter Manufacturer Impact</h3>
                </div>
                
                <div className="space-y-2 mb-4 text-xs text-indigo-200/80">
                  <div className="flex justify-between py-1 border-b border-indigo-500/10">
                    <span>Selected Product</span>
                    <span className="font-bold text-indigo-300">{current.inverterResult.manufacturer} - {current.inverterResult.productName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-indigo-500/10">
                    <span>Target Export AC</span>
                    <span className="font-bold text-indigo-300">{current.inverterResult.targetExportAcMW.toFixed(1)} MWac</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-indigo-500/10">
                    <span>Required Inverter AC (Due to oversizing limits)</span>
                    <span className="font-bold text-amber-300">{current.inverterResult.requiredInverterAcMW.toFixed(1)} MWac</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-indigo-500/10">
                    <span>Actual Installed Inverter AC (Units)</span>
                    <span className="font-bold text-white">{current.inverterResult.actualInstalledInverterAcMW.toFixed(2)} MWac ({current.inverterResult.numberOfUnits} units)</span>
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
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
             <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-5">
               <h3 className="text-sm font-bold text-emerald-400 mb-4">Investment Metrics (NPV Bridge)</h3>
               
               <div className="space-y-2 mb-4">
                 <div className="flex justify-between text-xs text-slate-300 py-1 border-b border-white/5">
                   <span>Initial CAPEX (Year 0)</span>
                   <span className="font-medium text-red-400">-{( (current.totalCapex || 0) / 1e6).toFixed(2)} M€</span>
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
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                   <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Simple Payback</div>
                   <div className="text-xl font-bold text-emerald-400">{current.simplePaybackYears ? current.simplePaybackYears.toFixed(1) + ' yrs' : '> Lifetime'}</div>
                 </div>
                 <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5">
                   <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">CAPEX per MWp DC</div>
                   <div className="text-xl font-bold text-emerald-400">{((current.totalCapex || 0) / current.dcMWp / 1000).toFixed(0)} k€/MWp</div>
                 </div>
               </div>
             </div>

             <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-4">
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
          </div>
        </div>
      )}
    </div>
  );
};
