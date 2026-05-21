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

  const handlePasteCoords = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const paste = e.clipboardData.getData('text');
    // Match "lat, lon" or "lat,lon" or "lat lon"
    const match = paste.match(/^(-?\d+(?:\.\d+)?)(?:,|\s)+(-?\d+(?:\.\d+)?)$/);
    if (match) {
      e.preventDefault();
      onChange({
        ...config,
        lat: parseFloat(match[1]),
        lon: parseFloat(match[2]),
      });
    }
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
          <div className="flex gap-2">
            <div className="flex flex-col gap-1 w-1/2">
              <label className="label-premium">Latitude</label>
              <input
                type="number"
                value={config.lat}
                onChange={e => update('lat', parseFloat(e.target.value) || 0)}
                onFocus={e => e.target.select()}
                onPaste={handlePasteCoords}
                className="input-premium text-sm h-[38px] text-center"
                step="any"
              />
            </div>
            <div className="flex flex-col gap-1 w-1/2">
              <label className="label-premium">Longitude</label>
              <input
                type="number"
                value={config.lon}
                onChange={e => update('lon', parseFloat(e.target.value) || 0)}
                onFocus={e => e.target.select()}
                className="input-premium text-sm h-[38px] text-center"
                step="any"
              />
            </div>
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
          <Row label="P90 Ratio" unit="%"
            value={(config.p90Ratio * 100).toFixed(1)}
            onChange={v => update('p90Ratio', parseFloat(v) / 100 || 0.90)}
          />
        </div>

        {/* Custom P50/P90 Upload */}
        <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">P50/P90 Profiles</span>
            {config.customP50Profile && config.customP90Profile ? (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">Custom CSV Loaded</span>
            ) : (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">Approximated</span>
            )}
          </div>
          {!config.customP50Profile ? (
            <p className="text-[10px] text-slate-500 leading-tight">
              P90 is currently approximated using the P90 Ratio scalar above. Replace with project-specific PVSyst P50/P90 profiles for bankable assessment.
            </p>
          ) : null}
          <div className="flex gap-2 items-center">
            <label className="flex-1 cursor-pointer bg-slate-800 hover:bg-slate-700 transition-colors rounded p-2 text-center border border-slate-700">
              <span className="text-[10px] font-bold text-slate-300">Upload CSV (P50, P90 MW)</span>
              <input type="file" accept=".csv" className="hidden" onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                if (lines.length < 8760) return alert('CSV must contain at least 8760 hours of data.');
                
                const p50: number[] = [];
                const p90: number[] = [];
                // Assuming CSV format: timestamp, p50_MW, p90_MW (skip header if present)
                let startIdx = isNaN(parseFloat(lines[0].split(',')[1])) ? 1 : 0;
                for (let i = startIdx; i < startIdx + 8760; i++) {
                  const cols = lines[i].split(',');
                  p50.push(parseFloat(cols[1]) || 0);
                  p90.push(parseFloat(cols[2]) || 0);
                }
                onChange({ ...config, customP50Profile: p50, customP90Profile: p90 });
              }} />
            </label>
            {(config.customP50Profile || config.customP90Profile) && (
              <button 
                onClick={() => onChange({ ...config, customP50Profile: undefined, customP90Profile: undefined })}
                className="px-2 py-2 text-[10px] font-bold text-rose-400 bg-rose-400/10 hover:bg-rose-400/20 rounded border border-rose-400/30 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
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
