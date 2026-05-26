/**
 * optimization.ts — DC/AC ratio scenario comparison
 *
 * Generates a sweep of DC/AC ratios, runs clipping + revenue + BESS for each
 * across both P50 and P90 production cases, and identifies robust optimal scenarios.
 */

import type {
  ProjectConfig, PowerConfig, PriceConfig, CapexConfig, BessConfig, GridConfig,
  Orientation, ScenarioResult, CombinedScenarioResult, InverterConfig
} from '../types';
import { DEFAULT_RATIO_STEPS } from '../types';
import { generateProfile } from './generationProfiles';
import { simulateClipping } from './clippingEngine';
import { calculateRevenue } from './revenueEngine';
import { simulateBess } from './bessEngine';
import { calculateInverterRequirements, compareManufacturers } from './inverterEngine';

function runSingleScenario(
  profile: number[],
  dcMWp: number,
  acMWac: number,
  ratio: number,
  project: ProjectConfig,
  price: PriceConfig,
  capex: CapexConfig,
  grid: GridConfig,
  bess: BessConfig,
  inverter: InverterConfig
): ScenarioResult {
  const clipping = simulateClipping(profile, dcMWp, acMWac, project);
  const revenue = calculateRevenue(
    clipping.hourlyGenerated,
    clipping.hourlyInjected,
    price,
    project,
  );

  const bessResult = simulateBess(
    clipping.hourlyClipped,
    clipping.hourlyInjected,
    acMWac,
    price.priceProfile,
    bess,
  );

  let bessRevenueMarket = 0;
  let bessRevenueTariff = 0;
  let lifetimeBessRecovered = 0;

  if (bess.duration !== 'none') {
    for (let h = 0; h < bessResult.hourlyBessDischarge.length; h++) {
      const dischargeMWh = bessResult.hourlyBessDischarge[h];
      bessRevenueMarket += dischargeMWh * (price.priceProfile[h] || 0);
    }
    bessRevenueTariff = bessResult.annualRecoveredMWh * price.fixedTariffEurMWh;

    for (let y = 1; y <= project.lifetimeYears; y++) {
      const degFactor = Math.pow(1 - project.degradationRate, y - 1);
      lifetimeBessRecovered += bessResult.annualRecoveredMWh * degFactor;
    }
    const lifetimeScale = lifetimeBessRecovered / Math.max(bessResult.annualRecoveredMWh, 0.001);
    bessRevenueMarket *= lifetimeScale;
    bessRevenueTariff *= lifetimeScale;
  }

  const totalLifetimeRevenueMarket = revenue.lifetimeRevenueMarket + bessRevenueMarket;
  const totalLifetimeRevenueTariff = revenue.lifetimeRevenueTariff + bessRevenueTariff;

  // Inverter manufacturer constraint calculations
  let inverterResult = undefined;
  if (inverter.enabled) {
    const selectedProduct = inverter.products.find(p => p.id === inverter.selectedProductId);
    if (selectedProduct) {
      inverterResult = calculateInverterRequirements(dcMWp, acMWac, selectedProduct);
    }
  }

  let totalCapex: number | undefined;
  let npv: number | undefined;
  let simplePaybackYears: number | undefined;
  let annualCashflows: number[] | undefined;

  let capexBreakdown = undefined;
  let annualOpexVal = undefined;

  if (capex.enabled) {
    const dcCapex = dcMWp * capex.capexPerMWpDC;
    let acCapex = 0;
    let inverterCapex = 0;
    
    if (inverter.enabled && inverterResult) {
      inverterCapex = inverterResult.inverterCapex;
    } else {
      acCapex = acMWac * capex.capexPerMWacAC;
    }

    let bessStorageCapex = 0;
    let bessPowerCapex = 0;
    if (bess.duration !== 'none') {
      const durationHours = bess.duration === '4h' ? 4 : 2;
      const bessCapacity = bess.powerMW * durationHours;
      bessPowerCapex = bess.powerMW * capex.bessCapexPerMW;
      bessStorageCapex = bessCapacity * capex.bessCapexPerMWh;
    }

    const gridHvCapex = grid.hvBaseCostKEur * 1000;
    const gridMvCapex = grid.mvBaseCostKEur * 1000;

    capexBreakdown = {
      dcCapex,
      acCapex,
      inverterCapex,
      gridHvCapex,
      gridMvCapex,
      bessStorageCapex,
      bessPowerCapex
    };

    totalCapex = dcCapex + acCapex + inverterCapex + gridHvCapex + gridMvCapex + bessStorageCapex + bessPowerCapex;

    const annualOpex = (dcMWp + acMWac) / 2 * capex.opexPerMWYear;
    annualOpexVal = annualOpex;
    annualCashflows = [];
    let cumulativeCF = -totalCapex;
    let npvCalc = -totalCapex;
    let paybackFound = false;

    for (let y = 1; y <= project.lifetimeYears; y++) {
      const degFactor = Math.pow(1 - project.degradationRate, y - 1);
      const yearRevenue = (revenue.year1RevenueMarket + (bess.duration !== 'none' ? bessRevenueMarket / project.lifetimeYears : 0)) * degFactor;
      const yearCF = yearRevenue - annualOpex;
      annualCashflows.push(yearCF);
      cumulativeCF += yearCF;
      npvCalc += yearCF / Math.pow(1 + capex.discountRate, y);

      if (!paybackFound && cumulativeCF >= 0) {
        simplePaybackYears = y;
        paybackFound = true;
      }
    }
    npv = npvCalc;
  }

  return {
    dcAcRatio: Math.round(ratio * 100) / 100,
    dcMWp: Math.round(dcMWp * 100) / 100,
    acMWac: Math.round(acMWac * 100) / 100,

    annualGeneratedMWh: clipping.annualGeneratedMWh,
    annualInjectedMWh: clipping.annualInjectedMWh,
    annualClippedMWh: clipping.annualClippedMWh,
    lifetimeGeneratedMWh: clipping.lifetimeGeneratedMWh,
    lifetimeInjectedMWh: clipping.lifetimeInjectedMWh,
    lifetimeClippedMWh: clipping.lifetimeClippedMWh,
    clippingPercent: clipping.clippingPercent,
    capacityFactorAC: clipping.capacityFactorAC,
    fullLoadHoursAC: clipping.fullLoadHoursAC,
    fullLoadHoursDC: clipping.fullLoadHoursDC,

    year1RevenueMarket: revenue.year1RevenueMarket,
    year1RevenueTariff: revenue.year1RevenueTariff,
    lifetimeRevenueMarket: totalLifetimeRevenueMarket,
    lifetimeRevenueTariff: totalLifetimeRevenueTariff,
    year1ClippingLossMarket: revenue.year1ClippingLossMarket,
    lifetimeClippingLossMarket: revenue.lifetimeClippingLossMarket,
    
    revenuePerMWpMarket: dcMWp > 0 ? totalLifetimeRevenueMarket / dcMWp : 0,
    revenuePerMWacMarket: acMWac > 0 ? totalLifetimeRevenueMarket / acMWac : 0,
    revenuePerMWpTariff: dcMWp > 0 ? totalLifetimeRevenueTariff / dcMWp : 0,
    revenuePerMWacTariff: acMWac > 0 ? totalLifetimeRevenueTariff / acMWac : 0,
    
    marginalGeneratedMWh: 0,
    marginalInjectedMWh: 0,
    marginalClippedMWh: 0,
    marginalRevenueMarket: 0,
    marginalRevenueTariff: 0,
    marginalRevenuePerMWpMarket: 0,
    marginalClippingShare: 0,

    averageMarketPrice: revenue.averageMarketPrice,
    capturePriceMarket: revenue.capturePriceMarket,
    marketCaptureFactor: revenue.marketCaptureFactor,

    isOptimalTechnical: false,
    isOptimalEconomic: false,
    isOptimalMarginal: false,
    clippingWarning: false,

    bessRecoveredMWh: lifetimeBessRecovered,
    bessRevenueMarket: bessRevenueMarket,
    bessRevenueTariff: bessRevenueTariff,
    annualBessRecoveredMWh: bessResult.annualRecoveredMWh,

    totalCapex,
    capexBreakdown,
    annualOpex: annualOpexVal,
    npv,
    simplePaybackYears,
    annualCashflows,

    hourlyGenerated: clipping.hourlyGenerated,
    hourlyInjected: clipping.hourlyInjected,
    hourlyClipped: clipping.hourlyClipped,
    hourlyBessDischarge: bessResult.hourlyBessDischarge,

    inverterResult,
  };
}

