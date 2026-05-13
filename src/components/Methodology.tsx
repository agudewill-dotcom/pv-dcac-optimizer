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

          <Section title="Battery Storage (BESS)">
            BESS captures clipped energy (DC generation exceeding AC capacity) and stores it for dispatch
            during higher-price hours with available AC headroom.
            <br />• <strong>Charge:</strong> From hourly clipped energy, limited by BESS power rating and remaining capacity.
            <br />• <strong>Dispatch:</strong> During highest-price hours of the same day with AC export headroom.
            <br />• <strong>Losses:</strong> Round-trip efficiency applied (typically 85–90%).
            <br />• <strong>Degradation:</strong> BESS utilization scales with module degradation (less clipping → less charging in later years).
          </Section>

          {/* Data Sources */}
          <div className="border-t border-white/10 pt-4 mt-4">
            <h4 className="text-xs font-bold text-emerald-300 mb-3 uppercase tracking-wider">Data Sources & Assumptions</h4>

            <div className="space-y-2">
              <SourceRow
                parameter="Generation Profiles"
                source="Synthetic (Solar Geometry)"
                detail="Cooper equation for solar declination, hour angle, elevation at 52°N. Clear-sky Hottel airmass model. NOT from TMY or satellite data."
                quality="illustrative"
              />
              <SourceRow
                parameter="Monthly Clearness Index"
                source="German TMY literature"
                detail="Monthly Kt values: Jan 0.30, Feb 0.35, Mar 0.42, Apr 0.48, May 0.52, Jun 0.54, Jul 0.53, Aug 0.50, Sep 0.45, Oct 0.38, Nov 0.30, Dec 0.27."
                quality="representative"
              />
              <SourceRow
                parameter="Annual Yield Targets"
                source="Industry benchmarks"
                detail="South: 1050 kWh/kWp, EW: 970, SE/SW: 1020. Used to calibrate profile scaling."
                quality="representative"
              />
              <SourceRow
                parameter="Market Price Shape"
                source="Sample day-ahead curve"
                detail="Illustrative German day-ahead hourly shape with duck curve, seasonal modulation, and weekend discount. Replace with actual EPEX/SMARD data for project use."
                quality="illustrative"
              />
              <SourceRow
                parameter="Module Degradation"
                source="IEC 61215 / industry"
                detail="Default 0.4%/a linear. Tier-1 modules typically 0.3–0.5%/a."
                quality="standard"
              />
              <SourceRow
                parameter="Availability"
                source="Industry assumption"
                detail="Default 98%. Includes inverter downtime, grid curtailment, maintenance."
                quality="standard"
              />
              <SourceRow
                parameter="BESS Round-Trip Eff."
                source="Lithium-ion benchmark"
                detail="Default 88%. Grid-scale Li-ion systems typically 85–92%."
                quality="standard"
              />
              <SourceRow
                parameter="BESS CAPEX"
                source="BNEF / industry 2024"
                detail="Default: 250 k€/MWh storage + 150 k€/MW power electronics. Varies significantly by technology and project."
                quality="estimate"
              />
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 mt-4">
            <p className="text-amber-400/80 text-[10px] font-bold uppercase tracking-wider mb-1">Disclaimer</p>
            <p className="text-amber-400/60 text-[10px]">
              This tool provides a comparative pre-feasibility calculation. It does not replace a bankable yield
              assessment, detailed PVSyst simulation, grid connection study, or final investment model.
              Generation profiles are synthetic and illustrative. Price data may be sample-based.
              All data sources should be verified against project-specific conditions before investment decisions.
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

const QUALITY_COLORS: Record<string, string> = {
  illustrative: 'bg-amber-500/20 text-amber-300',
  representative: 'bg-blue-500/20 text-blue-300',
  standard: 'bg-emerald-500/20 text-emerald-300',
  estimate: 'bg-purple-500/20 text-purple-300',
};

const SourceRow: React.FC<{
  parameter: string; source: string; detail: string; quality: string;
}> = ({ parameter, source, detail, quality }) => (
  <div className="bg-slate-900/40 border border-white/5 rounded-lg p-2.5">
    <div className="flex items-center justify-between mb-1">
      <span className="text-[10px] font-bold text-slate-300">{parameter}</span>
      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${QUALITY_COLORS[quality] || QUALITY_COLORS.estimate}`}>
        {quality}
      </span>
    </div>
    <div className="text-[10px] text-emerald-400/80 font-bold mb-0.5">{source}</div>
    <div className="text-[9px] text-slate-500 leading-tight">{detail}</div>
  </div>
);
