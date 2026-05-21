import { useState, useMemo } from 'react';
import { Activity, Zap, DollarSign, BarChart3, BookOpen, Download, Target } from 'lucide-react';
import { ProjectSetup } from './components/ProjectSetup';
import { PowerConfigPanel } from './components/PowerConfig';
import { OrientationSelect } from './components/OrientationSelect';
import { OptimizationTable } from './components/OptimizationTable';
import { Methodology } from './components/Methodology';
import { ExecutiveSummary } from './components/ExecutiveSummary';
import { ProductionClipping } from './components/ProductionClipping';
import { RevenueLogic } from './components/RevenueLogic';
import { EconomicsScreening } from './components/EconomicsScreening';
import { Recommendation } from './components/Recommendation';
import { BessPanel } from './components/BessPanel';
import { runOptimization } from './engine/optimization';
import { getDefaultPriceProfile } from './engine/priceData';
import { exportResultsPDF } from './engine/pdfExport';
import { fetchPVGISProfile } from './engine/generationProfiles';
import type {
  ProjectConfig, PowerConfig, PriceConfig, CapexConfig, Orientation, GridConfig, ProductionCase, BessConfig
} from './types';
import {
  DEFAULT_PROJECT, DEFAULT_POWER, DEFAULT_PRICE, DEFAULT_CAPEX, DEFAULT_BESS, DEFAULT_GRID_CONFIG,
} from './types';

// ─── Tab definitions ────────────────────────────────────────────────────────
type TabId = 'summary' | 'setup' | 'technical' | 'production' | 'revenue' | 'economics' | 'scenarios' | 'recommendation' | 'methodology';

const TABS: { id: TabId; label: string; icon: any; short?: string; highlighted?: boolean }[] = [
  { id: 'setup', label: '1. Project Setup', short: 'Setup', icon: BookOpen },
  { id: 'technical', label: '2. Technical Config', short: 'Technical', icon: Zap },
  { id: 'production', label: '3. Production & Clipping', short: 'Production', icon: BarChart3 },
  { id: 'revenue', label: '4. Revenue Logic', short: 'Revenue', icon: DollarSign },
  { id: 'economics', label: '5. Economics / CAPEX', short: 'Economics', icon: Activity },
  { id: 'scenarios', label: '6. Scenario Comparison', short: 'Scenarios', icon: BarChart3 },
  { id: 'recommendation', label: '7. Recommendation', short: 'Recommend', icon: Activity },
  { id: 'methodology', label: '8. Methodology', short: 'Methodology', icon: BookOpen },
  { id: 'summary', label: '9. Executive Summary', short: 'Summary', icon: Target, highlighted: true },
];


