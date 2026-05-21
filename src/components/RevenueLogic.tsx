import React from 'react';
import { DollarSign, HelpCircle, AlertTriangle } from 'lucide-react';
import { PriceConfigPanel } from './PriceConfig';
import type { PriceConfig } from '../types';
import { getPriceStats } from '../engine/priceData';

interface Props {
  priceConfig: PriceConfig;
  onChange: (config: PriceConfig) => void;
}

export const RevenueLogic: React.FC<Props> = ({ priceConfig, onChange }) => {
  const stats = getPriceStats(priceConfig.priceProfile);
  const isSample = priceConfig.priceSource === 'smard_2024';

  return (
    <div className="space-y-6 animate-fade-in mt-8">
      <div className="flex items-center gap-3 mb-6">
        <DollarSign className="text-emerald-400" size={28} />
        <h2 className="text-2xl font-black text-white tracking-tight">Revenue Logic</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <PriceConfigPanel config={priceConfig} onChange={onChange} />
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-sm font-bold text-white mb-4">Price Profile Statistics</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Price Source</div>
                <div className="text-sm font-medium text-slate-300">{isSample ? 'SMARD 2024 DE-LU' : 'Custom CSV / API'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Time Resolution</div>
                <div className="text-sm font-medium text-slate-300">Hourly (8760 timestamps)</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Average Market Price</div>
                <div className="text-sm font-medium text-emerald-400">{stats.averagePrice.toFixed(2)} EUR/MWh</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Min / Max Price</div>
                <div className="text-sm font-medium text-slate-300">{stats.minPrice.toFixed(1)} / {stats.maxPrice.toFixed(1)} EUR/MWh</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Negative Price Hours</div>
                <div className="text-sm font-medium text-amber-400">{stats.negativeHours} h</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Missing Timestamps</div>
                <div className="text-sm font-medium text-slate-300">{stats.missingHours} h</div>
              </div>
            </div>
          </div>

          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex gap-3 items-start">
            <HelpCircle className="text-blue-400 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-sm font-bold text-blue-300 mb-1">Revenue Formulas</h4>
              <p className="text-xs text-slate-300 font-mono mb-2">
                Revenue per timestep = Injected MWh after clipping × Price EUR/MWh
              </p>
              <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4">
                <li>Generated energy before clipping is not monetized.</li>
                <li>Only injected energy after AC limitation is used for revenue calculations.</li>
                <li>Capture price accounts for the cannibalization effect (solar generation peaking when prices drop).</li>
              </ul>
            </div>
          </div>

          {isSample && priceConfig.revenueMode !== 'tariff' && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-sm font-bold text-amber-400">Illustrative Price Data Used</h4>
                <p className="text-xs text-amber-300/80 mt-1">
                  Sample price profile used. This is illustrative and not based on live market data. For bankable results, upload a custom price vector.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
