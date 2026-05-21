import React from 'react';
import { BookOpen } from 'lucide-react';

export const Methodology: React.FC = () => {
  return (
    <div className="glass-card animate-fade-in mt-8">
      <div className="flex items-center gap-2 p-4 border-b border-white/5">
        <BookOpen className="text-slate-400" size={18} />
        <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          Methodology & Assumptions
        </span>
      </div>

      <div className="px-5 pt-4 text-sm text-slate-300 leading-relaxed mb-6">
        <h3 className="text-sm font-bold text-white mb-2">Tool Scope & Limitations</h3>
        <p className="mb-4">
          This tool is a pre-feasibility and scenario comparison tool for PV DC/AC configurations and grid connection strategy.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">It evaluates:</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-xs">
              <li>DC capacity, AC capacity, and DC/AC ratio</li>
              <li>Clipping losses</li>
              <li>Orientation profiles</li>
              <li>P50 / P90 production cases</li>
              <li>Module degradation</li>
              <li>Market price or feed-in tariff revenue</li>
              <li>Capture price and cannibalization effects</li>
              <li>Simplified CAPEX assumptions</li>
              <li>Marginal revenue and marginal CAPEX</li>
              <li>Recommended DC/AC bucket</li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">It does not replace:</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-xs">
              <li>Bankable yield assessment</li>
              <li>PVSyst simulation</li>
              <li>Detailed grid connection study</li>
              <li>EPC cost estimate</li>
              <li>Full project financial model</li>
              <li>Tax and financing model</li>
              <li>Final investment decision</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-4 border-b border-white/5 border-t mt-4">
        <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          Formulas & Logic
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 px-5 pb-5 text-xs text-slate-400 pt-4 leading-relaxed">
          <Section title="P50 / P90 Methodology">
            The optimization engine runs a dual-pass simulation for every DC/AC ratio using both P50 (expected) and P90 (conservative) production assumptions.
            A 'Robust' recommendation is identified by verifying that the selected optimum does not suffer severe performance drops in the P90 case.
          </Section>

          <Section title="Clipping Formula">
            <span className="font-mono text-[10px] bg-slate-800 px-1 py-0.5 rounded text-amber-300">Clipped Power = max(Generated Power − AC Capacity, 0)</span><br/>
            When instantaneous DC generation exceeds the AC export limit, the excess energy is curtailed. This typically occurs during midday in summer.
          </Section>

          <Section title="Module Degradation">
            <span className="font-mono text-[10px] bg-slate-800 px-1 py-0.5 rounded text-blue-300">Gen(year n) = Gen(year 1) × (1 − degradation rate)^(n−1)</span><br/>
            As modules degrade over the project lifetime, clipping naturally decreases. The economic screening accounts for this lifetime degradation.
          </Section>

          <Section title="Revenue Formula">
            <span className="font-mono text-[10px] bg-slate-800 px-1 py-0.5 rounded text-emerald-300">Revenue = Σ(Injected Energy[t] × Price[t])</span><br/>
            Only injected energy after clipping is monetized. For market pricing, this captures the cannibalization effect where prices drop during peak solar generation.
          </Section>

          <Section title="Capture Price & Cannibalization">
            <span className="font-mono text-[10px] bg-slate-800 px-1 py-0.5 rounded text-indigo-300">Capture Price = Total Market Revenue / Total Injected Energy</span><br/>
            The capture price is the volume-weighted average price. Higher DC/AC ratios push more volume into off-peak hours, which can slightly stabilize capture prices.
          </Section>

          <Section title="CAPEX Screening Formula">
            <span className="font-mono text-[10px] bg-slate-800 px-1 py-0.5 rounded text-purple-300">Marginal CAPEX = Δ DC_Capacity × CAPEX_Per_MWp_DC</span><br/>
            The economic screening evaluates the capital efficiency of adding more DC modules to a fixed AC grid connection. It calculates whether the marginal revenue pays back the marginal CAPEX.
          </Section>
      </div>

      <div className="md:col-span-2 border-t border-white/10 pt-4 mt-2 px-5 pb-5">
        <h4 className="text-xs font-bold text-emerald-300 mb-3 uppercase tracking-wider">Data Source Explanations</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5">
            <h5 className="font-bold text-slate-300 text-xs mb-1">Price Data Methodology</h5>
            <p className="text-xs text-slate-400">
              The built-in sample price profile uses 2024 Day-Ahead auction prices for the DE-LU bidding zone from SMARD.de.
              It is illustrative and contains negative prices. Users must upload custom CSV price curves for accurate screening.
            </p>
          </div>
          <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5">
            <h5 className="font-bold text-slate-300 text-xs mb-1">Generation Profiles</h5>
            <p className="text-xs text-slate-400">
              Default profiles are synthetic standard curves based on solar geometry. Users can fetch live data from PVGIS 5.2 or upload custom 8760h yield profiles (e.g., from PVSyst) to ensure bankability.
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 mt-2">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <p className="text-amber-400 font-bold uppercase tracking-wider text-xs mb-1">Disclaimer</p>
          <p className="text-amber-300/80 text-xs">
            This tool provides a comparative pre-feasibility and scenario screening calculation. It does not replace a bankable yield assessment, PVSyst simulation, detailed grid connection study, EPC cost estimate, full project financial model or final investment decision.
          </p>
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-slate-900/40 p-3 rounded-lg border border-white/5">
    <h4 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">{title}</h4>
    <p>{children}</p>
  </div>
);
