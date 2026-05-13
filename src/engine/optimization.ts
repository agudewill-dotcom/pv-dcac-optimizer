/**
 * optimization.ts — DC/AC ratio scenario comparison
 *
 * Generates a sweep of DC/AC ratios, runs clipping + revenue + BESS for each,
 * identifies optimal scenarios, and flags warnings.
 */

import type {
  ProjectConfig, PowerConfig, PriceConfig, CapexConfig, BessConfig,
  Orientation, ScenarioResult,
} from '../types';
import { DEFAULT_RATIO_STEPS } from '../types';
import { generateProfile } from './generationProfiles';
import { simulateClipping } from './clippingEngine';
import { calculateRevenue } from './revenueEngine';
import { simulateBess } from './bessEngine';

/**
 * Run the full DC/AC optimization sweep.
 *
 * @param project     - Project configuration
 * @param power       - Power configuration (mode, capacities)
 * @param orientation - PV array orientation
 * @param price       - Price configuration
 * @param capex       - Optional CAPEX configuration
 * @param bess        - BESS configuration
 * @returns ScenarioResult[] — one per DC/AC ratio step
 */
export function runOptimization(
  project: ProjectConfig,
  power: PowerConfig,
  orientation: Orientation,
  price: PriceConfig,
  capex: CapexConfig,
  bess: BessConfig,
): ScenarioResult[] {
  // Generate the hourly generation profile
  const profile = generateProfile(orientation);

  // Determine which scenarios to run based on mode
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

  // Run simulation for each scenario
  const results: ScenarioResult[] = scenarios.map(({ dcMWp, acMWac, ratio }) => {
    const clipping = simulateClipping(profile, dcMWp, acMWac, project);
    const revenue = calculateRevenue(
      clipping.hourlyInjected,
      price.priceProfile,
      price.fixedTariffEurMWh,
      project,
    );

    // ─── BESS simulation ─────────────────────────────────────────────────
    const bessResult = simulateBess(
      clipping.hourlyClipped,
      clipping.hourlyInjected,
      acMWac,
      price.priceProfile,
      bess,
    );

    // BESS revenue: additional revenue from dispatching stored energy
    let bessRevenueMarket = 0;
    let bessRevenueTariff = 0;
    let lifetimeBessRecovered = 0;

    if (bess.duration !== 'none') {
      // Year-1 BESS revenue from dispatched energy
      for (let h = 0; h < bessResult.hourlyBessDischarge.length; h++) {
        const dischargeMWh = bessResult.hourlyBessDischarge[h];
        bessRevenueMarket += dischargeMWh * (price.priceProfile[h] || 0);
      }
      bessRevenueTariff = bessResult.annualRecoveredMWh * price.fixedTariffEurMWh;

      // Scale to lifetime with degradation
      // As modules degrade, less clipping → less BESS utilization
      for (let y = 1; y <= project.lifetimeYears; y++) {
        const degFactor = Math.pow(1 - project.degradationRate, y - 1);
        // BESS recovered scales roughly with clipping, which scales with DC output
        lifetimeBessRecovered += bessResult.annualRecoveredMWh * degFactor;
      }
      // Lifetime revenue scales similarly
      const lifetimeScale = lifetimeBessRecovered / Math.max(bessResult.annualRecoveredMWh, 0.001);
      bessRevenueMarket *= lifetimeScale;
      bessRevenueTariff *= lifetimeScale;
    }

    // Total revenue including BESS
    const totalLifetimeRevenueMarket = revenue.lifetimeRevenueMarket + bessRevenueMarket;
    const totalLifetimeRevenueTariff = revenue.lifetimeRevenueTariff + bessRevenueTariff;

    // ─── Optional CAPEX ──────────────────────────────────────────────────
    let totalCapex: number | undefined;
    let npv: number | undefined;
    let simplePaybackYears: number | undefined;
    let annualCashflows: number[] | undefined;

    if (capex.enabled) {
      totalCapex = dcMWp * capex.capexPerMWpDC + acMWac * capex.capexPerMWacAC;

      // Add BESS CAPEX if active
      if (bess.duration !== 'none') {
        const durationHours = bess.duration === '4h' ? 4 : 2;
        const bessCapacity = bess.powerMW * durationHours;
        totalCapex += bess.powerMW * capex.bessCapexPerMW + bessCapacity * capex.bessCapexPerMWh;
      }

      const annualOpex = (dcMWp + acMWac) / 2 * capex.opexPerMWYear;

      annualCashflows = [];
      let cumulativeCF = -totalCapex;
      let npvCalc = -totalCapex;
      let paybackFound = false;

      for (let y = 1; y <= project.lifetimeYears; y++) {
        const degFactor = Math.pow(1 - project.degradationRate, y - 1);
        const yearRevenue = (revenue.annualRevenueMarket + (bess.duration !== 'none' ? bessRevenueMarket / project.lifetimeYears : 0)) * degFactor;
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

      annualRevenueMarket: revenue.annualRevenueMarket,
      annualRevenueTariff: revenue.annualRevenueTariff,
      lifetimeRevenueMarket: totalLifetimeRevenueMarket,
      lifetimeRevenueTariff: totalLifetimeRevenueTariff,
      revenuePerMWpMarket: dcMWp > 0 ? totalLifetimeRevenueMarket / dcMWp : 0,
      revenuePerMWacMarket: acMWac > 0 ? totalLifetimeRevenueMarket / acMWac : 0,
      revenuePerMWpTariff: dcMWp > 0 ? totalLifetimeRevenueTariff / dcMWp : 0,
      revenuePerMWacTariff: acMWac > 0 ? totalLifetimeRevenueTariff / acMWac : 0,
      marginalRevenueMarket: 0,
      marginalRevenueTariff: 0,
      marketValueWeightedPrice: revenue.marketValueWeightedPrice,

      isOptimalTechnical: false,
      isOptimalEconomic: false,
      isOptimalMarginal: false,
      clippingWarning: false,

      // BESS metrics
      bessRecoveredMWh: lifetimeBessRecovered,
      bessRevenueMarket: bessRevenueMarket,
      bessRevenueTariff: bessRevenueTariff,
      annualBessRecoveredMWh: bessResult.annualRecoveredMWh,

      totalCapex,
      npv,
      simplePaybackYears,
      annualCashflows,

      hourlyGenerated: clipping.hourlyGenerated,
      hourlyInjected: clipping.hourlyInjected,
      hourlyClipped: clipping.hourlyClipped,
      hourlyBessDischarge: bessResult.hourlyBessDischarge,
    };
  });

  // ─── Calculate marginal revenue ────────────────────────────────────────────
  for (let i = 1; i < results.length; i++) {
    const prev = results[i - 1];
    const curr = results[i];
    const deltaDC = curr.dcMWp - prev.dcMWp;
    if (deltaDC > 0) {
      curr.marginalRevenueMarket =
        (curr.lifetimeRevenueMarket - prev.lifetimeRevenueMarket) / deltaDC;
      curr.marginalRevenueTariff =
        (curr.lifetimeRevenueTariff - prev.lifetimeRevenueTariff) / deltaDC;
    }
  }

  // ─── Identify optimal scenarios ────────────────────────────────────────────
  if (results.length > 0) {
    const minClip = results.reduce((a, b) =>
      a.clippingPercent <= b.clippingPercent ? a : b);
    minClip.isOptimalTechnical = true;

    const maxRev = results.reduce((a, b) =>
      a.lifetimeRevenueMarket >= b.lifetimeRevenueMarket ? a : b);
    maxRev.isOptimalEconomic = true;

    const marginals = results.filter(r => r.marginalRevenueMarket > 0);
    if (marginals.length > 0) {
      const maxMarg = marginals.reduce((a, b) =>
        a.marginalRevenueMarket >= b.marginalRevenueMarket ? a : b);
      maxMarg.isOptimalMarginal = true;
    }

    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1];
      const curr = results[i];
      const deltaGen = curr.lifetimeGeneratedMWh - prev.lifetimeGeneratedMWh;
      const deltaClip = curr.lifetimeClippedMWh - prev.lifetimeClippedMWh;
      if (deltaGen > 0 && (deltaClip / deltaGen) > 0.5) {
        curr.clippingWarning = true;
      }
    }
  }

  return results;
}
