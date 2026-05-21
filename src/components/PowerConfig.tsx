import React from 'react';
import { Zap } from 'lucide-react';
import type { PowerConfig, OptimizationMode } from '../types';

interface Props {
  config: PowerConfig;
  onChange: (config: PowerConfig) => void;
}

const MODES: { value: OptimizationMode; label: string; desc: string }[] = [
  { value: 'ac_fixed', label: 'AC Fixed', desc: 'Fix AC capacity, sweep DC/AC ratios' },
  { value: 'dc_fixed', label: 'DC Fixed', desc: 'Fix DC capacity, sweep AC sizes' },
  { value: 'free', label: 'Free', desc: 'Manual DC & AC entry' },
];

export const PowerConfigPanel: React.FC<Props> = ({ config, onChange }) => {
  const update = (patch: Partial<PowerConfig>) => {
    const next = { ...config, ...patch };
    // Auto-calculate the dependent variable
    if (patch.dcCapacityMWp !== undefined || patch.acCapacityMWac !== undefined) {
      if (next.dcCapacityMWp > 0 && next.acCapacityMWac > 0) {
        next.dcAcRatio = Math.round((next.dcCapacityMWp / next.acCapacityMWac) * 100) / 100;
      }
    }
    if (patch.dcAcRatio !== undefined) {
      if (next.mode === 'ac_fixed' && next.acCapacityMWac > 0) {
        next.dcCapacityMWp = Math.round(next.acCapacityMWac * next.dcAcRatio * 100) / 100;
      } else if (next.mode === 'dc_fixed' && next.dcCapacityMWp > 0) {
        next.acCapacityMWac = Math.round((next.dcCapacityMWp / next.dcAcRatio) * 100) / 100;
      }
    }
    onChange(next);
  };

  const ratioWarning = config.dcAcRatio < 1.0 || config.dcAcRatio > 1.6;

  return (
    <div className="glass-card p-5 space-y-5 animate-fade-in">
      <div className="flex items-center gap-2 border-b border-slate-700/30 pb-4">
        <Zap className="text-blue-400" size={20} />
        <h2 className="text-lg font-bold text-white">Power Configuration</h2>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-3 gap-2">
        {MODES.map(m => (
          <button
            key={m.value}
            onClick={() => update({ mode: m.value })}
            className={`p-2 rounded-xl text-center transition-all border ${
              config.mode === m.value
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10'
            }`}
          >
            <div className="text-xs font-bold">{m.label}</div>
            <div className="text-[9px] mt-0.5 opacity-70">{m.desc}</div>
          </button>
        ))}
      </div>

      <div className="text-xs text-slate-400 bg-slate-900/50 p-3 rounded-lg border border-white/5">
        {config.mode === 'ac_fixed' && <p><strong>AC Fixed Mode:</strong> AC capacity remains constant and DC capacity is varied across the specified bucket range.</p>}
        {config.mode === 'dc_fixed' && <p><strong>DC Fixed Mode:</strong> DC capacity remains constant and AC capacity is varied across the specified bucket range.</p>}
        {config.mode === 'free' && <p><strong>Free Mode:</strong> Both DC and AC capacities are manually defined.</p>}
      </div>

      {/* Capacity inputs */}
      <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 space-y-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">DC Capacity</span>
            {config.mode === 'ac_fixed' && (
              <span className="text-[8px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full font-bold">DERIVED</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={config.dcCapacityMWp || ''}
              onChange={e => update({ dcCapacityMWp: parseFloat(e.target.value) || 0 })}
              onFocus={e => e.target.select()}
              className="bg-transparent text-right text-white w-20 font-mono text-lg font-bold outline-none focus:text-emerald-400 transition-colors"
              step="1"
              readOnly={config.mode === 'ac_fixed'}
            />
            <span className="text-slate-500 text-xs font-bold">MWp</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">AC Capacity</span>
            {config.mode === 'dc_fixed' && (
              <span className="text-[8px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full font-bold">DERIVED</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={config.acCapacityMWac || ''}
              onChange={e => update({ acCapacityMWac: parseFloat(e.target.value) || 0 })}
              onFocus={e => e.target.select()}
              className="bg-transparent text-right text-white w-20 font-mono text-lg font-bold outline-none focus:text-emerald-400 transition-colors"
              step="1"
              readOnly={config.mode === 'dc_fixed'}
            />
            <span className="text-slate-500 text-xs font-bold">MWac</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">DC/AC Ratio</span>
            {config.mode === 'free' && (
              <span className="text-[8px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full font-bold">DERIVED</span>
            )}
            {ratioWarning && (
              <span className="text-[9px] text-amber-400" title="Ratio outside typical 1.0–1.6 range">⚠</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={config.dcAcRatio || ''}
              onChange={e => update({ dcAcRatio: parseFloat(e.target.value) || 0 })}
              onFocus={e => e.target.select()}
              className={`bg-transparent text-right w-16 font-mono text-lg font-bold outline-none transition-colors ${
                ratioWarning ? 'text-amber-400' : 'text-emerald-400'
              }`}
              step="0.05"
              readOnly={config.mode === 'free'}
            />
            <span className="text-slate-500 text-xs font-bold">×</span>
          </div>
        </div>
        <div className="text-[10px] text-slate-500 text-right italic mt-2">
          Formula: DC/AC ratio = DC Capacity MWp / AC Capacity MWac
        </div>
      </div>

      {config.mode !== 'free' && (
        <p className="text-[10px] text-slate-500 italic leading-tight">
          The optimization will compare DC/AC ratios from 1.00× to 1.50× in 0.05 steps
          with {config.mode === 'ac_fixed' ? 'AC' : 'DC'} capacity held constant.
        </p>
      )}
    </div>
  );
};
