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
export interface DetailedCapexConfig {
  enabled: boolean;
  
  // A1. Mounting structure / UK
  ukMethod: 'catalog' | 'manual_kwp' | 'manual_total';
  selectedUKItemId: string;
  manualUKKwp: number;
  manualUKTotal: number;
  isAgriPV: boolean;
  isRootProtection: boolean;
  windLoadZone: 1 | 2 | 3 | 4;

  // A2. Modules
  selectedModuleId: string;
  manualModuleWp: number;
  manualModulePrice: number;
  manualModuleQuantity?: number;

  // A3. LV electrical
  includeLVCable: boolean;
  lvCableMethod: 'catalog' | 'manual_m' | 'manual_total';
  selectedLVCableId: string;
  lvCableLengthM: number;
  lvCableRuns: number;
  manualLVCableM: number;
  manualLVCableTotal: number;

  // A4. LV cable route
  lvRouteLengthM: number;
  lvShareOpenTrench: number;
  lvShareCableTray: number;
  lvShareAsphalt: number;
  lvSharePressDrilling: number;
  lvShareHDD: number;
  manualLVRouteTotal?: number;

  // A5. LV assembly
  useSimplifiedMontage: boolean;
  montageTotalKwp: number;
  montageDCShare: number;
  montageACShare: number;
  manualDCAssemblyTotal?: number;
  manualACAssemblyTotal?: number;

  // A6. Site-specific LV adders
  includeCompensatory: boolean;
  compensatoryMethod: 'manual_total' | 'per_ha' | 'per_mwp';
  compensatoryTotal: number;

  includeOrdnance: boolean;
  ordnanceMethod: 'manual_total' | 'per_ha' | 'per_sqm';
  ordnanceTotal: number;

  includeFireProtection: boolean;
  fireProtectionTotal: number;

  fenceLengthM: number;
  fenceCostPerM: number;
  manualFenceTotal?: number;

  roadLengthM: number;
  roadCostPerM: number;
  manualRoadTotal?: number;

  // B1. Grid connection concept
  gridConcept: 'existing_mv' | 'transfer_station' | 'combined_station' | 'separate_trafo_ugs' | 'hv_substation' | 'edis_cell' | 'custom';
  includeMVRoute: boolean;
  includeUGS: boolean;
  includeTrafo: boolean;
  useKombistation: 'yes' | 'no' | 'suggested';
  includeHVSubstation: boolean;
  includeFeedInCell: boolean;
  manualGridOverrideTotal?: number;

  // B2. Cable route
  mvRouteLengthM: number;
  mvCombinedStationThresholdM: number;
  mvSharePrivateRoad: number;
  mvSharePublicRoad: number;
  mvShareOpenTrench: number;
  mvShareAsphalt: number;
  mvSharePressDrilling: number;
  mvShareHDD: number;
  mvEasementCost: number;
  mvPlanningCost: number;
  mvManualRouteComplexityFactor: number;
  manualMVRouteTotal?: number;
  privateLandCostPerM: number;

  // B3 & B5-B7. Station & Cable
  selectedMVCableId: string;
  mvCableRuns: number;
  selectedTrafoId: string;
  selectedTrafoInverterComboId: string;
  selectedUGSId: string;
  selectedKombiId: string;
  selectedHVSubstationId: string;

  // C. Inverter Override (Economic Output)
  manualInverterOverride: boolean;
  overrideInverterConfig?: InverterConfig;

  // D. BESS
  selectedBessSystemId: string;
  selectedBessInverterId: string;
  bessInstallationCost: number;

  // E. Certification
  selectedCertId: string;
  certComponentB: number;
  certComponentC: number;

  // F. OPEX & Lifetime
  opexMethod: 'per_mwp' | 'percent_capex' | 'manual_total';
  opexPerMWpYear: number;
  opexPercentCapex: number;
  manualOpexTotal: number;
  discountRate: number;

  // G. Contingency
  contingencyPercent: number;
}

