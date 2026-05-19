/**
 * gridConnection.ts — Substation recommendation & max cable route calculation
 *
 * Determines:
 * 1. Whether a dedicated substation (Umspannwerk) is needed based on AC capacity
 * 2. Maximum cable route length based on voltage level, cable specs, and loss limits
 *
 * Engineering basis:
 *   Voltage drop: ΔU = √3 × I × L × (R·cos(φ) + X·sin(φ))
 *   Max length:   L_max = (ΔU_max / 100 × U_nom) / (√3 × I × (R·cos(φ) + X·sin(φ)))
 *   Current:      I = P / (√3 × U × cos(φ))
 *   Power loss:   P_loss = 3 × I² × R × L
 */

// ─── Voltage levels & substation thresholds (German grid standards) ──────────
export type VoltageLevel = 'LV' | 'MV_10' | 'MV_20' | 'MV_30' | 'HV_110';

export interface SubstationRecommendation {
  required: boolean;
  type: 'none' | 'compact_station' | 'project_substation' | 'hv_substation' | 'multi_substation';
  label: string;
  description: string;
  voltageLevel: VoltageLevel;
  voltageLabelKV: string;
  estimatedCostRange: string;     // e.g. "150–300 k€"
  typicalLeadTime: string;        // e.g. "6–12 months"
}

export interface CableRouteResult {
  voltageLevel: VoltageLevel;
  voltageLabelKV: string;
  cableType: string;
  crossSectionMM2: number;
  resistanceOhmPerKm: number;
  reactanceOhmPerKm: number;
  currentA: number;
  maxLengthKm: number;            // limited by voltage drop
  maxLengthLossKm: number;        // limited by power loss
  effectiveMaxKm: number;         // min of both
  voltageDrop2km: number;         // % drop at 2 km
  powerLoss2km: number;           // % loss at 2 km
  parallelCircuits: number;       // number of parallel cable circuits needed
}

// ─── Cable specifications (typical German utility-scale) ─────────────────────
interface CableSpec {
  type: string;
  crossSection: number;           // mm²
  rPerKm: number;                 // Ω/km at 20°C
  xPerKm: number;                 // Ω/km
  maxCurrentA: number;            // thermal rating (direct burial)
}

const CABLE_SPECS: Record<string, CableSpec> = {
  MV_10: {
    type: 'NA2XS2Y 3×1×240',
    crossSection: 240,
    rPerKm: 0.125,
    xPerKm: 0.08,
    maxCurrentA: 420,
  },
  MV_20: {
    type: 'NA2XS2Y 3×1×240',
    crossSection: 240,
    rPerKm: 0.125,
    xPerKm: 0.08,
    maxCurrentA: 420,
  },
  MV_30: {
    type: 'NA2XS(FL)2Y 1×500',
    crossSection: 500,
    rPerKm: 0.0641,
    xPerKm: 0.105,
    maxCurrentA: 590,
  },
  HV_110: {
    type: '2XS(FL)2Y 1×800',
    crossSection: 800,
    rPerKm: 0.0367,
    xPerKm: 0.116,
    maxCurrentA: 780,
  },
};

const COS_PHI = 0.95;
const SIN_PHI = Math.sqrt(1 - COS_PHI * COS_PHI);
const SQRT3 = Math.sqrt(3);

