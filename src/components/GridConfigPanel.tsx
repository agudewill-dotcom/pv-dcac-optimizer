import React from 'react';
import { Cable } from 'lucide-react';
import type { GridConfig } from '../types';

interface Props {
  config: GridConfig;
  onChange: (config: GridConfig) => void;
}

export const GridConfigPanel: React.FC<Props> = ({ config, onChange }) => {
  const update = (key: keyof GridConfig, value: string | number) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="glass-card p-5 space-y-5 animate-fade-in">
      <div className="flex items-center gap-2 border-b border-slate-700/30 pb-4">
        <Cable className="text-blue-400" size={20} />
        <h2 className="text-lg font-bold text-slate-200">Grid Connection Estimates</h2>
      </div>

      <p className="text-xs text-slate-400">
        Input the one-time flat costs (Total CAPEX) for the grid connection infrastructure.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* HV Substation (Umspannwerk) */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-orange-400">HV Substation (Umspannwerk)</h3>
          <div className="flex flex-col gap-1">
            <label className="label-premium">Total One-Time Cost (k€)</label>
            <input
              type="number"
              value={config.hvBaseCostKEur}
              onChange={e => update('hvBaseCostKEur', parseFloat(e.target.value) || 0)}
              onFocus={e => e.target.select()}
              className="input-premium text-sm h-[38px] text-left"
              step="50"
            />
          </div>
        </div>

        {/* MV EVU Connection (Übergabestation) */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-emerald-400">MV Transfer Station & EVU Connection</h3>
          <div className="flex flex-col gap-1">
            <label className="label-premium">Total One-Time Cost (k€)</label>
            <input
              type="number"
              value={config.mvBaseCostKEur}
              onChange={e => update('mvBaseCostKEur', parseFloat(e.target.value) || 0)}
              onFocus={e => e.target.select()}
              className="input-premium text-sm h-[38px] text-left"
              step="50"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
