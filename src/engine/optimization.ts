/**
 * optimization.ts — DC/AC ratio scenario comparison
 *
 * Generates a sweep of DC/AC ratios, runs clipping + revenue for each,
 * identifies optimal scenarios, and flags warnings.
 */

import type {
  ProjectConfig, PowerConfig, PriceConfig, CapexConfig,
  Orientation, ScenarioResult,
} from '../types';
import { DEFAULT_RATIO_STEPS } from '../types';
import { generateProfile } from './generationProfiles';
import { simulateClipping } from './clippingEngine';
import { calculateRevenue } from './revenueEngine';

/**
 * Run the full DC/AC optimization sweep.
 *
 * @param project     - Project configuration
 * @param power       - Power configuration (mode, capacities)
 * @param orientation - PV array orientation
 * @param price       - Price configuration
 * @param capex       - Optional CAPEX configuration
 * @returns ScenarioResult[] — one per DC/AC ratio step
 */
export function runOptimization(
  project: ProjectConfig,
  power: PowerConfig,
  orientation: Orientation,
  price: PriceConfig,
  capex: CapexConfig,
): ScenarioResult[] {
  // Generate the hourly generation profile
  const profile = generateProfile(orientation);

  // Determine which scenarios to run based on mode
  const scenarios: Array<{ dcMWp: number; acMWac: number; ratio: number }> = [];

  const ratioSteps = DEFAULT_RATIO_STEPS;

  switch (power.mode) {
    case 'ac_fixed': {
      // AC is fixed, sweep DC via ratio
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
      // DC is fixed, sweep AC via ratio
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
      // Just the single user-defined point
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

    // Optional CAPEX
    let totalCapex: number | undefined;
    let npv: number | undefined;
    let simplePaybackYears: number | undefined;
    let annualCashflows: number[] | undefined;

    if (capex.enabled) {
      totalCapex = dcMWp * capex.capexPerMWpDC + acMWac * capex.capexPerMWacAC;
      const annualOpex = (dcMWp + acMWac) / 2 * capex.opexPerMWYear;

      annualCashflows = [];
      let cumulativeCF = -totalCapex;
      let npvCalc = -totalCapex;
      let paybackFound = false;

      for (let y = 1; y <= project.lifetimeYears; y++) {
        const degFactor = Math.pow(1 - project.degradationRate, y - 1);
        const yearRevenue = revenue.annualRevenueMarket * degFactor;
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
      lifetimeRevenueMarket: revenue.lifetimeRevenueMarket,
      lifetimeRevenueTariff: revenue.lifetimeRevenueTariff,
      revenuePerMWpMarket: dcMWp > 0 ? revenue.lifetimeRevenueMarket / dcMWp : 0,
      revenuePerMWacMarket: acMWac > 0 ? revenue.lifetimeRevenueMarket / acMWac : 0,
      revenuePerMWpTariff: dcMWp > 0 ? revenue.lifetimeRevenueTariff / dcMWp : 0,
      revenuePerMWacTariff: acMWac > 0 ? revenue.lifetimeRevenueTariff / acMWac : 0,
      marginalRevenueMarket: 0, // Set below
      marginalRevenueTariff: 0,
      marketValueWeightedPrice: revenue.marketValueWeightedPrice,

      isOptimalTechnical: false,
      isOptimalEconomic: false,
      isOptimalMarginal: false,
      clippingWarning: false,

      totalCapex,
      npv,
      simplePaybackYears,
      annualCashflows,

      hourlyGenerated: clipping.hourlyGenerated,
      hourlyInjected: clipping.hourlyInjected,
      hourlyClipped: clipping.hourlyClipped,
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
    // Technical optimal: lowest clipping %
    const minClip = results.reduce((a, b) =>
      a.clippingPercent <= b.clippingPercent ? a : b);
    minClip.isOptimalTechnical = true;

    // Economic optimal: highest lifetime market revenue
    const maxRev = results.reduce((a, b) =>
      a.lifetimeRevenueMarket >= b.lifetimeRevenueMarket ? a : b);
    maxRev.isOptimalEconomic = true;

    // Marginal optimal: highest marginal revenue (excluding first)
    const marginals = results.filter(r => r.marginalRevenueMarket > 0);
    if (marginals.length > 0) {
      const maxMarg = marginals.reduce((a, b) =>
        a.marginalRevenueMarket >= b.marginalRevenueMarket ? a : b);
      maxMarg.isOptimalMarginal = true;
    }

    // Clipping warning: if marginal clipping > 50% for incremental DC
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
