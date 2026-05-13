import React from 'react';
import { Battery } from 'lucide-react';
import type { BessConfig, BessDuration } from '../types';

interface Props {
  config: BessConfig;
  onChange: (config: BessConfig) => void;
}

const DURATIONS: { value: BessDuration; label: string; desc: string }[] = [
  { value: 'none', label: 'No BESS', desc: 'Clipped energy is lost' },
  { value: '2h', label: '2h BESS', desc: 'Short-duration storage' },
  { value: '4h', label: '4h BESS', desc: 'Standard grid storage' },
];

export const BessPanel: React.FC<Props> = ({ config, onChange }) => {
  const update = (patch: Partial<BessConfig>) => {
    onChange({ ...config, ...patch });
  };

  const isActive = config.duration !== 'none';
  const durationHours = config.duration === '4h' ? 4 : config.duration === '2h' ? 2 : 0;
  const capacityMWh = isActive ? config.powerMW * durationHours : 0;

  return (
    <div className="glass-card p-5 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2 border-b border-slate-700/30 pb-4">
        <Battery className="text-cyan-400" size={20} />
        <h2 className="text-lg font-bold text-white">Battery Storage (BESS)</h2>
      </div>

      {/* Duration selector */}
      <div className="grid grid-cols-3 gap-2">
        {DURATIONS.map(d => (
          <button
            key={d.value}
            onClick={() => update({ duration: d.value })}
            className={`p-2.5 rounded-xl text-center transition-all border ${
              config.duration === d.value
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10'
            }`}
          >
            <div className="text-xs font-bold">{d.label}</div>
            <div className="text-[9px] mt-0.5 opacity-70">{d.desc}</div>
          </button>
        ))}
      </div>

      {isActive && (
        <div className="bg-slate-900/40 p-3 rounded-xl border border-white/5 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between border-b border-white/5 pb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Power Rating</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={config.powerMW || ''}
                onChange={e => update({ powerMW: parseFloat(e.target.value) || 0 })}
                onFocus={e => e.target.select()}
                className="bg-transparent text-right text-white w-16 font-mono outline-none focus:text-cyan-400 transition-colors"
                step="5"
              />
              <span className="text-slate-600 text-[10px] font-bold">MW</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-white/5 pb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Capacity</span>
            <span className="text-sm font-mono text-cyan-400 font-bold">{capacityMWh} MWh</span>
          </div>

          <div className="flex items-center justify-between border-b border-white/5 pb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Round-Trip Eff.</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={(config.roundTripEfficiency * 100).toFixed(0)}
                onChange={e => update({ roundTripEfficiency: (parseFloat(e.target.value) || 0) / 100 })}
                onFocus={e => e.target.select()}
                className="bg-transparent text-right text-white w-12 font-mono outline-none focus:text-cyan-400 transition-colors"
                step="1"
              />
              <span className="text-slate-600 text-[10px] font-bold">%</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Max Cycles/Day</span>
            <input
              type="number"
              value={config.maxCycles}
              onChange={e => update({ maxCycles: parseInt(e.target.value) || 1 })}
              onFocus={e => e.target.select()}
              className="bg-transparent text-right text-white w-12 font-mono outline-none focus:text-cyan-400 transition-colors"
              step="1"
              min={1}
              max={2}
            />
          </div>
        </div>
      )}

      {isActive && (
        <p className="text-[10px] text-cyan-400/60 italic leading-tight">
          BESS captures clipped energy and dispatches during highest-price hours with AC headroom.
          Capacity: {config.powerMW} MW × {durationHours}h = {capacityMWh} MWh.
        </p>
      )}
    </div>
  );
};
