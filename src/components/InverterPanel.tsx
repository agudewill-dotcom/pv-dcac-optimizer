import React, { useMemo } from 'react';
import { Cpu, AlertTriangle, CheckCircle, Info, Settings } from 'lucide-react';
import type { InverterConfig, InverterProduct, InverterResult } from '../types';
import { calculateInverterRequirements } from '../engine/inverterEngine';

interface Props {
  config: InverterConfig;
  onChange: (config: InverterConfig) => void;
  dcCapacityMWp: number;
  targetExportAcMW: number;
}

// ─── Default Products ────────────────────────────────────────────────────────

const SMA_DEFAULT: InverterProduct = {
  id: 'sma_default',
  manufacturer: 'SMA',
  productName: 'Sunny Central UP (placeholder)',
  unitAcCapacityMW: 4.6,
  maxDcAcOversizingRatio: 2.00,
  capexPerMWac: 45_000,
  notes: 'SMA products can be oversized up to 200%',
};

const HUAWEI_DEFAULT: InverterProduct = {
  id: 'huawei_default',
  manufacturer: 'Huawei',
  productName: 'SUN2000-330KTL (placeholder)',
  unitAcCapacityMW: 0.330,
  maxDcAcOversizingRatio: 1.33,
  capexPerMWac: 35_000,
  notes: 'Huawei products can be oversized up to 133%',
};

// ─── Component ───────────────────────────────────────────────────────────────