const INITIAL_PRICE: PriceConfig = {
  ...DEFAULT_PRICE,
  priceProfile: getDefaultPriceProfile(),
};

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('setup');
  const [project, setProject] = useState<ProjectConfig>(DEFAULT_PROJECT);
  const [power, setPower] = useState<PowerConfig>(DEFAULT_POWER);
  const [orientation, setOrientation] = useState<Orientation>('south');
  const [price, setPrice] = useState<PriceConfig>(INITIAL_PRICE);
  const [capex, setCapex] = useState<CapexConfig>(DEFAULT_CAPEX);
  const [bess, setBess] = useState<BessConfig>(DEFAULT_BESS);
  const [grid, setGrid] = useState<GridConfig>(DEFAULT_GRID_CONFIG);
  const [selectedRatio, setSelectedRatio] = useState<number>(DEFAULT_POWER.dcAcRatio);
  const [productionCase, setProductionCase] = useState<ProductionCase>('p50');

  const [isFetchingPVGIS, setIsFetchingPVGIS] = useState(false);
  const [pvgisError, setPvgisError] = useState('');

  const handleFetchPVGIS = async () => {
    setIsFetchingPVGIS(true);
    setPvgisError('');
    try {
      const profile = await fetchPVGISProfile(project.lat, project.lon, orientation);
      setProject(prev => ({ ...prev, pvgisProfile: profile }));
    } catch (err: any) {
      setPvgisError(err.message || 'Failed to fetch from PVGIS');
    } finally {
      setIsFetchingPVGIS(false);
    }
  };

  // ─── Optimization Runner ──────────────────────────────────────────────────────
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
                <div className={`text-sm font-bold leading-none ${selected.p50.clippingPercent > 5 ? 'text-amber-400' : 'text-white'}`}>
                  {selected.p50.clippingPercent.toFixed(2)}%
                </div>
              </div>
              <div className="w-px h-8 bg-slate-700 hidden md:block" />
              <div className="text-right hidden md:block">
                <div className="text-[10px] font-bold text-slate-500 uppercase">FLH AC</div>
                <div className="text-sm font-bold text-white leading-none">
                  {selected.p50.fullLoadHoursAC.toLocaleString('de-DE', { maximumFractionDigits: 0 })} h
                </div>
              </div>
            </>
          )}
          {scenarios.length > 0 && (
            <>
              <div className="w-px h-8 bg-slate-700" />
              <button
                onClick={() => exportResultsPDF({
                  project, power, orientation, price, bess, grid, scenarios, selectedRatio,
                })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition-all text-xs font-bold"
                title="Download results as PDF"
              >
                <Download size={14} />
                <span className="hidden sm:inline">PDF</span>
              </button>
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
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/40 p-1 rounded-xl border border-white/5">
        <nav className="flex gap-1 w-full md:w-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                    : tab.highlighted
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <Icon size={14} />
                <span className="hidden sm:inline whitespace-nowrap">{tab.short || tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ─── Tab Content ──────────────────────────────────────────────────────── */}
      <div className="animate-fade-in" key={activeTab}>
        {scenarios.length === 0 && activeTab !== 'setup' && activeTab !== 'technical' && activeTab !== 'methodology' ? (
          <div className="glass-card p-12 text-center space-y-4 mt-8">
            <Activity className="mx-auto text-slate-600" size={40} />
            <div className="text-slate-400 font-bold text-lg">Configure your project</div>
            <p className="text-slate-500 text-sm">
              Enter valid DC and AC capacities in the Technical Config tab to generate results.
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'summary' && (
              <ExecutiveSummary scenarios={scenarios} selectedRatio={selectedRatio} />
            )}

            {activeTab === 'setup' && (
              <div className="space-y-6 mt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <BookOpen className="text-emerald-400" size={28} />
                    <h2 className="text-2xl font-black text-white tracking-tight">Project Setup</h2>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-xl border border-white/5">
                    <span className="text-xs font-bold text-slate-400 uppercase ml-2">Production Case:</span>
                    <select
                      value={productionCase}
                      onChange={(e) => setProductionCase(e.target.value as ProductionCase)}
                      className="bg-slate-800 border border-slate-700 text-white text-sm font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="p50">P50 Expected</option>
                      <option value="p90">P90 Conservative</option>
                      <option value="compare">Compare P50 vs P90</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ProjectSetup config={project} onChange={setProject} />
                  <div className="space-y-6">
                    <OrientationSelect orientation={orientation} onChange={setOrientation} />
                    <div className="glass-card p-4 border-blue-500/20 bg-blue-500/5 flex flex-col justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-blue-400">PVGIS 5.2 Integration</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {project.pvgisProfile 
                            ? '✓ Custom 8760h generation profile loaded for these coordinates and orientation.'
                            : 'Fetch real meteorological data based on your coordinates and orientation.'}
                        </p>
                        {pvgisError && <p className="text-xs text-red-400 mt-1">Error: {pvgisError}</p>}
                      </div>
                      <button
                        onClick={handleFetchPVGIS}
                        disabled={isFetchingPVGIS}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 w-full"
                      >
                        {isFetchingPVGIS ? 'Fetching...' : project.pvgisProfile ? 'Refetch Data' : 'Fetch PVGIS Data'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'technical' && (
              <div className="mt-8 space-y-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-6 mt-0">
                  <PowerConfigPanel config={power} onChange={setPower} />
                </div>
                <div className="space-y-6 mt-0">
                  <BessPanel config={bess} onChange={setBess} />
                </div>
              </div>
            )}

            {activeTab === 'production' && (
              <ProductionClipping 
                scenarios={scenarios} 
                selectedRatio={selectedRatio} 
                productionCase={productionCase} 
                orientation={orientation} 
                projectConfig={project}
              />
            )}

            {activeTab === 'revenue' && (
              <RevenueLogic priceConfig={price} onChange={setPrice} />
            )}

            {activeTab === 'economics' && (
              <EconomicsScreening 
                capexConfig={capex} 
                setCapex={setCapex} 
                gridConfig={grid} 
                setGrid={setGrid} 
                scenario={selected} 
                projectConfig={project}
              />
            )}

            {activeTab === 'scenarios' && (
              <div className="space-y-6 mt-8">
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 className="text-emerald-400" size={28} />
                  <h2 className="text-2xl font-black text-white tracking-tight">Scenario Comparison</h2>
                </div>
                <OptimizationTable
                  scenarios={scenarios}
                  selectedRatio={selectedRatio}
                  onSelectRatio={setSelectedRatio}
                  revenueMode={price.revenueMode}
                  productionCase={productionCase}
                />
              </div>
            )}

            {activeTab === 'recommendation' && (
              <Recommendation scenarios={scenarios} />
            )}

            {activeTab === 'methodology' && (
              <div className="mt-8">
                <Methodology />
              </div>
            )}
          </>
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