// ─── Substation recommendation ───────────────────────────────────────────────
export function getSubstationRecommendation(acCapacityMWac: number): SubstationRecommendation {
  if (acCapacityMWac <= 0.135) {
    return {
      required: false,
      type: 'none',
      label: 'No substation required',
      description: 'Low-voltage grid connection via string inverters. No transformer station needed.',
      voltageLevel: 'LV',
      voltageLabelKV: '0.4 kV',
      estimatedCostRange: '—',
      typicalLeadTime: '1–3 months',
    };
  }

  if (acCapacityMWac <= 5) {
    return {
      required: true,
      type: 'compact_station',
      label: 'Compact transformer station',
      description: 'Prefabricated kiosk-type transformer station (e.g. Ormazabal, ABB UniSec). Typically 630–2500 kVA transformer with MV switchgear, LV distribution, and metering.',
      voltageLevel: acCapacityMWac <= 2 ? 'MV_10' : 'MV_20',
      voltageLabelKV: acCapacityMWac <= 2 ? '10 kV' : '20 kV',
      estimatedCostRange: '80–250 k€',
      typicalLeadTime: '3–6 months',
    };
  }

  if (acCapacityMWac <= 30) {
    return {
      required: true,
      type: 'project_substation',
      label: 'Dedicated project substation',
      description: `Project-specific MV/MV or MV/HV substation with ring main unit (RMU), protection relays, and SCADA interface. Multiple transformers (${Math.ceil(acCapacityMWac / 5)} × ${Math.min(5000, Math.ceil(acCapacityMWac * 1000 / Math.ceil(acCapacityMWac / 5)))} kVA) required.`,
      voltageLevel: acCapacityMWac <= 15 ? 'MV_20' : 'MV_30',
      voltageLabelKV: acCapacityMWac <= 15 ? '20 kV' : '30 kV',
      estimatedCostRange: '250–800 k€',
      typicalLeadTime: '6–12 months',
    };
  }

  if (acCapacityMWac <= 150) {
    return {
      required: true,
      type: 'hv_substation',
      label: '110 kV Substation (Umspannwerk)',
      description: `Dedicated 110/20 kV or 110/30 kV high-voltage substation with HV switchgear, power transformer (${Math.ceil(acCapacityMWac / 40)} × ${Math.min(63, Math.ceil(acCapacityMWac / Math.ceil(acCapacityMWac / 40)))} MVA), protection system, and grid operator interface. Requires Netzverträglichkeitsprüfung (grid compatibility study).`,
      voltageLevel: 'HV_110',
      voltageLabelKV: '110 kV',
      estimatedCostRange: '2–8 M€',
      typicalLeadTime: '12–24 months',
    };
  }

  return {
    required: true,
    type: 'multi_substation',
    label: 'Multiple 110 kV Substations',
    description: `Project exceeds single substation capacity. ${Math.ceil(acCapacityMWac / 100)} separate 110 kV substations or a 220/380 kV connection required. Extensive grid studies mandatory.`,
    voltageLevel: 'HV_110',
    voltageLabelKV: '110/220 kV',
    estimatedCostRange: '8–25 M€',
    typicalLeadTime: '24–36 months',
  };
}

