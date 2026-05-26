import React from 'react';
import { Target, ArrowUpCircle, ArrowDownCircle, Info, AlertTriangle } from 'lucide-react';
import type { CombinedScenarioResult } from '../types';

interface Props {
  scenarios: CombinedScenarioResult[];
}

export const Recommendation: React.FC<Props> = ({ scenarios }) => {
  if (scenarios.length === 0) return null;

  const techOptimal = scenarios.find(s => s.p50.isOptimalTechnical);
  const econOptimal = scenarios.find(s => s.p50.isOptimalEconomic);
  const balancedOptimal = scenarios.find(s => s.p50.isOptimalMarginal);
  const robustOptimal = scenarios.find(s => s.isRobustOptimum);

  const bestOptimum = robustOptimal || econOptimal || balancedOptimal || techOptimal;
  if (!bestOptimum) return null;

  return (
    <div className="space-y-6 animate-fade-in mt-8">
      <div className="flex items-center gap-3 mb-6">
        <Target className="text-emerald-400" size={28} />
        <h2 className="text-2xl font-black text-white tracking-tight">Bucket Recommendation</h2>
      </div>

      <div className="bg-slate-900/40 border border-emerald-500/30 rounded-xl p-6">
        <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-2">Recommended DC/AC Bucket</h3>
        <div className="text-4xl font-black text-white mb-6">{bestOptimum.dcAcRatio.toFixed(2)}×</div>
        
        <div className="space-y-4">
          <div className="bg-slate-800/50 p-4 rounded-lg border border-white/5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Why this bucket is recommended</h4>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
              <li>It maintains high AC utilization with manageable clipping losses.</li>
              {robustOptimal && <li>It provides a robust return across both P50 (expected) and P90 (conservative) production cases.</li>}
              <li>The marginal revenue per additional MWp remains above the required threshold.</li>
              <li>Additional production is predominantly injected rather than clipped.</li>
              <li>Capture price degradation from cannibalization is within an acceptable range.</li>
              {bestOptimum.p50.inverterResult && <li>Manufacturer-specific inverter constraints and CAPEX impacts are optimized.</li>}
            </ul>
          </div>

          {bestOptimum.p50.inverterResult && bestOptimum.p50.inverterResult.additionalInverterAcMW > 0 && (
            <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-500/30 flex items-start gap-3">
              <AlertTriangle className="text-amber-400 mt-0.5" size={16} />
              <div>
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Manufacturer Oversizing Limit Reached</h4>
                <p className="text-sm text-amber-300">
                  A configuration that is technically possible with a 200% oversizing limit (like SMA) requires significantly more installed inverter capacity with the currently selected manufacturer ({bestOptimum.p50.inverterResult.manufacturer} at {bestOptimum.p50.inverterResult.maxOversizingRatio.toFixed(2)}×). The export limit remains unchanged, but the installed component base and CAPEX increase.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-5 flex items-start gap-3">
          <ArrowDownCircle className="text-blue-400 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">What happens below {bestOptimum.dcAcRatio.toFixed(2)}×?</h4>
            <p className="text-sm text-slate-300">
              Choosing a lower DC/AC ratio reduces clipping to near zero, but underutilizes the AC grid connection. The total lifetime revenue will be significantly lower, and the specific cost per AC capacity will remain high since the inverter operates at partial load for most of the year.
            </p>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-5 flex items-start gap-3">
          <ArrowUpCircle className="text-amber-400 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">What happens above {bestOptimum.dcAcRatio.toFixed(2)}×?</h4>
            <p className="text-sm text-slate-300">
              Increasing the DC capacity further leads to severely diminishing returns. The majority of any additionally generated energy will be clipped during peak midday hours. Marginal revenue drops sharply, and the added CAPEX for solar modules does not justify the minimal additional injected energy.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4 border-b border-blue-500/20 pb-3">
          <Info className="text-blue-400" size={18} />
          <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider">Key Sensitivities</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">P50 / P90 Robustness</h4>
            <p className="text-xs text-slate-300">
              The recommendation is tested against P90 data (if available/configured) to ensure the NPV delta remains positive even in low-yield years.
            </p>
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Market Price & Cannibalization</h4>
            <p className="text-xs text-slate-300">
              The capture price drops as DC capacity increases because extra yield often coincides with depressed market prices. The recommended bucket avoids the steepest drop-offs.
            </p>
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">CAPEX Impact</h4>
            <p className="text-xs text-slate-300">
              The simplified NPV includes DC-side CAPEX scaling. An increase in module prices would shift the optimum towards a lower DC/AC ratio.
            </p>
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Inverter Constraints</h4>
            <p className="text-xs text-slate-300">
              Manufacturer max oversizing limits can materially change the economic attractiveness. Some products require overbuilding the inverter AC capacity to support the target DC.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/40 p-5 rounded-xl border border-white/5 text-center">
        <h3 className="text-sm font-bold text-white mb-2">Final Management Summary</h3>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto">
          The selected DC/AC bucket maximizes capital efficiency by heavily utilizing the AC grid connection while strictly limiting wasteful CAPEX expansion where marginal generation would predominantly be curtailed. This is a directional pre-feasibility recommendation.
        </p>
      </div>

    </div>
  );
};
