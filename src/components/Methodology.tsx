import React, { useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';

export const Methodology: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass-card animate-fade-in">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left group"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="text-slate-400" size={18} />
          <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Methodology & Calculation Logic
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 text-xs text-slate-400 space-y-4 border-t border-white/5 pt-4 leading-relaxed">
          <Section title="DC Capacity (MWp)">
            Installed peak power of the PV module array under Standard Test Conditions (STC, 1000 W/m², 25°C).
            This determines the maximum possible DC-side generation.
          </Section>

          <Section title="AC Capacity (MWac)">
            Maximum power export capacity, limited by the inverter and grid connection infrastructure.
            All instantaneous DC generation exceeding this limit is clipped (curtailed).
          </Section>

          <Section title="DC/AC Ratio">
            DC Capacity / AC Capacity. A ratio of 1.25 means 25% more DC capacity than AC export capacity.
            Higher ratios increase AC infrastructure utilization but cause clipping during peak hours.
          </Section>

          <Section title="Clipping">
            When instantaneous DC generation exceeds AC capacity, the excess energy is lost.
            Clipped Energy = max(DC Power − AC Capacity, 0) at each timestep.
            Clipping typically occurs during midday in summer for south-facing systems.
          </Section>

          <Section title="Generation Profiles">
            Synthetic hourly profiles (8,760 hours/year) based on solar geometry at 52°N (Central Germany).
            Accounts for seasonal day length, solar elevation, atmospheric clearness indices, and array tilt/azimuth.
            East-West layouts produce flatter curves with less clipping risk.
          </Section>

          <Section title="Degradation">
            Annual reduction in module performance. Applied per year:
            Generation(year n) = Generation(year 1) × (1 − degradation rate)^(n−1).
            As modules degrade, clipping may decrease in later years.
          </Section>

          <Section title="Market Price Revenue">
            Revenue = Σ(injected_energy[t] × price[t]) for each hourly timestep.
            Captures the duck-curve effect: solar generation peaks when prices are often suppressed.
            Market-value weighted price = Total Revenue / Total Injected Energy.
          </Section>

          <Section title="Fixed Tariff Revenue">
            Revenue = Total Injected Energy × Fixed Tariff (EUR/MWh).
            Each MWh has equal value regardless of timing.
          </Section>

          <Section title="Optimal DC/AC Ratio">
            The optimal ratio balances additional energy capture against clipping losses.
            <br />• <strong>Technical optimum:</strong> Lowest clipping percentage (ratio = 1.00).
            <br />• <strong>Economic optimum:</strong> Highest total lifetime revenue.
            <br />• <strong>Marginal optimum:</strong> Highest incremental revenue per additional MWp DC.
            <br /><br />
            When marginal DC capacity creates mostly clipped energy, further DC oversizing is uneconomical.
          </Section>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 mt-4">
            <p className="text-amber-400/80 text-[10px] font-bold uppercase tracking-wider mb-1">Disclaimer</p>
            <p className="text-amber-400/60 text-[10px]">
              This tool provides a comparative pre-feasibility calculation. It does not replace a bankable yield
              assessment, detailed PVSyst simulation, grid connection study, or final investment model.
              Generation profiles are synthetic and illustrative. Price data may be sample-based.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4 className="text-xs font-bold text-slate-300 mb-1">{title}</h4>
    <p>{children}</p>
  </div>
);
