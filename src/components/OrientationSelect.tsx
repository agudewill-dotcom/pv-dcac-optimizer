import React from 'react';
import { Sun } from 'lucide-react';
import type { Orientation } from '../types';
import { getDailyPreviewProfile, getOrientationInfo } from '../engine/generationProfiles';

interface Props {
  orientation: Orientation;
  onChange: (orientation: Orientation) => void;
}

const ORIENTATIONS: Orientation[] = ['south', 'east_west', 'south_east', 'south_west'];

export const OrientationSelect: React.FC<Props> = ({ orientation, onChange }) => {
  return (
    <div className="glass-card p-5 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2 border-b border-slate-700/30 pb-4">
        <Sun className="text-amber-400" size={20} />
        <h2 className="text-lg font-bold text-white">Orientation / Layout</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {ORIENTATIONS.map(o => {
          const info = getOrientationInfo(o);
          const preview = getDailyPreviewProfile(o);
          const isActive = orientation === o;

          return (
            <button
              key={o}
              onClick={() => onChange(o)}
              className={`p-3 rounded-xl text-left transition-all border group ${
                isActive
                  ? 'bg-amber-500/10 border-amber-500/40'
                  : 'bg-slate-900/40 border-white/5 hover:border-white/10'
              }`}
            >
              <div className={`text-xs font-bold mb-1 ${isActive ? 'text-amber-300' : 'text-slate-300'}`}>
                {info.label}
              </div>

              {/* Mini sparkline */}
              <div className="h-8 flex items-end gap-[1px] mb-1.5">
                {preview.map((v, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-sm transition-all ${
                      isActive
                        ? 'bg-amber-400/60 group-hover:bg-amber-400/80'
                        : 'bg-slate-600/40 group-hover:bg-slate-500/50'
                    }`}
                    style={{ height: `${v * 100}%` }}
                  />
                ))}
              </div>

              <div className="text-[9px] text-slate-500 leading-tight">
                {info.peakCharacter} · ~{info.yieldKWhKWp} kWh/kWp
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-500 italic">
        Normalized illustrative profiles for comparative analysis. Not a bankable yield assessment.
      </p>
    </div>
  );
};
