export type OptimizationMode = 'ac_fixed' | 'dc_fixed' | 'free';
export type RevenueMode = 'market' | 'tariff' | 'hybrid';
export type Orientation = 'south' | 'east_west' | 'south_east' | 'south_west';
export type BessDuration = 'none' | '2h' | '4h';
export type ProductionCase = 'p50' | 'p90' | 'compare';

export interface ProjectConfig {
  name: string;
  country: string;
  lat: number;                   // Latitude for PVGIS
  lon: number;                   // Longitude for PVGIS
  lifetimeYears: number;
  degradationRate: number;       // e.g. 0.004 = 0.4%/a
  availabilityFactor: number;    // e.g. 0.98 = 98%
  curtailmentFactor: number;     // e.g. 0.0 = 0%
  pvgisProfile?: number[];       // Optional fetched PVGIS profile (8760h)
  p90Ratio: number;              // e.g. 0.90
  customP50Profile?: number[];   // Uploaded P50
  customP90Profile?: number[];   // Uploaded P90
}

// ─── Power Configuration ─────────────────────────────────────────────────────
export interface PowerConfig {
  mode: OptimizationMode;
  dcCapacityMWp: number;
  acCapacityMWac: number;
  dcAcRatio: number;
}

// ─── Price Configuration ─────────────────────────────────────────────────────
export interface PriceConfig {
  revenueMode: RevenueMode;
  fixedTariffEurMWh: number;     // EUR/MWh
  priceProfile: number[];        // 8760 hourly prices EUR/MWh
  priceSource: string;           // label: 'smard_2024' | 'csv' | 'api'
  priceEscalation: number;       // e.g. 0.02 = 2%/a
  tariffEscalation: number;      // e.g. 0.00 = 0%/a
}

// ─── BESS Configuration ──────────────────────────────────────────────────────
export interface BessConfig {
  duration: BessDuration;        // 'none', '2h', '4h'
  powerMW: number;               // BESS power rating in MW (charge/discharge)
  roundTripEfficiency: number;   // e.g. 0.88 = 88%
  maxCycles: number;             // max daily full-equivalent cycles
}

// ─── Grid Connection Config ──────────────────────────────────────────────────
export interface GridConfig {
  hvBaseCostKEur: number;
  mvBaseCostKEur: number;
}

// ─── Optional CAPEX/Economics ────────────────────────────────────────────────
export interface CapexConfig {
  enabled: boolean;
  capexPerMWpDC: number;         // EUR/MWp for modules+mounting
  capexPerMWacAC: number;        // EUR/MWac for inverter+trafo+grid
  opexPerMWYear: number;         // EUR/MW/year
  discountRate: number;          // e.g. 0.05 = 5%
  bessCapexPerMWh: number;       // EUR/MWh storage capacity
  bessCapexPerMW: number;        // EUR/MW power electronics
}

// ─── Scenario Result (one DC/AC ratio point) ─────────────────────────────────
export interface ScenarioResult {
  dcAcRatio: number;
  dcMWp: number;
  acMWac: number;

  // Energy metrics (lifetime totals)
  annualGeneratedMWh: number;    // year-1 before clipping
  annualInjectedMWh: number;     // year-1 after AC limit
  annualClippedMWh: number;      // year-1 clipped
  lifetimeGeneratedMWh: number;
  lifetimeInjectedMWh: number;
  lifetimeClippedMWh: number;
  clippingPercent: number;       // lifetime clipping %
  capacityFactorAC: number;
  fullLoadHoursAC: number;
  fullLoadHoursDC: number;

  // Revenue metrics
  year1RevenueMarket: number;
  year1RevenueTariff: number;
  lifetimeRevenueMarket: number;
  lifetimeRevenueTariff: number;
  year1ClippingLossMarket: number;
  lifetimeClippingLossMarket: number;
  revenuePerMWpMarket: number;
  revenuePerMWacMarket: number;
  revenuePerMWpTariff: number;
  revenuePerMWacTariff: number;
  
  // Marginal metrics
  marginalGeneratedMWh: number;
  marginalInjectedMWh: number;
  marginalClippedMWh: number;
  marginalRevenueMarket: number;
  marginalRevenueTariff: number;
  marginalRevenuePerMWpMarket: number;
  marginalClippingShare: number;     // % of marginal generation that is clipped
  
  // Capture price metrics
  averageMarketPrice: number;        // EUR/MWh (simple average)
  capturePriceMarket: number;        // EUR/MWh (generation-weighted)
  marketCaptureFactor: number;       // capturePrice / averagePrice

  // Flags
  isOptimalTechnical: boolean;
  isOptimalEconomic: boolean;
  isOptimalMarginal: boolean;
  clippingWarning: boolean;      // true if marginal DC mostly clips

  // Optional economics
  totalCapex?: number;
  npv?: number;
  simplePaybackYears?: number;
  annualCashflows?: number[];

  // BESS metrics
  bessRecoveredMWh: number;      // lifetime energy recovered from clipping by BESS
  bessRevenueMarket: number;     // additional lifetime market revenue from BESS
  bessRevenueTariff: number;     // additional lifetime tariff revenue from BESS
  annualBessRecoveredMWh: number; // year-1 BESS recovered

