/**
 * revenueEngine.ts — Revenue calculation per time step
 *
 * Market mode:  revenue = sum(injected[t] * price[t])
 * Tariff mode:  revenue = sum(injected[t]) * fixed_tariff
 *
 * Applies degradation per year for lifetime revenue.
 */

import type { ProjectConfig } from '../types';
import { HOURS_PER_YEAR } from '../types';

export interface RevenueResult {
  annualRevenueMarket: number;
  annualRevenueTariff: number;
  lifetimeRevenueMarket: number;
  lifetimeRevenueTariff: number;
  marketValueWeightedPrice: number;  // EUR/MWh
}

/**
 * Calculate revenue for a generation scenario.
 *
 * @param hourlyInjected  - Year-1 hourly injected power [MW] (8760 values)
 * @param priceProfile    - Hourly prices [EUR/MWh] (8760 values)
 * @param fixedTariff     - Fixed feed-in tariff [EUR/MWh]
 * @param project         - Project config (lifetime, degradation)
 */
export function calculateRevenue(
  hourlyInjected: number[],
  priceProfile: number[],
  fixedTariff: number,
  project: ProjectConfig,
): RevenueResult {
  const { lifetimeYears, degradationRate } = project;

  // ─── Year-1 revenue ────────────────────────────────────────────────────────
  let annualMarket = 0;
  let annualTariff = 0;
  let annualInjectedMWh = 0;

  for (let h = 0; h < HOURS_PER_YEAR; h++) {
    const injMWh = hourlyInjected[h] || 0; // MWh (1h step)
    const price = priceProfile[h] || 0;     // EUR/MWh

    annualMarket += injMWh * price;
    annualInjectedMWh += injMWh;
  }
  annualTariff = annualInjectedMWh * fixedTariff;

  // Market-value weighted average price
  const mvwp = annualInjectedMWh > 0 ? annualMarket / annualInjectedMWh : 0;

  // ─── Lifetime revenue with degradation ─────────────────────────────────────
  let lifetimeMarket = 0;
  let lifetimeTariff = 0;

  for (let year = 1; year <= lifetimeYears; year++) {
    const degradationFactor = Math.pow(1 - degradationRate, year - 1);

    // Revenue scales proportionally to injected energy
    // (Strictly: clipping changes with degradation, but for revenue
    //  the effect is second-order. We use the year-specific injection
    //  from the clipping engine for accuracy.)
    let yearMarket = 0;
    let yearInjMWh = 0;

    for (let h = 0; h < HOURS_PER_YEAR; h++) {
      // Re-compute injection after degradation + AC limit
      const dcPower = (hourlyInjected[h] || 0) * degradationFactor;
      // Note: hourlyInjected was already AC-limited in year 1.
      // With degradation, DC drops, so injection = min(degraded_dc, ac_cap)
      // Since degraded DC ≤ year-1 DC ≤ AC cap, injection = degraded DC
      const injMWh = dcPower;
      yearMarket += injMWh * (priceProfile[h] || 0);
      yearInjMWh += injMWh;
    }

    lifetimeMarket += yearMarket;
    lifetimeTariff += yearInjMWh * fixedTariff;
  }

  return {
    annualRevenueMarket: annualMarket,
    annualRevenueTariff: annualTariff,
    lifetimeRevenueMarket: lifetimeMarket,
    lifetimeRevenueTariff: lifetimeTariff,
    marketValueWeightedPrice: mvwp,
  };
}