export interface DetailedCapexBreakdown {
  moduleCapex: number;
  ukCapex: number;
  lvCableMaterialCapex: number;
  lvRouteInstallationCapex: number;
  lvAssemblyCapex: number;
  mvCableMaterialCapex: number;
  mvRouteInstallationCapex: number;
  transformerCapex: number;
  ugsKombiCapex: number;
  hvSubstationCapex: number;
  inverterCapex: number;
  bessCapex: number;
  certificationCapex: number;
  fireProtectionCapex: number;
  compensatoryCapex: number;
  ordnanceCapex: number;
  roadCapex: number;
  fenceCapex: number;
  otherCapex: number;
  contingencyCapex: number;
  totalCapex: number;
  
  // Groupings
  groupLvPlant: number;
  groupMvHvGrid: number;
  groupInverter: number;
  groupBess: number;
  groupOther: number;

  // Inverter Details
  inverterIncludedInCombo: boolean;
  comboName?: string;
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
  capexBreakdown?: DetailedCapexBreakdown;
  annualOpex?: number;
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
  capex: DetailedCapexConfig;
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

export const DEFAULT_DETAILED_CAPEX: DetailedCapexConfig = {
  enabled: true,
  ukMethod: 'catalog',
  selectedUKItemId: 'lv_mounting_standard_uk__öko_pv',
  manualUKKwp: 39,
  manualUKTotal: 0,
  isAgriPV: false,
  isRootProtection: false,
  windLoadZone: 2,
  selectedModuleId: 'lv_module_sf_ja_455_72166m_dg_hc',
  manualModuleWp: 455,
  manualModulePrice: 100,
  includeLVCable: true,
  lvCableMethod: 'catalog',
  selectedLVCableId: 'lv_cable_al_nayy_j_4x150mm²_se_sw',
  lvCableLengthM: 1000,
  lvCableRuns: 1,
  manualLVCableM: 10,
  manualLVCableTotal: 0,
  lvRouteLengthM: 1000,
  lvShareOpenTrench: 100,
  lvShareCableTray: 0,
  lvShareAsphalt: 0,
  lvSharePressDrilling: 0,
  lvShareHDD: 0,
  useSimplifiedMontage: true,
  montageTotalKwp: 240,
  montageDCShare: 80,
  montageACShare: 20,
  includeCompensatory: false,
  compensatoryMethod: 'manual_total',
  compensatoryTotal: 0,
  includeOrdnance: false,
  ordnanceMethod: 'manual_total',
  ordnanceTotal: 0,
  includeFireProtection: false,
  fireProtectionTotal: 0,
  fenceLengthM: 0,
  fenceCostPerM: 15,
  roadLengthM: 0,
  roadCostPerM: 50,
  gridConcept: 'transfer_station',
  includeMVRoute: true,
  includeUGS: true,
  includeTrafo: true,
  useKombistation: 'no',
  includeHVSubstation: false,
  includeFeedInCell: false,
  mvRouteLengthM: 1000,
  mvCombinedStationThresholdM: 200,
  mvSharePrivateRoad: 0,
  mvSharePublicRoad: 100,
  mvShareOpenTrench: 100,
  mvShareAsphalt: 0,
  mvSharePressDrilling: 0,
  mvShareHDD: 0,
  mvEasementCost: 0,
  mvPlanningCost: 0,
  mvManualRouteComplexityFactor: 1.0,
  privateLandCostPerM: 10,
  selectedMVCableId: 'mv_cable_na2xs(f)2y_3x1x120mm²_rm/25_12/20_kv',
  mvCableRuns: 1,
  selectedTrafoId: 'mv_transformer_transformare_trafo_station_bis_3_mw',
  selectedTrafoInverterComboId: 'none',
  selectedUGSId: 'mv_station_ugs_bis_5_mw',
  selectedKombiId: 'mv_kombi_transformare_kombi_trafo_630_kva_us',
  selectedHVSubstationId: 'hv_substation_einspeisezelle_e.dis',
  manualInverterOverride: false,
  selectedBessSystemId: 'bess_container_2_mwh',
  selectedBessInverterId: '',
  bessInstallationCost: 0,
  selectedCertId: 'cert_certificate_anlagenzertifikat_typ_b,_small_certificate',
  certComponentB: 3350,
  certComponentC: 6000,
  opexMethod: 'per_mwp',
  opexPerMWpYear: 12000,
  opexPercentCapex: 1.5,
  manualOpexTotal: 0,
  discountRate: 0.05,
  contingencyPercent: 5
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
