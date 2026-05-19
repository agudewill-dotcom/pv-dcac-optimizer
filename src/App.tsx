import { useState, useMemo } from 'react';
import { Activity, Zap, DollarSign, BarChart3, BookOpen } from 'lucide-react';
import { ProjectSetup } from './components/ProjectSetup';
import { PowerConfigPanel } from './components/PowerConfig';
import { OrientationSelect } from './components/OrientationSelect';
import { PriceConfigPanel } from './components/PriceConfig';
import { CapexPanel } from './components/CapexPanel';
import { BessPanel } from './components/BessPanel';
import { ResultsDashboard } from './components/ResultsDashboard';
import { OptimizationTable } from './components/OptimizationTable';
import { ProfileChart, ClippingChart, RevenueChart, GenerationChart } from './components/Charts';
import { Methodology } from './components/Methodology';
import { GridConnectionPanel } from './components/GridConnectionPanel';
import { runOptimization } from './engine/optimization';
import { generateSamplePriceProfile } from './engine/priceData';
import type {
  ProjectConfig, PowerConfig, PriceConfig, CapexConfig, BessConfig, Orientation,
} from './types';
import {
  DEFAULT_PROJECT, DEFAULT_POWER, DEFAULT_PRICE, DEFAULT_CAPEX, DEFAULT_BESS,
} from './types';

// ─── Tab definitions ────────────────────────────────────────────────────────
type TabId = 'design' | 'revenue' | 'results' | 'methodology';

const TABS: { id: TabId; label: string; icon: typeof Zap }[] = [
  { id: 'design', label: 'System Design', icon: Zap },
  { id: 'revenue', label: 'Revenue & Storage', icon: DollarSign },
  { id: 'results', label: 'Results', icon: BarChart3 },
  { id: 'methodology', label: 'Methodology', icon: BookOpen },
];