// ─── Cable route calculation ─────────────────────────────────────────────────
export function calculateCableRoute(
  acCapacityMWac: number,
  maxVoltageDrop: number = 2.0,     // % max voltage drop
  maxPowerLoss: number = 2.0,       // % max power loss
): CableRouteResult {
  const sub = getSubstationRecommendation(acCapacityMWac);
  const vlKey = sub.voltageLevel === 'LV' ? 'MV_10' : sub.voltageLevel;
  const cable = CABLE_SPECS[vlKey] || CABLE_SPECS.MV_20;

  // Nominal voltage in kV
  const uNomKV: Record<string, number> = {
    MV_10: 10,
    MV_20: 20,
    MV_30: 30,
    HV_110: 110,
  };
  const uKV = uNomKV[vlKey] || 20;
  const uV = uKV * 1000; // Convert to Volts for calculation

  // Power in watts
  const pW = acCapacityMWac * 1e6;

  // Current per circuit
  const iTotal = pW / (SQRT3 * uV * COS_PHI);

  // Check if we need parallel circuits
  const numCircuits = Math.max(1, Math.ceil(iTotal / cable.maxCurrentA));

  // Effective impedance per km per circuit
  const rEff = cable.rPerKm / numCircuits;
  const xEff = cable.xPerKm / numCircuits;

  // Max length from voltage drop constraint
  // ΔU% = (√3 × I_total × L × (r_eff·cos(φ) + x_eff·sin(φ))) / U × 100
  const impedanceFactor = rEff * COS_PHI + xEff * SIN_PHI;
  const maxLengthVD = impedanceFactor > 0
    ? (maxVoltageDrop / 100 * uV) / (SQRT3 * iTotal * impedanceFactor)
    : 999;

  // Max length from power loss constraint
  // P_loss% = (3 × I_circuit² × R_per_km × L × numCircuits) / P × 100
  // Simplified: P_loss% = (I_total² × R_eff × L × 3) / P × 100
  // Wait, let's be precise:
  // Total loss = numCircuits × 3 × I_perCircuit² × R_perKm × L
  //            = 3 × (I_total/n)² × R_perKm × n × L
  //            = 3 × I_total² × R_perKm × L / n
  //            = 3 × I_total² × rEff × L
  const maxLengthPL = pW > 0 && rEff > 0
    ? (maxPowerLoss / 100 * pW) / (3 * iTotal * iTotal * rEff)
    : 999;

  const effectiveMax = Math.min(maxLengthVD, maxLengthPL);

  // Calculate losses at 2 km reference distance
  const refDist = 2;
  const vdAt2km = (SQRT3 * iTotal * refDist * impedanceFactor) / uV * 100;
  const plAt2km = pW > 0 ? (3 * iTotal * iTotal * rEff * refDist) / pW * 100 : 0;

  return {
    voltageLevel: sub.voltageLevel === 'LV' ? 'MV_10' : sub.voltageLevel,
    voltageLabelKV: sub.voltageLevel === 'LV' ? '10 kV' : sub.voltageLabelKV,
    cableType: cable.type,
    crossSectionMM2: cable.crossSection,
    resistanceOhmPerKm: cable.rPerKm,
    reactanceOhmPerKm: cable.xPerKm,
    currentA: Math.round(iTotal),
    maxLengthKm: Math.round(maxLengthVD * 10) / 10,
    maxLengthLossKm: Math.round(maxLengthPL * 10) / 10,
    effectiveMaxKm: Math.round(effectiveMax * 10) / 10,
    voltageDrop2km: Math.round(vdAt2km * 100) / 100,
    powerLoss2km: Math.round(plAt2km * 100) / 100,
    parallelCircuits: numCircuits,
  };
}

// ─── Substation cost estimation (point estimates, k€) ────────────────────────
function estimateSubstationCostKEur(type: SubstationRecommendation['type'], acMWac: number): {
  substationKEur: number;
  permittingKEur: number;
  totalKEur: number;
} {
  switch (type) {
    case 'none':
      return { substationKEur: 0, permittingKEur: 5, totalKEur: 5 };
    case 'compact_station':
      // ~80k base + 30k per MWac
      return {
        substationKEur: Math.round(80 + acMWac * 30),
        permittingKEur: Math.round(15 + acMWac * 3),
        totalKEur: Math.round(95 + acMWac * 33),
      };
    case 'project_substation':
      // ~200k base + 25k per MWac + permitting with Netzanschlussbegehren
      return {
        substationKEur: Math.round(200 + acMWac * 25),
        permittingKEur: Math.round(50 + acMWac * 5),
        totalKEur: Math.round(250 + acMWac * 30),
      };
    case 'hv_substation':
      // ~1500k base + 40k per MWac + extensive permitting (Netzverträglichkeitsprüfung)
      return {
        substationKEur: Math.round(1500 + acMWac * 40),
        permittingKEur: Math.round(200 + acMWac * 8),
        totalKEur: Math.round(1700 + acMWac * 48),
      };
    case 'multi_substation':
      return {
        substationKEur: Math.round(3000 + acMWac * 50),
        permittingKEur: Math.round(500 + acMWac * 10),
        totalKEur: Math.round(3500 + acMWac * 60),
      };
    default:
      return { substationKEur: 0, permittingKEur: 0, totalKEur: 0 };
  }
}

// ─── MV vs HV economic comparison ────────────────────────────────────────────
export interface SubstationEconomics {
  // Option A: HV connection (DC/AC = 1.0, no clipping)
  hvAcCapacityMWac: number;           // = DC capacity (ratio 1.0)
  hvSubstation: SubstationRecommendation;
  hvCostKEur: { substationKEur: number; permittingKEur: number; totalKEur: number };

  // Option B: Current MV connection (with clipping)
  mvAcCapacityMWac: number;           // current AC capacity
  mvSubstation: SubstationRecommendation;
  mvCostKEur: { substationKEur: number; permittingKEur: number; totalKEur: number };

