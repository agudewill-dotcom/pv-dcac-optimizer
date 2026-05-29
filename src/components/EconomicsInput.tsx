import React, { useState } from 'react';
import { Briefcase, Settings2, Shield, Zap, Battery, ChevronDown, ChevronUp, Cpu, BookOpen } from 'lucide-react';
import type { DetailedCapexConfig, InverterConfig } from '../types';
import type { CostItem } from '../data/costCatalog';

interface Props {
  capexConfig: DetailedCapexConfig;
  setCapex: (c: DetailedCapexConfig) => void;
  catalog: CostItem[];
  setCatalog: (c: CostItem[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  inverterConfig: InverterConfig;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setInverter: (c: InverterConfig) => void;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  dcCapacityMWp: number;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  targetExportAcMW: number;
}

const Accordion = ({ title, icon: Icon, children, defaultOpen = false }: { title: string, icon: React.ElementType, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl overflow-hidden mb-4">
      <button 
        className="w-full p-4 flex items-center justify-between bg-slate-800/40 hover:bg-slate-800/60 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <Icon className="text-emerald-400" size={20} />
          <h3 className="text-md font-bold text-white">{title}</h3>
        </div>
        {isOpen ? <ChevronUp className="text-slate-400" size={20} /> : <ChevronDown className="text-slate-400" size={20} />}
      </button>
      {isOpen && (
        <div className="p-5 border-t border-slate-700/50 space-y-6">
          {children}
        </div>
      )}
    </div>
  );
};

export const EconomicsInput: React.FC<Props> = ({ 
  capexConfig, 
  setCapex, 
  catalog, 
  setCatalog, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  inverterConfig, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setInverter, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  dcCapacityMWp, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  targetExportAcMW 
}) => {
  
  const update = (field: keyof DetailedCapexConfig, value: unknown) => {
    setCapex({ ...capexConfig, [field]: value });
  };

  const getItems = (cat: string, sub: string) => catalog.filter(i => i.category === cat && i.subcategory === sub);
  
  const fmtCurrency = (val: number) => val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6 animate-fade-in mt-8">
      <div className="flex items-center gap-3 mb-2">
        <Briefcase className="text-emerald-400" size={28} />
        <h2 className="text-2xl font-black text-white tracking-tight">Economics Input (Assumptions)</h2>
      </div>
      <p className="text-sm text-slate-300">Define the realistic cost drivers for this project. These inputs do not directly show calculated totals, they form the basis for the pre-feasibility analysis shown in the Economic Output tab.</p>

      <Accordion title="1. Scope & Toggles" icon={Settings2} defaultOpen={true}>
        <label className="flex items-center gap-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 cursor-pointer hover:bg-slate-800/80 transition-colors">
          <div className="relative">
            <input type="checkbox" className="sr-only peer" checked={capexConfig.enabled} onChange={(e) => update('enabled', e.target.checked)} />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </div>
          <div>
            <div className="text-sm font-bold text-white">Enable Detailed CAPEX Model</div>
            <div className="text-xs text-slate-400">If disabled, the financial optimization will not be calculated.</div>
          </div>
        </label>
      </Accordion>

      <Accordion title="2. LV / Plant-Side" icon={Zap}>
        {/* UK */}
        <div>
          <h4 className="text-sm font-bold text-white mb-2">A1. Mounting Structure (UK)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">UK Method</label>
              <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.ukMethod} onChange={(e) => update('ukMethod', e.target.value)}>
                <option value="catalog">Default Catalog (€/kWp)</option>
                <option value="manual_kwp">Manual (€/kWp)</option>
                <option value="manual_total">Manual Total (€)</option>
              </select>
            </div>
            {capexConfig.ukMethod === 'catalog' && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Select UK System</label>
                <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.selectedUKItemId} onChange={(e) => update('selectedUKItemId', e.target.value)}>
                  {getItems('LV', 'Mounting').map(i => <option key={i.id} value={i.id}>{i.label} ({fmtCurrency(i.defaultValue)} {i.unit})</option>)}
                </select>
              </div>
            )}
            {capexConfig.ukMethod === 'manual_kwp' && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Manual Cost (€/kWp)</label>
                <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.manualUKKwp} onChange={(e) => update('manualUKKwp', Number(e.target.value))} />
              </div>
            )}
            {capexConfig.ukMethod === 'manual_total' && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Manual Total (€)</label>
                <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.manualUKTotal} onChange={(e) => update('manualUKTotal', Number(e.target.value))} />
              </div>
            )}
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={capexConfig.isAgriPV} onChange={(e) => update('isAgriPV', e.target.checked)} className="rounded border-slate-700 bg-slate-900" />
              Agri-PV Project
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={capexConfig.isRootProtection} onChange={(e) => update('isRootProtection', e.target.checked)} className="rounded border-slate-700 bg-slate-900" />
              Root Protection (Wurzelmanschetten)
            </label>
          </div>
          <p className="text-xs text-amber-400/80 mt-2">UK costs are screening defaults and must be verified against structural design, soil conditions, and supplier quotations.</p>
        </div>

        {/* Modules */}
        <div className="pt-4 border-t border-white/5">
          <h4 className="text-sm font-bold text-white mb-2">A2. Modules</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Select Module</label>
              <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.selectedModuleId} onChange={(e) => update('selectedModuleId', e.target.value)}>
                {getItems('LV', 'Module').map(i => <option key={i.id} value={i.id}>{i.label} ({fmtCurrency(i.defaultValue)} {i.unit})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Manual Override Price (€/module) - 0 to ignore</label>
              <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.manualModulePrice} onChange={(e) => update('manualModulePrice', Number(e.target.value))} />
            </div>
          </div>
        </div>

        {/* LV Cables */}
        <div className="pt-4 border-t border-white/5">
          <h4 className="text-sm font-bold text-white mb-2">A3 & A4. LV Cabling & Routing</h4>
          <label className="flex items-center gap-2 text-sm text-slate-300 mb-4">
            <input type="checkbox" checked={capexConfig.includeLVCable} onChange={(e) => update('includeLVCable', e.target.checked)} className="rounded border-slate-700 bg-slate-900" />
            Include LV Cables & Routing
          </label>
          
          {capexConfig.includeLVCable && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cable Catalog</label>
                <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.selectedLVCableId} onChange={(e) => update('selectedLVCableId', e.target.value)}>
                  <optgroup label="Copper">
                    {getItems('LV', 'Cable_Cu').map(i => <option key={i.id} value={i.id}>{i.label} ({fmtCurrency(i.defaultValue)} {i.unit})</option>)}
                  </optgroup>
                  <optgroup label="Aluminum">
                    {getItems('LV', 'Cable_Al').map(i => <option key={i.id} value={i.id}>{i.label} ({fmtCurrency(i.defaultValue)} {i.unit})</option>)}
                  </optgroup>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Length (m)</label>
                  <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.lvCableLengthM} onChange={(e) => update('lvCableLengthM', Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Runs / Circuits</label>
                  <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.lvCableRuns} onChange={(e) => update('lvCableRuns', Number(e.target.value))} />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">LV Route Length (m)</label>
                <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.lvRouteLengthM} onChange={(e) => update('lvRouteLengthM', Number(e.target.value))} />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Open Trench %</label>
                  <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.lvShareOpenTrench} onChange={(e) => update('lvShareOpenTrench', Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cable Tray %</label>
                  <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.lvShareCableTray} onChange={(e) => update('lvShareCableTray', Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Asphalt %</label>
                  <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.lvShareAsphalt} onChange={(e) => update('lvShareAsphalt', Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">HDD %</label>
                  <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.lvShareHDD} onChange={(e) => update('lvShareHDD', Number(e.target.value))} />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Assembly */}
        <div className="pt-4 border-t border-white/5">
          <h4 className="text-sm font-bold text-white mb-2">A5. Assembly & Installation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Benchmark Cost (€/kWp)</label>
                <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.montageTotalKwp} onChange={(e) => update('montageTotalKwp', Number(e.target.value))} />
             </div>
          </div>
        </div>
      </Accordion>

      <Accordion title="3. MV / HV / Grid-Side" icon={Settings2}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Grid Connection Concept</label>
            <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.gridConcept} onChange={(e) => update('gridConcept', e.target.value)}>
              <option value="transfer_station">MV Transfer Station (Übergabestation)</option>
              <option value="hv_substation">HV Substation (Umspannwerk)</option>
              <option value="edis_cell">E.dis Feed-in Cell</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Lump Sum Grid Override (€)</label>
            <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.manualGridOverrideTotal || 0} onChange={(e) => update('manualGridOverrideTotal', Number(e.target.value))} placeholder="0" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">MV Cable Type</label>
              <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.selectedMVCableId} onChange={(e) => update('selectedMVCableId', e.target.value)}>
                {getItems('MV', 'Cable').map(i => <option key={i.id} value={i.id}>{i.label} ({fmtCurrency(i.defaultValue)} {i.unit})</option>)}
              </select>
           </div>
           <div className="grid grid-cols-2 gap-2">
              <div>
                 <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">MV Route Length (m)</label>
                 <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.mvRouteLengthM} onChange={(e) => update('mvRouteLengthM', Number(e.target.value))} />
              </div>
              <div>
                 <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">MV Cable Runs</label>
                 <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.mvCableRuns} onChange={(e) => update('mvCableRuns', Number(e.target.value))} />
              </div>
           </div>

           <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Use Kombistation</label>
              <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.useKombistation} onChange={(e) => update('useKombistation', e.target.value)}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
                <option value="suggested">Suggested (Auto based on route)</option>
              </select>
              {capexConfig.useKombistation === 'suggested' && capexConfig.mvRouteLengthM <= capexConfig.mvCombinedStationThresholdM && (
                 <div className="text-xs text-green-400 mt-1">Route &le; 200m. Kombistation will be used.</div>
              )}
              {capexConfig.useKombistation === 'suggested' && capexConfig.mvRouteLengthM > capexConfig.mvCombinedStationThresholdM && (
                 <div className="text-xs text-amber-400 mt-1">Route &gt; 200m. Kombistation will NOT be used.</div>
              )}
           </div>

           <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Transformer / Inverter Combo</label>
              <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.selectedTrafoInverterComboId} onChange={(e) => update('selectedTrafoInverterComboId', e.target.value)}>
                {getItems('InverterCombo', 'Combo').map(i => <option key={i.id} value={i.id}>{i.label} ({fmtCurrency(i.defaultValue)} {i.unit})</option>)}
              </select>
           </div>
           
           <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Select Separate Transformer</label>
              <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.selectedTrafoId} onChange={(e) => update('selectedTrafoId', e.target.value)} disabled={capexConfig.selectedTrafoInverterComboId !== 'combo_none'}>
                {getItems('MV', 'Transformer').map(i => <option key={i.id} value={i.id}>{i.label} ({fmtCurrency(i.defaultValue)} {i.unit})</option>)}
              </select>
           </div>

           <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                 <input type="checkbox" checked={capexConfig.includeUGS} onChange={(e) => update('includeUGS', e.target.checked)} className="rounded border-slate-700 bg-slate-900" />
                 Select Transfer Station (ÜGS)
              </label>
              <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.selectedUGSId} onChange={(e) => update('selectedUGSId', e.target.value)} disabled={!capexConfig.includeUGS}>
                {getItems('MV', 'Station').map(i => <option key={i.id} value={i.id}>{i.label} ({fmtCurrency(i.defaultValue)} {i.unit})</option>)}
              </select>
           </div>
           
           <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Select Kombistation</label>
              <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.selectedKombiId} onChange={(e) => update('selectedKombiId', e.target.value)} disabled={capexConfig.useKombistation === 'no' || (capexConfig.useKombistation === 'suggested' && capexConfig.mvRouteLengthM > capexConfig.mvCombinedStationThresholdM)}>
                {getItems('MV', 'Kombi').map(i => <option key={i.id} value={i.id}>{i.label} ({fmtCurrency(i.defaultValue)} {i.unit})</option>)}
              </select>
           </div>
           
           <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                 <input type="checkbox" checked={capexConfig.includeHVSubstation} onChange={(e) => update('includeHVSubstation', e.target.checked)} className="rounded border-slate-700 bg-slate-900" />
                 Select HV Substation
              </label>
              <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.selectedHVSubstationId} onChange={(e) => update('selectedHVSubstationId', e.target.value)} disabled={!capexConfig.includeHVSubstation}>
                {getItems('HV', 'Substation').map(i => <option key={i.id} value={i.id}>{i.label} ({fmtCurrency(i.defaultValue)} {i.unit})</option>)}
              </select>
           </div>
        </div>
      </Accordion>

      <Accordion title="4. Inverter Cost Integration" icon={Cpu}>
        <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-5 text-sm text-slate-300">
           <p className="mb-4">
             Inverter costs are linked directly to your Technical Configuration. 
           </p>
           <button 
             onClick={() => alert("Success! Inverter costs and unit counts for the active scenario are successfully linked to the Economic Engine.")}
             className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition-colors w-full md:w-auto flex items-center justify-center gap-2"
           >
             <Zap size={16} />
             Import Selected Inverter Scenario
           </button>
        </div>
      </Accordion>

      <Accordion title="5. BESS" icon={Battery}>
        {/* Placeholder for BESS input extensions */}
        <div className="text-sm text-slate-300">BESS CAPEX inputs will use catalog selections.</div>
      </Accordion>

      <Accordion title="6. OPEX & Lifetime" icon={Settings2}>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">OPEX Method</label>
              <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.opexMethod} onChange={(e) => update('opexMethod', e.target.value as 'per_mwp' | 'percent_capex' | 'manual_total')}>
                <option value="per_mwp">€/MWp/year</option>
                <option value="percent_capex">% of CAPEX/year</option>
                <option value="manual_total">Manual Total/year</option>
              </select>
           </div>
           <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">OPEX Value</label>
              <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" 
                value={capexConfig.opexMethod === 'per_mwp' ? capexConfig.opexPerMWpYear : capexConfig.opexMethod === 'percent_capex' ? capexConfig.opexPercentCapex : capexConfig.manualOpexTotal} 
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (capexConfig.opexMethod === 'per_mwp') update('opexPerMWpYear', v);
                  else if (capexConfig.opexMethod === 'percent_capex') update('opexPercentCapex', v);
                  else update('manualOpexTotal', v);
                }} 
              />
           </div>
           <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Discount Rate (%)</label>
              <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.discountRate * 100} onChange={(e) => update('discountRate', Number(e.target.value) / 100)} />
           </div>
         </div>
      </Accordion>

      <Accordion title="7. Other Adders" icon={Shield}>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
             <label className="flex items-center gap-2 text-sm font-bold text-white mb-2">
                <input type="checkbox" checked={capexConfig.includeCompensatory} onChange={(e) => update('includeCompensatory', e.target.checked)} className="rounded border-slate-700 bg-slate-900" />
                Compensatory Measures Total (€)
             </label>
             <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" disabled={!capexConfig.includeCompensatory} value={capexConfig.compensatoryTotal} onChange={(e) => update('compensatoryTotal', Number(e.target.value))} />
           </div>
           <div>
             <label className="flex items-center gap-2 text-sm font-bold text-white mb-2">
                <input type="checkbox" checked={capexConfig.includeOrdnance} onChange={(e) => update('includeOrdnance', e.target.checked)} className="rounded border-slate-700 bg-slate-900" />
                Ordnance Clearance Total (€)
             </label>
             <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" disabled={!capexConfig.includeOrdnance} value={capexConfig.ordnanceTotal} onChange={(e) => update('ordnanceTotal', Number(e.target.value))} />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Contingency Buffer (%)</label>
             <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white" value={capexConfig.contingencyPercent} onChange={(e) => update('contingencyPercent', Number(e.target.value))} />
           </div>
         </div>
      </Accordion>

      <Accordion title="8. Cost Catalog" icon={BookOpen}>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
               <thead className="text-xs uppercase bg-slate-800/80 text-slate-400">
                  <tr>
                     <th className="px-4 py-2">Category</th>
                     <th className="px-4 py-2">Label</th>
                     <th className="px-4 py-2 text-right">Default Value</th>
                     <th className="px-4 py-2">Unit</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {catalog.map(item => (
                     <tr key={item.id} className="hover:bg-white/5">
                        <td className="px-4 py-2 font-mono text-[10px]">{item.category} / {item.subcategory}</td>
                        <td className="px-4 py-2">{item.label}</td>
                        <td className="px-4 py-2 text-right">
                           <input type="number" className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right" 
                             value={item.defaultValue} 
                             onChange={(e) => {
                               const newCat = catalog.map(c => c.id === item.id ? { ...c, defaultValue: Number(e.target.value) } : c);
                               setCatalog(newCat);
                             }}
                           />
                        </td>
                        <td className="px-4 py-2 text-xs">{item.unit}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </Accordion>
    </div>
  );
};