export const InverterPanel: React.FC<Props> = ({ config, onChange, dcCapacityMWp, targetExportAcMW }) => {
  // Find selected product
  const selectedProduct = config.products.find(p => p.id === config.selectedProductId) ?? config.products[0];

  // Calculate live results
  const result: InverterResult | null = useMemo(() => {
    if (!config.enabled || !selectedProduct || dcCapacityMWp <= 0 || targetExportAcMW <= 0) return null;
    try {
      return calculateInverterRequirements(dcCapacityMWp, targetExportAcMW, selectedProduct);
    } catch {
      return null;
    }
  }, [config.enabled, selectedProduct, dcCapacityMWp, targetExportAcMW]);

  // ── Helpers ──

  const updateConfig = (patch: Partial<InverterConfig>) => {
    onChange({ ...config, ...patch });
  };

  const updateProduct = (field: keyof InverterProduct, value: string | number) => {
    if (!selectedProduct) return;
    const updatedProduct = { ...selectedProduct, [field]: value };
    const updatedProducts = config.products.map(p =>
      p.id === selectedProduct.id ? updatedProduct : p
    );
    onChange({ ...config, products: updatedProducts });
  };

  const selectManufacturer = (preset: InverterProduct) => {
    // Check if the preset already exists in products
    const existingIndex = config.products.findIndex(p => p.id === preset.id);
    const products = [...config.products];
    if (existingIndex === -1) {
      products.push({ ...preset });
    } else {
      products[existingIndex] = { ...preset };
    }
    onChange({
      ...config,
      selectedProductId: preset.id,
      products,
    });
  };

  const isManufacturerSelected = (id: string) => config.selectedProductId === id;
  const isCustom = config.selectedProductId !== 'sma_default' && config.selectedProductId !== 'huawei_default';

  // ── Render ──

  return (
    <div className="glass-card p-5 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/30 pb-4">
        <div className="flex items-center gap-2">
          <Cpu className="text-cyan-400" size={20} />
          <h2 className="text-lg font-bold text-white">Inverter Manufacturer Constraints</h2>
        </div>
        <button
          onClick={() => updateConfig({ enabled: !config.enabled })}
          className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors ${
            config.enabled ? 'bg-cyan-500' : 'bg-slate-700'
          }`}
        >
          <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
            config.enabled ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </button>
      </div>

      {/* Disabled message */}
      {!config.enabled && (
        <p className="text-[10px] text-slate-500 italic">
          Enable to apply inverter manufacturer constraints and calculate required inverter capacity.
        </p>
      )}

      {config.enabled && (
        <div className="space-y-4 animate-fade-in">
          {/* Manufacturer selector */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Manufacturer</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => selectManufacturer(SMA_DEFAULT)}
                className={`p-2 rounded-xl text-center transition-all border ${
                  isManufacturerSelected('sma_default')
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                <div className="text-xs font-bold">SMA</div>
                <div className="text-[9px] mt-0.5 opacity-70">Sunny Central UP</div>
              </button>
              <button
                onClick={() => selectManufacturer(HUAWEI_DEFAULT)}
                className={`p-2 rounded-xl text-center transition-all border ${
                  isManufacturerSelected('huawei_default')
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                <div className="text-xs font-bold">Huawei</div>
                <div className="text-[9px] mt-0.5 opacity-70">SUN2000-330KTL</div>
              </button>
              <button
                onClick={() => {
                  if (!isCustom) {
                    // Create custom product based on current selection
                    const customProduct: InverterProduct = {
                      ...selectedProduct,
                      id: 'custom_' + Date.now(),
                      manufacturer: 'Custom',
                    };
                    onChange({
                      ...config,
                      selectedProductId: customProduct.id,
                      products: [...config.products, customProduct],
                    });
                  }
                }}
                className={`p-2 rounded-xl text-center transition-all border ${
                  isCustom
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                <div className="text-xs font-bold flex items-center justify-center gap-1">
                  <Settings size={11} />
                  Custom
                </div>
                <div className="text-[9px] mt-0.5 opacity-70">User-defined</div>
              </button>
            </div>
          </div>

          {/* Editable product fields */}
          {selectedProduct && (
            <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 space-y-3">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Product Configuration
              </div>

              {/* Product Name */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Product Name</span>
                <input
                  type="text"
                  value={selectedProduct.productName}
                  onChange={e => updateProduct('productName', e.target.value)}
                  className="bg-slate-900 text-white border border-white/10 rounded-lg px-3 py-1.5 text-sm text-right w-48 outline-none focus:border-cyan-500/40 transition-colors"
                />
              </div>

              {/* Unit AC Capacity */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unit AC Capacity</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={selectedProduct.unitAcCapacityMW || ''}
                    onChange={e => updateProduct('unitAcCapacityMW', parseFloat(e.target.value) || 0)}
                    onFocus={e => e.target.select()}
                    className="bg-slate-900 text-white border border-white/10 rounded-lg px-3 py-1.5 text-sm text-right w-24 outline-none focus:border-cyan-500/40 transition-colors"
                    step="0.01"
                  />
                  <span className="text-slate-500 text-[10px] font-bold">MW</span>
                </div>
              </div>

              {/* Max DC Oversizing Ratio */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Max DC Oversizing Ratio</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={selectedProduct.maxDcAcOversizingRatio.toFixed(2)}
                    onChange={e => updateProduct('maxDcAcOversizingRatio', parseFloat(e.target.value) || 0)}
                    onFocus={e => e.target.select()}
                    className="bg-slate-900 text-white border border-white/10 rounded-lg px-3 py-1.5 text-sm text-right w-24 outline-none focus:border-cyan-500/40 transition-colors"
                    step="0.01"
                  />
                  <span className="text-slate-500 text-[10px] font-bold">×</span>
                </div>
              </div>

              {/* CAPEX per MWac */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">CAPEX per MWac</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={((selectedProduct.capexPerMWac ?? 0) / 1000).toFixed(0)}
                    onChange={e => updateProduct('capexPerMWac', (parseFloat(e.target.value) || 0) * 1000)}
                    onFocus={e => e.target.select()}
                    className="bg-slate-900 text-white border border-white/10 rounded-lg px-3 py-1.5 text-sm text-right w-24 outline-none focus:border-cyan-500/40 transition-colors"
                    step="1"
                  />
                  <span className="text-slate-500 text-[10px] font-bold">k€/MWac</span>
                </div>
              </div>

              {/* Notes */}
              {selectedProduct.notes && (
                <div className="flex items-start gap-2 pt-1">
                  <Info className="text-slate-500 mt-0.5 shrink-0" size={12} />
                  <span className="text-[10px] text-slate-500 italic leading-relaxed">{selectedProduct.notes}</span>
                </div>
              )}
            </div>
          )}

          {/* Compare Manufacturers toggle */}
          <div className="flex items-center justify-between bg-slate-900/40 p-3 rounded-xl border border-white/5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Compare all manufacturers</span>
            <button
              onClick={() => updateConfig({ compareManufacturers: !config.compareManufacturers })}
              className={`w-9 h-4.5 rounded-full p-0.5 cursor-pointer transition-colors ${
                config.compareManufacturers ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
              style={{ width: '36px', height: '18px' }}
            >
              <div
                className={`bg-white rounded-full transition-transform`}
                style={{ width: '14px', height: '14px', transform: config.compareManufacturers ? 'translateX(18px)' : 'translateX(0px)' }}
              />
            </button>
          </div>

          {/* Live calculation outputs */}
          {result && (
            <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 space-y-3">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Inverter Sizing Results
              </div>

              <ResultRow label="Project DC/Export AC Ratio" value={result.projectDcExportRatio.toFixed(2)} unit="×" />
              <ResultRow label="Required Installed Inverter AC" value={result.requiredInverterAcMW.toFixed(2)} unit="MWac" />
              <ResultRow label="Number of Inverter Units" value={result.numberOfUnits.toString()} unit="units" />
              <ResultRow label="Actual Installed Inverter AC" value={result.actualInstalledInverterAcMW.toFixed(2)} unit="MWac" />
              <ResultRow
                label="Inverter DC/AC Loading Ratio"
                value={result.inverterLoadingRatio.toFixed(2)}
                unit="×"
                valueColor={result.isFeasible ? 'text-emerald-400' : 'text-red-400'}
              />
              <ResultRow
                label="Additional Inverter AC Above Export"
                value={result.additionalInverterAcMW.toFixed(2)}
                unit="MWac"
                valueColor={result.additionalInverterAcMW > 0 ? 'text-amber-400' : 'text-slate-300'}
              />
              <ResultRow
                label="Estimated Inverter CAPEX"
                value={(result.inverterCapex / 1000).toFixed(0)}
                unit="k€"
              />

              {/* Feasibility badge */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Feasibility Status</span>
                <FeasibilityBadge status={result.feasibilityStatus} message={result.statusMessage} />
              </div>
            </div>
          )}

          {/* Warnings */}
          {result && result.additionalInverterAcMW > 0 && result.isFeasible && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={14} />
              <span className="text-xs text-amber-400 leading-relaxed">
                Installed inverter capacity ({result.actualInstalledInverterAcMW.toFixed(2)} MWac) exceeds export
                capacity ({result.targetExportAcMW.toFixed(2)} MWac). Export will be limited to the target AC
                capacity, but CAPEX is based on installed inverter capacity.
              </span>
            </div>
          )}

          {result && !result.isFeasible && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={14} />
              <span className="text-xs text-red-400 leading-relaxed">
                Inverter loading ratio ({result.inverterLoadingRatio.toFixed(2)}×) exceeds manufacturer
                maximum ({selectedProduct.maxDcAcOversizingRatio.toFixed(2)}×). Configuration not feasible.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const ResultRow: React.FC<{
  label: string;
  value: string;
  unit: string;
  valueColor?: string;
}> = ({ label, value, unit, valueColor = 'text-white' }) => (
  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
    <div className="flex items-center gap-1.5">
      <span className={`text-lg font-bold font-mono ${valueColor}`}>{value}</span>
      <span className="text-slate-600 text-[10px] font-bold">{unit}</span>
    </div>
  </div>
);

const FeasibilityBadge: React.FC<{
  status: InverterResult['feasibilityStatus'];
  message: string;
}> = ({ status, message }) => {
  const styles: Record<typeof status, { bg: string; border: string; text: string; Icon: typeof CheckCircle }> = {
    feasible: {
      bg: 'bg-emerald-400/10',
      border: 'border-emerald-400/30',
      text: 'text-emerald-400',
      Icon: CheckCircle,
    },
    feasible_additional_capacity: {
      bg: 'bg-amber-400/10',
      border: 'border-amber-400/30',
      text: 'text-amber-400',
      Icon: AlertTriangle,
    },
    not_feasible: {
      bg: 'bg-red-400/10',
      border: 'border-red-400/30',
      text: 'text-red-400',
      Icon: AlertTriangle,
    },
  };

  const s = styles[status];
  const Icon = s.Icon;

  const labels: Record<typeof status, string> = {
    feasible: 'Feasible',
    feasible_additional_capacity: 'Feasible + Add. Capacity',
    not_feasible: 'Not Feasible',
  };

  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border inline-flex items-center gap-1 ${s.bg} ${s.border} ${s.text}`}
      title={message}
    >
      <Icon size={10} />
      {labels[status]}
    </span>
  );
};
