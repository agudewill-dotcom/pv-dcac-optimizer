import React from 'react';
import { Table } from 'lucide-react';
import type { ScenarioResult, RevenueMode } from '../types';

interface Props {
  scenarios: ScenarioResult[];
  selectedRatio: number;
  onSelectRatio: (ratio: number) => void;
  revenueMode: RevenueMode;
}

export const OptimizationTable: React.FC<Props> = ({ scenarios, selectedRatio, onSelectRatio, revenueMode }) => {
  if (scenarios.length === 0) return null;


  const fmtK = (n: number) => (n / 1000).toFixed(0) + 'k';
  const showMarket = revenueMode !== 'tariff';
  const showTariff = revenueMode !== 'market';

  return (
    <div className="glass-card overflow-hidden animate-fade-in">
      <div className="flex items-center gap-2 p-4 border-b border-slate-700/30">
        <Table className="text-slate-400" size={18} />
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">DC/AC Ratio Comparison</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-3 py-2 text-left text-slate-500 font-bold">DC/AC</th>
              <th className="px-3 py-2 text-right text-slate-500 font-bold">DC MWp</th>
              <th className="px-3 py-2 text-right text-slate-500 font-bold">AC MWac</th>
              <th className="px-3 py-2 text-right text-slate-500 font-bold">Gen. GWh</th>
              <th className="px-3 py-2 text-right text-slate-500 font-bold">Inj. GWh</th>
              <th className="px-3 py-2 text-right text-slate-500 font-bold">Clip %</th>
              {showMarket && <th className="px-3 py-2 text-right text-slate-500 font-bold">Rev. Market M€</th>}
              {showTariff && <th className="px-3 py-2 text-right text-slate-500 font-bold">Rev. Tariff M€</th>}
              {showMarket && <th className="px-3 py-2 text-right text-slate-500 font-bold">€/MWp</th>}
              <th className="px-3 py-2 text-right text-slate-500 font-bold">Marginal €/MWp</th>
              <th className="px-3 py-2 text-center text-slate-500 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map(s => {
              const isSelected = s.dcAcRatio === selectedRatio;
              return (
                <tr
                  key={s.dcAcRatio}
                  onClick={() => onSelectRatio(s.dcAcRatio)}
                  className={`cursor-pointer transition-colors border-b border-white/5 ${
                    isSelected
                      ? 'bg-emerald-500/10'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <td className={`px-3 py-2 font-bold font-mono ${isSelected ? 'text-emerald-400' : 'text-white'}`}>
                    {s.dcAcRatio.toFixed(2)}×
                  </td>
                  <td className="px-3 py-2 text-right text-slate-300 font-mono">{s.dcMWp.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right text-slate-300 font-mono">{s.acMWac.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right text-slate-300 font-mono">{(s.lifetimeGeneratedMWh / 1e6).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right text-slate-300 font-mono">{(s.lifetimeInjectedMWh / 1e6).toFixed(2)}</td>
                  <td className={`px-3 py-2 text-right font-mono font-bold ${
                    s.clippingPercent > 5 ? 'text-amber-400' : 'text-slate-300'
                  }`}>
                    {s.clippingPercent.toFixed(2)}%
                  </td>
                  {showMarket && (
                    <td className="px-3 py-2 text-right text-emerald-400 font-mono">
                      {(s.lifetimeRevenueMarket / 1e6).toFixed(2)}
                    </td>
                  )}
                  {showTariff && (
                    <td className="px-3 py-2 text-right text-blue-400 font-mono">
                      {(s.lifetimeRevenueTariff / 1e6).toFixed(2)}
                    </td>
                  )}
                  {showMarket && (
                    <td className="px-3 py-2 text-right text-slate-300 font-mono">
                      {fmtK(s.revenuePerMWpMarket)}
                    </td>
                  )}
                  <td className={`px-3 py-2 text-right font-mono ${
                    s.clippingWarning ? 'text-amber-400' : 'text-slate-400'
                  }`}>
                    {s.marginalRevenueMarket > 0 ? fmtK(s.marginalRevenueMarket) : '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {s.isOptimalTechnical && <Badge color="blue" text="Tech" />}
                      {s.isOptimalEconomic && <Badge color="emerald" text="Econ" />}
                      {s.isOptimalMarginal && <Badge color="purple" text="Marg" />}
                      {s.clippingWarning && <Badge color="amber" text="⚠" />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Badge: React.FC<{ color: string; text: string }> = ({ color, text }) => {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-500/20 text-emerald-300',
    blue: 'bg-blue-500/20 text-blue-300',
    amber: 'bg-amber-500/20 text-amber-300',
    purple: 'bg-purple-500/20 text-purple-300',
  };
  return (
    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${colors[color] || colors.blue}`}>
      {text}
    </span>
  );
};