// ─── Initialize price data ──────────────────────────────────────────────────
const INITIAL_PRICE: PriceConfig = {
  ...DEFAULT_PRICE,
  priceProfile: generateSamplePriceProfile(),
};

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('design');
  const [project, setProject] = useState<ProjectConfig>(DEFAULT_PROJECT);
  const [power, setPower] = useState<PowerConfig>(DEFAULT_POWER);
  const [orientation, setOrientation] = useState<Orientation>('south');
  const [price, setPrice] = useState<PriceConfig>(INITIAL_PRICE);
  const [capex, setCapex] = useState<CapexConfig>(DEFAULT_CAPEX);
  const [bess, setBess] = useState<BessConfig>(DEFAULT_BESS);
  const [selectedRatio, setSelectedRatio] = useState<number>(DEFAULT_POWER.dcAcRatio);

  // ─── Run optimization ──────────────────────────────────────────────────────
  const scenarios = useMemo(() => {
    try {
      if (power.dcCapacityMWp <= 0 || power.acCapacityMWac <= 0) return [];
      return runOptimization(project, power, orientation, price, capex, bess);
    } catch (err) {
      console.error('Optimization error:', err);
      return [];
    }
  }, [project, power, orientation, price, capex, bess]);

  // ─── Validation warnings ───────────────────────────────────────────────────
  const warnings: string[] = [];
  if (power.dcCapacityMWp <= 0) warnings.push('DC capacity must be > 0.');
  if (power.acCapacityMWac <= 0) warnings.push('AC capacity must be > 0.');
  if (power.dcAcRatio < 1.0) warnings.push('DC/AC ratio < 1.0 is unusual for utility-scale PV.');
  if (power.dcAcRatio > 1.6) warnings.push('DC/AC ratio > 1.6 will cause very high clipping losses.');
  if (project.degradationRate > 0.01) warnings.push('Degradation rate above 1%/a is unusually high.');

  const selected = scenarios.find(s => s.dcAcRatio === selectedRatio) || scenarios[0] || null;
  const showMarket = price.revenueMode !== 'tariff';
  const showTariff = price.revenueMode !== 'market';

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-6 max-w-[1400px] mx-auto bg-slate-950">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span className="bg-emerald-500 w-3 h-10 rounded-full inline-block"></span>
            DC/AC Ratio Optimizer
          </h1>
          <p className="text-slate-400 font-medium text-sm">
            Utility-Scale PV — Clipping, Revenue & Oversizing Analysis
          </p>
        </div>
        {/* Persistent status bar */}
        <div className="flex items-center gap-4 bg-slate-900/40 p-3 rounded-xl border border-white/5">
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Ratio</div>
            <div className="text-lg font-bold text-emerald-400 leading-none">
              {selectedRatio.toFixed(2)}×
            </div>
          </div>
          <div className="w-px h-8 bg-slate-700" />
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Config</div>
            <div className="text-sm font-bold text-white leading-none">
              {power.dcCapacityMWp} / {power.acCapacityMWac}
            </div>
            <div className="text-[9px] text-slate-500">MWp / MWac</div>
          </div>
          {selected && (
            <>
              <div className="w-px h-8 bg-slate-700" />
              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Clipping</div>
                <div className={`text-sm font-bold leading-none ${selected.clippingPercent > 5 ? 'text-amber-400' : 'text-white'}`}>
                  {selected.clippingPercent.toFixed(2)}%
                </div>
              </div>
              <div className="w-px h-8 bg-slate-700 hidden md:block" />
              <div className="text-right hidden md:block">
                <div className="text-[10px] font-bold text-slate-500 uppercase">FLH AC</div>
                <div className="text-sm font-bold text-white leading-none">
                  {selected.fullLoadHoursAC.toLocaleString('de-DE', { maximumFractionDigits: 0 })} h
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-1">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-300">⚠ {w}</p>
          ))}
        </div>
      )}

      {/* Tab Navigation */}
      <nav className="flex gap-1 bg-slate-900/40 p-1 rounded-xl border border-white/5">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                isActive
                  ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ─── Tab Content ──────────────────────────────────────────────────────── */}
      <div className="animate-fade-in" key={activeTab}>
        {/* System Design Tab */}
        {activeTab === 'design' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ProjectSetup config={project} onChange={setProject} />
              <PowerConfigPanel config={power} onChange={setPower} />
            </div>
            <OrientationSelect orientation={orientation} onChange={setOrientation} />
          </div>
        )}

        {/* Revenue & Storage Tab */}
        {activeTab === 'revenue' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PriceConfigPanel config={price} onChange={setPrice} />
              <BessPanel config={bess} onChange={setBess} />
            </div>
            <CapexPanel config={capex} onChange={setCapex} />
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            {scenarios.length === 0 ? (
              <div className="glass-card p-12 text-center space-y-4">
                <Activity className="mx-auto text-slate-600" size={40} />
                <div className="text-slate-400 font-bold text-lg">Configure your project</div>
                <p className="text-slate-500 text-sm">
                  Enter valid DC and AC capacities in the System Design tab to generate results.
                </p>
              </div>
            ) : (
              <>
                <ResultsDashboard
                  scenarios={scenarios}
                  selectedRatio={selectedRatio}
                  revenueMode={price.revenueMode}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ProfileChart orientation={orientation} />
                  <GenerationChart scenario={selected} />
                  <ClippingChart scenarios={scenarios} />
                  <RevenueChart scenarios={scenarios} showMarket={showMarket} showTariff={showTariff} />
                </div>
                <OptimizationTable
                  scenarios={scenarios}
                  selectedRatio={selectedRatio}
                  onSelectRatio={setSelectedRatio}
                  revenueMode={price.revenueMode}
                />
                <GridConnectionPanel acCapacityMWac={power.acCapacityMWac} />
              </>
            )}
          </div>
        )}

        {/* Methodology Tab */}
        {activeTab === 'methodology' && (
          <Methodology />
        )}
      </div>

      {/* Footer */}
      <footer className="pt-8 border-t border-white/5 text-center text-slate-500 text-xs">
        &copy; 2026 DC/AC Ratio Optimizer — Pre-Feasibility Decision Support Tool
      </footer>
    </div>
  );
}

export default App;