  // Clipping economics
  lifetimeClippedMWh: number;         // energy lost to clipping
  lifetimeClippingRevenueLossKEur: number; // revenue lost from clipping
  dcAcRatio: number;
  clippingPercent: number;

  // Net comparison
  infrastructureSavingKEur: number;   // HV cost - MV cost (positive = saving by using MV)
  netAdvantageKEur: number;           // infrastructure saving - clipping loss (positive = MV is better)
  recommendation: 'mv_preferred' | 'hv_preferred' | 'marginal' | 'same_level';
  recommendationText: string;
}

export function calculateSubstationEconomics(
  dcCapacityMWp: number,
  acCapacityMWac: number,
  lifetimeClippedMWh: number,
  lifetimeRevenueMarketMEur: number,
  lifetimeInjectedMWh: number,
  clippingPercent: number,
): SubstationEconomics {
  // Option A: HV — DC/AC = 1.0 (AC = DC)
  const hvAc = dcCapacityMWp;
  const hvSub = getSubstationRecommendation(hvAc);
  const hvCost = estimateSubstationCostKEur(hvSub.type, hvAc);

  // Option B: Current MV
  const mvSub = getSubstationRecommendation(acCapacityMWac);
  const mvCost = estimateSubstationCostKEur(mvSub.type, acCapacityMWac);

  // Clipping revenue loss: use average market price from actual revenue data
  const avgPriceEurPerMWh = lifetimeInjectedMWh > 0
    ? (lifetimeRevenueMarketMEur * 1000) / lifetimeInjectedMWh * 1000  // M€ → k€ → EUR
    : 70; // fallback
  const clippingRevenueLossKEur = (lifetimeClippedMWh * avgPriceEurPerMWh) / 1000;

  // Infrastructure saving by choosing MV over HV
  const infrastructureSaving = hvCost.totalKEur - mvCost.totalKEur;

  // Net advantage: positive means MV is the better economic choice
  const netAdvantage = infrastructureSaving - clippingRevenueLossKEur;

  // Determine recommendation
  let recommendation: SubstationEconomics['recommendation'];
  let recommendationText: string;

  if (hvSub.type === mvSub.type) {
    recommendation = 'same_level';
    recommendationText = `Both options require the same connection level (${mvSub.voltageLabelKV}). The DC/AC ratio decision is purely about clipping optimization.`;
  } else if (netAdvantage > 100) {
    recommendation = 'mv_preferred';
    recommendationText = `MV connection saves ${Math.round(netAdvantage)} k€ net vs. building a 110 kV substation. The ${clippingPercent.toFixed(1)}% clipping loss is economically justified by the ${Math.round(infrastructureSaving)} k€ infrastructure saving.`;
  } else if (netAdvantage < -100) {
    recommendation = 'hv_preferred';
    recommendationText = `A 110 kV connection is economically justified. The ${Math.round(clippingRevenueLossKEur)} k€ lifetime revenue lost from clipping exceeds the ${Math.round(infrastructureSaving)} k€ infrastructure saving from MV.`;
  } else {
    recommendation = 'marginal';
    recommendationText = `The economics are marginal (net difference: ${Math.round(netAdvantage)} k€). Consider other factors: grid operator requirements, future expansion plans, and permitting timeline (${hvSub.typicalLeadTime} for HV vs. ${mvSub.typicalLeadTime} for MV).`;
  }

  return {
    hvAcCapacityMWac: hvAc,
    hvSubstation: hvSub,
    hvCostKEur: hvCost,
    mvAcCapacityMWac: acCapacityMWac,
    mvSubstation: mvSub,
    mvCostKEur: mvCost,
    lifetimeClippedMWh,
    lifetimeClippingRevenueLossKEur: Math.round(clippingRevenueLossKEur),
    dcAcRatio: dcCapacityMWp / acCapacityMWac,
    clippingPercent,
    infrastructureSavingKEur: Math.round(infrastructureSaving),
    netAdvantageKEur: Math.round(netAdvantage),
    recommendation,
    recommendationText,
  };
}

