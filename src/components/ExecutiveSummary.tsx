import React from 'react';
import { TrendingUp, AlertTriangle, Cpu, CheckCircle, XCircle } from 'lucide-react';
import type { CombinedScenarioResult } from '../types';

interface Props {
  scenarios: CombinedScenarioResult[];
  selectedRatio: number;
}

export const ExecutiveSummary: React.FC<Props> = ({ scenarios, selectedRatio }) => {
  if (scenarios.length === 0) return null;

  const combined = scenarios.find(s => s.dcAcRatio === selectedRatio) || scenarios[0];
  
  const techOptimal = scenarios.find(s => s.p50.isOptimalTechnical)?.p50;
  const econOptimal = scenarios.find(s => s.p50.isOptimalEconomic)?.p50;
  const balancedOptimal = scenarios.find(s => s.p50.isOptimalMarginal)?.p50;
  const robustOptimal = scenarios.find(s => s.isRobustOptimum);

  const bestOptimum = robustOptimal || econOptimal || balancedOptimal || techOptimal;

  return (
    <div className="space-y-6 animate-fade-in mt-8">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="text-emerald-400" size={28} />
        <h2 className="text-2xl font-black text-white tracking-tight">Executive Summary</h2>
      </div>

      <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Recommended DC/AC Bucket</h3>
        <div className="flex items-end gap-4 mb-6">
          <div className="text-5xl font-black text-emerald-400">
            {robustOptimal ? robustOptimal.dcAcRatio.toFixed(2) : (econOptimal ? econOptimal.dcAcRatio.toFixed(2) : '—')}×
          </div>
          <div className="text-sm text-slate-400 pb-1">
            {robustOptimal ? 'Robust Economic Optimum' : 'Economic Optimum'}
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="bg-slate-800/50 p-4 rounded-lg border border-white/5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Main Reason for Recommendation</h4>
            <p className="text-sm text-slate-300">
              {robustOptimal 
                ? 'Provides the highest expected NPV while maintaining strong marginal returns and avoiding significant downside risk in conservative P90 production scenarios.'
                : 'Maximizes the total economic return based on the provided assumptions.'}
            </p>
          </div>
          
          <div className="bg-slate-800/50 p-4 rounded-lg border border-white/5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Short Summary on DC Overbuild</h4>
            <p className="text-sm text-slate-300">
              {bestOptimum && bestOptimum.dcAcRatio > 1.2 
                ? 'Higher DC overbuild is highly beneficial under the current assumptions, efficiently utilizing the AC infrastructure and increasing total energy injected.'
                : 'A conservative DC/AC ratio is recommended. Higher DC overbuild leads to excessive clipping or diminishing marginal returns under the current assumptions.'}
            </p>
          </div>

          {(combined.p50.clippingWarning || (bestOptimum && combined.dcAcRatio > bestOptimum.dcAcRatio)) && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-lg flex items-start gap-3">
              <AlertTriangle className="text-amber-400 mt-0.5" size={16} />
              <div>
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Key Limitation & Warning</h4>
                <p className="text-sm text-amber-300/90">
                  {combined.p50.clippingWarning 
                    ? 'The selected ratio causes severe clipping. Over 50% of incremental DC generation is curtailed.'
                    : 'The selected DC/AC ratio is higher than the recommended optimum, resulting in suboptimal capital deployment.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {combined.inverterComparison && combined.inverterComparison.length > 0 && (
        <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="text-cyan-400" size={20} />
            <h3 className="text-lg font-bold text-white">Manufacturer Constraint Impact</h3>
          </div>
          <p className="text-sm text-slate-300 mb-6">
            For the selected configuration (<strong>{combined.dcMWp.toFixed(1)} MWp DC</strong> and <strong>{combined.acMWac.toFixed(1)} MWac Export</strong>), here is the required physical inverter capacity based on manufacturer-specific maximum DC oversizing limits:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {combined.inverterComparison.map(inv => (
              <div key={inv.productName} className={`bg-slate-800/50 border rounded-xl p-4 ${inv.isFeasible ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-sm font-bold text-white">{inv.manufacturer}</div>
                    <div className="text-[10px] text-slate-400">{inv.productName}</div>
                  </div>
                  <div className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-slate-900 text-slate-300 border-slate-700">
                    Max {inv.maxOversizingRatio.toFixed(2)}×
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Required Inv. AC</span>
                    <span className="text-sm font-bold text-white">{inv.requiredInverterAcMW.toFixed(2)} MWac</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Inverter Units</span>
                    <span className="text-sm font-bold text-white">{inv.numberOfUnits}</span>
                  </div>
                  {inv.additionalInverterAcMW > 0 && inv.isFeasible && (
                    <div className="flex justify-between items-center text-amber-400">
                      <span className="text-xs">+ Excess AC vs Export</span>
                      <span className="text-sm font-bold">{inv.additionalInverterAcMW.toFixed(2)} MWac</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className="text-xs text-slate-400">Total Inv. CAPEX</span>
                    <span className="text-sm font-bold text-white">{(inv.inverterCapex / 1000).toFixed(0)} k€</span>
                  </div>
                  {inv.additionalCapexVsBaseline > 0 && (
                    <div className="flex justify-between items-center text-amber-400">
                      <span className="text-xs">+ Extra CAPEX</span>
                      <span className="text-sm font-bold">+{(inv.additionalCapexVsBaseline / 1000).toFixed(0)} k€</span>
                    </div>
                  )}
                </div>

                <div className={`text-xs flex items-center gap-1.5 ${inv.isFeasible ? (inv.additionalInverterAcMW > 0 ? 'text-amber-400' : 'text-emerald-400') : 'text-red-400'}`}>
                  {inv.isFeasible ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  <span>{inv.statusMessage}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {techOptimal && (
          <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4">
            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Technical Optimum</div>
            <div className="text-xl font-bold text-white">{techOptimal.dcAcRatio.toFixed(2)}×</div>
            <div className="text-xs text-slate-500 mt-1">Lowest clipping & high FLH</div>
          </div>
        )}
        {balancedOptimal && (
          <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4">
            <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">Balanced Optimum</div>
            <div className="text-xl font-bold text-white">{balancedOptimal.dcAcRatio.toFixed(2)}×</div>
            <div className="text-xs text-slate-500 mt-1">Best incremental return</div>
          </div>
        )}
        {econOptimal && (
          <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4">
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Economic Optimum</div>
            <div className="text-xl font-bold text-white">{econOptimal.dcAcRatio.toFixed(2)}×</div>
            <div className="text-xs text-slate-500 mt-1">Highest total lifetime revenue</div>
          </div>
        )}
        {robustOptimal && (
          <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4">
            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Robust Bucket</div>
            <div className="text-xl font-bold text-white">{robustOptimal.dcAcRatio.toFixed(2)}×</div>
            <div className="text-xs text-slate-500 mt-1">Strong P50 & P90 performance</div>
          </div>
        )}
      </div>
    </div>
  );
};
