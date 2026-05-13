import React from 'react';
import { Settings } from 'lucide-react';
import type { ProjectConfig } from '../types';

interface Props {
  config: ProjectConfig;
  onChange: (config: ProjectConfig) => void;
}

export const ProjectSetup: React.FC<Props> = ({ config, onChange }) => {
  const update = (key: keyof ProjectConfig, value: string | number) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="glass-card p-5 space-y-5 animate-fade-in">
      <div className="flex items-center gap-2 border-b border-slate-700/30 pb-4">
        <Settings className="text-emerald-400" size={20} />
        <h2 className="text-lg font-bold text-white">Project Setup</h2>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-1">
          <label className="label-premium">Project Name</label>
          <input
            type="text"
            value={config.name}
            onChange={e => update('name', e.target.value)}
            className="input-premium text-sm"
            placeholder="My PV Project"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="label-premium">Country</label>
            <select
              value={config.country}
              onChange={e => update('country', e.target.value)}
              className="input-premium text-sm h-[38px]"
            >
              <option value="Germany">Germany</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="label-premium">Lifetime</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={config.lifetimeYears}
                onChange={e => update('lifetimeYears', parseInt(e.target.value) || 0)}
                onFocus={e => e.target.select()}
                className="input-premium text-sm w-full"
                min={1}
                max={40}
              />
              <span className="text-slate-500 text-xs font-bold shrink-0">yrs</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/40 p-3 rounded-xl border border-white/5 space-y-2">
          <Row label="Degradation" unit="%/a"
            value={(config.degradationRate * 100).toFixed(2)}
            onChange={v => update('degradationRate', parseFloat(v) / 100 || 0)}
            warn={config.degradationRate > 0.01}
            warnText="Unusually high degradation rate"
          />
          <Row label="Availability" unit="%"
            value={(config.availabilityFactor * 100).toFixed(1)}
            onChange={v => update('availabilityFactor', parseFloat(v) / 100 || 0)}
          />
          <Row label="Curtailment" unit="%"
            value={(config.curtailmentFactor * 100).toFixed(1)}
            onChange={v => update('curtailmentFactor', parseFloat(v) / 100 || 0)}
          />
        </div>
      </div>
    </div>
  );
};

// ─── Reusable row component ──────────────────────────────────────────────────
const Row: React.FC<{
  label: string; unit: string; value: string;
  onChange: (v: string) => void;
  warn?: boolean; warnText?: string;
}> = ({ label, unit, value, onChange, warn, warnText }) => (
  <div className="flex items-center justify-between border-b border-white/5 pb-1">
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      {warn && <span className="text-[9px] text-amber-400" title={warnText}>⚠</span>}
    </div>
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={e => e.target.select()}
        className="bg-transparent text-right text-white w-16 font-mono outline-none focus:text-emerald-400 transition-colors text-sm"
        step="0.1"
      />
      <span className="text-slate-600 text-[10px] font-bold w-6">{unit}</span>
    </div>
  </div>
);