  // Hourly data for charts (year 1 only, for perf)
  hourlyGenerated?: number[];    // 8760 values
  hourlyInjected?: number[];     // 8760 values
  hourlyClipped?: number[];      // 8760 values
  hourlyBessDischarge?: number[]; // 8760 values

  // Inverter manufacturer constraint results
  inverterResult?: InverterResult;
}

export interface CombinedScenarioResult {
  dcAcRatio: number;
  dcMWp: number;
  acMWac: number;
  p50: ScenarioResult;
  p90: ScenarioResult;
  isRobustOptimum: boolean;
  inverterComparison?: InverterResult[];  // When compare manufacturers is on
}

// ─── Full App State ──────────────────────────────────────────────────────────

export interface AppState {
  productionCase: ProductionCase;
  project: ProjectConfig;
  power: PowerConfig;
  orientation: Orientation;
  price: PriceConfig;
  capex: CapexConfig;
  grid: GridConfig;
  bess: BessConfig;
  scenarios: CombinedScenarioResult[];
}

// ─── Constants ───────────────────────────────────────────────────────────────
export const HOURS_PER_YEAR = 8760;
export const DEFAULT_RATIO_STEPS = [
  1.00, 1.05, 1.10, 1.15, 1.20, 1.25, 1.30, 1.35, 1.40, 1.45, 1.50,
  1.55, 1.60, 1.65, 1.70, 1.75, 1.80, 1.85, 1.90, 1.95, 2.00,
];

export const DEFAULT_PROJECT: ProjectConfig = {
  name: 'Utility-Scale Solar PV',
  country: 'Germany',
  lat: 51.1657,
  lon: 10.4515,
  lifetimeYears: 25,
  degradationRate: 0.005,
  availabilityFactor: 0.98,
  curtailmentFactor: 0.02,
  p90Ratio: 0.90,
};

export const DEFAULT_POWER: PowerConfig = {
  mode: 'ac_fixed',
  dcCapacityMWp: 125,
  acCapacityMWac: 100,
  dcAcRatio: 1.25,
};

export const DEFAULT_PRICE: PriceConfig = {
  revenueMode: 'hybrid',
  fixedTariffEurMWh: 49.4, // Sourced from BNetzA (01.03.2026 average award)
  priceProfile: [],
  priceSource: 'smard_2024',
  priceEscalation: 0.0,
  tariffEscalation: 0.0,
};

export const DEFAULT_BESS: BessConfig = {
  duration: 'none',
  powerMW: 25,
  roundTripEfficiency: 0.88,
  maxCycles: 1,
};

export const DEFAULT_GRID_CONFIG: GridConfig = {
  hvBaseCostKEur: 2500,
  mvBaseCostKEur: 800,
};

export const DEFAULT_CAPEX: CapexConfig = {
  enabled: false,
  capexPerMWpDC: 450000,
  capexPerMWacAC: 120000,
  opexPerMWYear: 12000,
  discountRate: 0.05,
  bessCapexPerMWh: 250000,
  bessCapexPerMW: 150000,
};

// ─── Inverter Manufacturer Constraints ───────────────────────────────────────

export interface InverterProduct {
  id: string;
  manufacturer: string;
  productName: string;
  unitAcCapacityMW: number;         // AC capacity per inverter unit (MW)
  maxDcAcOversizingRatio: number;   // e.g. 2.00 for SMA, 1.33 for Huawei
  capexPerUnit?: number;            // Optional EUR per unit
  capexPerMWac?: number;            // Optional EUR per MWac installed
  notes: string;
}

export interface InverterConfig {
  enabled: boolean;
  selectedProductId: string;
  products: InverterProduct[];
  compareManufacturers: boolean;
}

export interface InverterResult {
  manufacturer: string;
  productName: string;
  maxOversizingRatio: number;
  targetExportAcMW: number;
  requiredInverterAcMW: number;
  numberOfUnits: number;
  actualInstalledInverterAcMW: number;
  additionalInverterAcMW: number;
  projectDcExportRatio: number;
  inverterLoadingRatio: number;
  inverterCapex: number;
  additionalCapexVsBaseline: number;
  isFeasible: boolean;
  feasibilityStatus: 'feasible' | 'feasible_additional_capacity' | 'not_feasible';
  statusMessage: string;
}

export const DEFAULT_INVERTER_PRODUCTS: InverterProduct[] = [
  {
    id: 'sma_default',
    manufacturer: 'SMA',
    productName: 'Sunny Central UP (placeholder)',
    unitAcCapacityMW: 4.6,
    maxDcAcOversizingRatio: 2.00,
    capexPerUnit: undefined,
    capexPerMWac: 45_000,
    notes: 'SMA products can be oversized up to 200%',
  },
  {
    id: 'huawei_default',
    manufacturer: 'Huawei',
    productName: 'SUN2000-330KTL (placeholder)',
    unitAcCapacityMW: 0.330,
    maxDcAcOversizingRatio: 1.33,
    capexPerUnit: undefined,
    capexPerMWac: 35_000,
    notes: 'Huawei products can be oversized up to 133%',
  },
];

export const DEFAULT_INVERTER_CONFIG: InverterConfig = {
  enabled: false,
  selectedProductId: 'sma_default',
  products: DEFAULT_INVERTER_PRODUCTS,
  compareManufacturers: false,
};
