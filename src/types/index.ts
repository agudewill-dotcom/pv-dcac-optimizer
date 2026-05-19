// ─── Optimization Modes ──────────────────────────────────────────────────────
export type OptimizationMode = 'ac_fixed' | 'dc_fixed' | 'free';
export type RevenueMode = 'market' | 'tariff' | 'hybrid';
export type Orientation = 'south' | 'east_west' | 'south_east' | 'south_west';
export type BessDuration = 'none' | '2h' | '4h';

// ─── Project Configuration ───────────────────────────────────────────────────
export interface ProjectConfig {
  name: string;
  country: string;
  lifetimeYears: number;
  degradationRate: number;       // e.g. 0.004 = 0.4%/a
  availabilityFactor: number;    // e.g. 0.98 = 98%
  curtailmentFactor: number;     // e.g. 0.0 = 0%
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
  priceSource: string;           // label: 'sample' | 'csv' | 'api'
}

// ─── BESS Configuration ──────────────────────────────────────────────────────
export interface BessConfig {
  duration: BessDuration;        // 'none', '2h', '4h'
  powerMW: number;               // BESS power rating in MW (charge/discharge)
  roundTripEfficiency: number;   // e.g. 0.88 = 88%
  maxCycles: number;             // max daily full-equivalent cycles
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
  annualRevenueMarket: number;
  annualRevenueTariff: number;
  lifetimeRevenueMarket: number;
  lifetimeRevenueTariff: number;
  revenuePerMWpMarket: number;
  revenuePerMWacMarket: number;
  revenuePerMWpTariff: number;
  revenuePerMWacTariff: number;
  marginalRevenueMarket: number;
  marginalRevenueTariff: number;
  marketValueWeightedPrice: number;  // EUR/MWh

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
}

// ─── Full App State ──────────────────────────────────────────────────────────
export interface AppState {
  project: ProjectConfig;
  power: PowerConfig;
  orientation: Orientation;
  price: PriceConfig;
  capex: CapexConfig;
  scenarios: ScenarioResult[];
}

// ─── Constants ───────────────────────────────────────────────────────────────
export const HOURS_PER_YEAR = 8760;
export const DEFAULT_RATIO_STEPS = [1.00, 1.05, 1.10, 1.15, 1.20, 1.25, 1.30, 1.35, 1.40, 1.45, 1.50];

export const DEFAULT_PROJECT: ProjectConfig = {
  name: 'Utility-Scale PV Project',
  country: 'Germany',
  lifetimeYears: 25,
  degradationRate: 0.004,
  availabilityFactor: 0.98,
  curtailmentFactor: 0.0,
};

export const DEFAULT_POWER: PowerConfig = {
  mode: 'ac_fixed',
  dcCapacityMWp: 125,
  acCapacityMWac: 100,
  dcAcRatio: 1.25,
};

export const DEFAULT_PRICE: PriceConfig = {
  revenueMode: 'hybrid',
  fixedTariffEurMWh: 70,
  priceProfile: [],
  priceSource: 'smard_2024',
};

export const DEFAULT_BESS: BessConfig = {
  duration: 'none',
  powerMW: 25,
  roundTripEfficiency: 0.88,
  maxCycles: 1,
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
