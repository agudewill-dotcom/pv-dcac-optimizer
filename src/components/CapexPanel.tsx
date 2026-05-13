import React from 'react';
import { Calculator } from 'lucide-react';
import type { CapexConfig } from '../types';

interface Props {
  config: CapexConfig;
  onChange: (config: CapexConfig) => void;
}

export const CapexPanel: React.FC<Props> = ({ config, onChange }) => {
  const update = (key: keyof CapexConfig, value: number | boolean) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="glass-card p-5 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-slate-700/30 pb-4">
        <div className="flex items-center gap-2">
          <Calculator className="text-purple-400" size={20} />
          <h2 className="text-lg font-bold text-white">CAPEX / Economics</h2>
        </div>
        <button
          onClick={() => update('enabled', !config.enabled)}
          className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors ${
            config.enabled ? 'bg-purple-500' : 'bg-slate-700'
          }`}
        >
          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
            config.enabled ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </button>
      </div>

      {config.enabled && (
        <div className="bg-slate-900/40 p-3 rounded-xl border border-white/5 space-y-2 animate-fade-in">
          <Row label="CAPEX DC" value={(config.capexPerMWpDC / 1000).toFixed(0)} unit="k€/MWp"
            onChange={v => update('capexPerMWpDC', parseFloat(v) * 1000 || 0)} />
          <Row label="CAPEX AC" value={(config.capexPerMWacAC / 1000).toFixed(0)} unit="k€/MWac"
            onChange={v => update('capexPerMWacAC', parseFloat(v) * 1000 || 0)} />
          <Row label="OPEX" value={(config.opexPerMWYear / 1000).toFixed(1)} unit="k€/MW/yr"
            onChange={v => update('opexPerMWYear', parseFloat(v) * 1000 || 0)} />
          <Row label="Discount Rate" value={(config.discountRate * 100).toFixed(1)} unit="%"
            onChange={v => update('discountRate', parseFloat(v) / 100 || 0)} />

          <div className="border-t border-cyan-500/20 pt-2 mt-2">
            <div className="text-[9px] font-bold text-cyan-400/60 uppercase tracking-wider mb-2">BESS Economics</div>
            <Row label="BESS Storage" value={(config.bessCapexPerMWh / 1000).toFixed(0)} unit="k€/MWh"
              onChange={v => update('bessCapexPerMWh', parseFloat(v) * 1000 || 0)} />
            <Row label="BESS Power" value={(config.bessCapexPerMW / 1000).toFixed(0)} unit="k€/MW"
              onChange={v => update('bessCapexPerMW', parseFloat(v) * 1000 || 0)} />
          </div>
        </div>
      )}

      {!config.enabled && (
        <p className="text-[10px] text-slate-500 italic">
          Enable to add CAPEX, OPEX, NPV, and payback calculations.
        </p>
      )}
    </div>
  );
};

const Row: React.FC<{
  label: string; value: string; unit: string;
  onChange: (v: string) => void;
}> = ({ label, value, unit, onChange }) => (
  <div className="flex items-center justify-between border-b border-white/5 pb-1">
    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={e => e.target.select()}
        className="bg-transparent text-right text-white w-16 font-mono outline-none focus:text-purple-400 transition-colors text-sm"
        step="1"
      />
      <span className="text-slate-600 text-[10px] font-bold">{unit}</span>
    </div>
  </div>
);
