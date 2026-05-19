import React from 'react';
import { DollarSign, Upload } from 'lucide-react';
import type { PriceConfig, RevenueMode } from '../types';
import { parsePriceCSV, getAveragePrice } from '../engine/priceData';

interface Props {
  config: PriceConfig;
  onChange: (config: PriceConfig) => void;
}

const MODES: { value: RevenueMode; label: string }[] = [
  { value: 'market', label: 'Market Price' },
  { value: 'tariff', label: 'Fixed Tariff' },
  { value: 'hybrid', label: 'Comparison' },
];

export const PriceConfigPanel: React.FC<Props> = ({ config, onChange }) => {
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { prices, warnings } = parsePriceCSV(text);
    if (warnings.length > 0) {
      console.warn('Price CSV warnings:', warnings);
    }
    onChange({ ...config, priceProfile: prices, priceSource: 'csv' });
  };

  const avgPrice = config.priceProfile.length > 0
    ? getAveragePrice(config.priceProfile)
    : 0;

  return (
    <div className="glass-card p-5 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2 border-b border-slate-700/30 pb-4">
        <DollarSign className="text-emerald-400" size={20} />
        <h2 className="text-lg font-bold text-white">Revenue Assumptions</h2>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-3 gap-2">
        {MODES.map(m => (
          <button
            key={m.value}
            onClick={() => onChange({ ...config, revenueMode: m.value })}
            className={`p-2 rounded-xl text-xs font-bold transition-all border ${
              config.revenueMode === m.value
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="bg-slate-900/40 p-3 rounded-xl border border-white/5 space-y-3">
        {/* Fixed tariff */}
        {(config.revenueMode === 'tariff' || config.revenueMode === 'hybrid') && (
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fixed Tariff</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={config.fixedTariffEurMWh || ''}
                onChange={e => onChange({ ...config, fixedTariffEurMWh: parseFloat(e.target.value) || 0 })}
                onFocus={e => e.target.select()}
                className="bg-transparent text-right text-white w-16 font-mono outline-none focus:text-emerald-400 transition-colors"
                step="1"
              />
              <span className="text-slate-600 text-[10px] font-bold">EUR/MWh</span>
            </div>
          </div>
        )}

        {/* Market price info */}
        {(config.revenueMode === 'market' || config.revenueMode === 'hybrid') && (
          <>
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Price Source</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                config.priceSource === 'csv'
                  ? 'text-emerald-300 bg-emerald-500/15'
                  : 'text-amber-300 bg-amber-500/15'
              }`}>
                {config.priceSource === 'csv' ? 'User CSV' : 'Sample (DE Day-Ahead)'}
              </span>
            </div>

            {avgPrice > 0 && (
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg. Price</span>
                <span className="text-sm font-mono text-white">{avgPrice.toFixed(1)} EUR/MWh</span>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-white transition-colors mt-1">
              <Upload size={14} />
              <span>Upload price CSV</span>
              <input type="file" className="hidden" accept=".csv" onChange={handleCSVUpload} />
            </label>
          </>
        )}
      </div>

      {config.priceSource === 'sample' && config.revenueMode !== 'tariff' && (
        <p className="text-[10px] text-amber-400/70 italic leading-tight">
          Using representative German day-ahead price shape. Upload actual price data for project-specific analysis.
          Recommended sources: <strong>SMARD.de</strong> or <strong>Energy-Charts.info</strong> (hourly CSV export).
        </p>
      )}
    </div>
  );
};