function calculateMarginals(results: ScenarioResult[]) {
  for (let i = 1; i < results.length; i++) {
    const prev = results[i - 1];
    const curr = results[i];
    const deltaDC = curr.dcMWp - prev.dcMWp;
    
    curr.marginalGeneratedMWh = curr.lifetimeGeneratedMWh - prev.lifetimeGeneratedMWh;
    curr.marginalInjectedMWh = curr.lifetimeInjectedMWh - prev.lifetimeInjectedMWh;
    curr.marginalClippedMWh = curr.lifetimeClippedMWh - prev.lifetimeClippedMWh;
    
    if (curr.marginalGeneratedMWh > 0) {
      curr.marginalClippingShare = curr.marginalClippedMWh / curr.marginalGeneratedMWh;
    }

    if (deltaDC > 0) {
      curr.marginalRevenueMarket = curr.lifetimeRevenueMarket - prev.lifetimeRevenueMarket;
      curr.marginalRevenueTariff = curr.lifetimeRevenueTariff - prev.lifetimeRevenueTariff;
      curr.marginalRevenuePerMWpMarket = curr.marginalRevenueMarket / deltaDC;
    }

    const deltaGen = curr.lifetimeGeneratedMWh - prev.lifetimeGeneratedMWh;
    const deltaClip = curr.lifetimeClippedMWh - prev.lifetimeClippedMWh;
    if (deltaGen > 0 && (deltaClip / deltaGen) > 0.5) {
      curr.clippingWarning = true;
    }
  }
}

export function runOptimization(
  project: ProjectConfig,
  power: PowerConfig,
  orientation: Orientation,
  price: PriceConfig,
  capex: CapexConfig,
  grid: GridConfig,
  bess: BessConfig,
  inverter: InverterConfig,
): CombinedScenarioResult[] {
  
  const baseProfile = project.pvgisProfile && project.pvgisProfile.length >= 8760 
    ? project.pvgisProfile 
    : generateProfile(orientation);

  const p50Profile = project.customP50Profile && project.customP50Profile.length >= 8760
    ? project.customP50Profile
    : baseProfile;
    
  const p90Profile = project.customP90Profile && project.customP90Profile.length >= 8760
    ? project.customP90Profile
    : baseProfile.map(v => v * project.p90Ratio);

  const scenarios: Array<{ dcMWp: number; acMWac: number; ratio: number }> = [];
  const ratioSteps = DEFAULT_RATIO_STEPS;

  switch (power.mode) {
    case 'ac_fixed': {
      for (const ratio of ratioSteps) {
        scenarios.push({
          dcMWp: power.acCapacityMWac * ratio,
          acMWac: power.acCapacityMWac,
          ratio,
        });
      }
      break;
    }
    case 'dc_fixed': {
      for (const ratio of ratioSteps) {
        scenarios.push({
          dcMWp: power.dcCapacityMWp,
          acMWac: power.dcCapacityMWp / ratio,
          ratio,
        });
      }
      break;
    }
    case 'free': {
      scenarios.push({
        dcMWp: power.dcCapacityMWp,
        acMWac: power.acCapacityMWac,
        ratio: power.dcAcRatio,
      });
      break;
    }
  }

  const combinedResults: CombinedScenarioResult[] = scenarios.map(({ dcMWp, acMWac, ratio }) => {
    const p50 = runSingleScenario(p50Profile, dcMWp, acMWac, ratio, project, price, capex, grid, bess, inverter);
    const p90 = runSingleScenario(p90Profile, dcMWp, acMWac, ratio, project, price, capex, grid, bess, inverter);
    
    // Manufacturer comparison: calculate inverter requirements for all products at this ratio
    let inverterComparison: CombinedScenarioResult['inverterComparison'] = undefined;
    if (inverter.enabled && inverter.compareManufacturers && inverter.products.length > 1) {
      inverterComparison = compareManufacturers(dcMWp, acMWac, inverter.products);
    }

    return {
      dcAcRatio: Math.round(ratio * 100) / 100,
      dcMWp: Math.round(dcMWp * 100) / 100,
      acMWac: Math.round(acMWac * 100) / 100,
      p50,
      p90,
      isRobustOptimum: false,
      inverterComparison,
    };
  });

  if (combinedResults.length === 0) return [];

  // Calculate marginals for both P50 and P90 individually
  calculateMarginals(combinedResults.map(r => r.p50));
  calculateMarginals(combinedResults.map(r => r.p90));

  // Determine individual optimums on the P50 track
  const p50s = combinedResults.map(r => r.p50);
  const minClipP50 = p50s.reduce((a, b) => a.clippingPercent <= b.clippingPercent ? a : b);
  minClipP50.isOptimalTechnical = true;

  const maxEconP50 = p50s.reduce((a, b) => {
    if (capex.enabled && a.npv !== undefined && b.npv !== undefined) {
      return a.npv >= b.npv ? a : b;
    }
    return a.lifetimeRevenueMarket >= b.lifetimeRevenueMarket ? a : b;
  });
  maxEconP50.isOptimalEconomic = true;

  const maxEconVal = Math.max(...p50s.map(r => r.npv ?? r.lifetimeRevenueMarket), 1);
  const maxMarginalVal = Math.max(...p50s.map(r => r.marginalRevenuePerMWpMarket), 1);
  const maxFLH = Math.max(...p50s.map(r => r.fullLoadHoursAC), 1);

  const balancedOptimumP50 = p50s.reduce((a, b) => {
    const econA = a.npv ?? a.lifetimeRevenueMarket;
    const econB = b.npv ?? b.lifetimeRevenueMarket;
    
    const scoreA = 0.4 * (Math.max(0, econA) / maxEconVal) +
      0.3 * (1 - Math.min(a.clippingPercent / 100, 1)) +
      0.2 * (a.fullLoadHoursAC / maxFLH) +
      0.1 * (a.marginalRevenuePerMWpMarket / maxMarginalVal);
      
    const scoreB = 0.4 * (Math.max(0, econB) / maxEconVal) +
      0.3 * (1 - Math.min(b.clippingPercent / 100, 1)) +
      0.2 * (b.fullLoadHoursAC / maxFLH) +
      0.1 * (b.marginalRevenuePerMWpMarket / maxMarginalVal);
      
    return scoreA >= scoreB ? a : b;
  });
  balancedOptimumP50.isOptimalMarginal = true;

  // ROBUST OPTIMUM LOGIC:
  // We want the scenario that maximizes P50 NPV but ensures that the MARGINAL return in the P90 case is strictly positive.
  // If no marginal steps are positive under P90 (e.g. low prices), we fallback to the highest P90 NPV.
  let robustOptimum = combinedResults[0];
  let maxRobustScore = -Infinity;
  
  for (const res of combinedResults) {
    // If marginal revenue under P90 is negative (or zero after the first step), it means we are overbuilding for the downside case.
    // Score heavily favors P50 economics, but strictly limits overbuilding risk under P90.
    const p50Score = res.p50.npv ?? res.p50.lifetimeRevenueMarket;
    const p90Marginal = res.p90.marginalRevenuePerMWpMarket;
    
    // As long as the P90 marginal revenue is greater than 0 (we aren't losing money on the extra DC capacity in the worst case)
    // we accept it as robust. We add a small bonus for P90 marginal strength.
    let score = p50Score;
    if (res.dcAcRatio > 1.0 && p90Marginal <= 0) {
      score -= 1e9; // penalize heavily if P90 marginal is negative
    } else {
      score += p90Marginal * 0.1; 
    }
    
    if (score > maxRobustScore) {
      maxRobustScore = score;
      robustOptimum = res;
    }
  }
  robustOptimum.isRobustOptimum = true;

  return combinedResults;
}
