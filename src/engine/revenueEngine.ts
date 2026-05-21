/**
 * revenueEngine.ts — Revenue calculation per time step
 *
 * Market mode:  revenue = sum(injected[t] * price[t])
 * Tariff mode:  revenue = sum(injected[t]) * fixed_tariff
 *
 * Applies degradation per year and price escalation for lifetime revenue.
 */

import type { ProjectConfig, PriceConfig } from '../types';
import { HOURS_PER_YEAR } from '../types';

export interface RevenueResult {
  year1RevenueMarket: number;
  year1RevenueTariff: number;
  lifetimeRevenueMarket: number;
  lifetimeRevenueTariff: number;
  year1ClippingLossMarket: number;
  lifetimeClippingLossMarket: number;
  averageMarketPrice: number;
  capturePriceMarket: number;
  marketCaptureFactor: number;
}

/**
 * Calculate revenue for a generation scenario.
 *
 * @param hourlyGenerated - Year-1 hourly generated power before clipping [MW] (8760 values)
 * @param hourlyInjected  - Year-1 hourly injected power after clipping [MW] (8760 values)
 * @param priceConfig     - Price configuration (profile, tariff, escalation)
 * @param project         - Project config (lifetime, degradation)
 */
export function calculateRevenue(
  hourlyGenerated: number[],
  hourlyInjected: number[],
  priceConfig: PriceConfig,
  project: ProjectConfig,
): RevenueResult {
  const { lifetimeYears, degradationRate } = project;
  const { priceProfile, fixedTariffEurMWh, priceEscalation, tariffEscalation } = priceConfig;

  // ─── Year-1 revenue ────────────────────────────────────────────────────────
  let year1Market = 0;
  let year1Tariff = 0;
  let year1InjectedMWh = 0;
  let year1ClippingLoss = 0;
  let sumPrice = 0;

  for (let h = 0; h < HOURS_PER_YEAR; h++) {
    const genMWh = hourlyGenerated[h] || 0;
    const injMWh = hourlyInjected[h] || 0;
    const clippedMWh = Math.max(0, genMWh - injMWh);
    const price = priceProfile[h] || 0;

    year1Market += injMWh * price;
    year1InjectedMWh += injMWh;
    year1ClippingLoss += clippedMWh * price;
    sumPrice += price;
  }
  year1Tariff = year1InjectedMWh * fixedTariffEurMWh;

  // Capture price and average price
  const averageMarketPrice = HOURS_PER_YEAR > 0 ? sumPrice / HOURS_PER_YEAR : 0;
  const capturePriceMarket = year1InjectedMWh > 0 ? year1Market / year1InjectedMWh : 0;
  const marketCaptureFactor = averageMarketPrice !== 0 ? capturePriceMarket / averageMarketPrice : 0;

  // ─── Lifetime revenue with degradation and escalation ──────────────────────
  let lifetimeMarket = 0;
  let lifetimeTariff = 0;
  let lifetimeClippingLoss = 0;

  // To be perfectly rigorous, we should recalculate the AC limit per hour for each year.
  // We can approximate the hour-by-hour degradation:
  // Degraded DC generation = year 1 generation * degradationFactor
  // Injected = min(Degraded DC generation, ac_cap)
  // However, we don't have ac_cap passed in directly here. Wait, we DO know
  // that hourlyInjected is min(hourlyGenerated, ac_cap).
  // Thus ac_cap = max(hourlyInjected).
  
  let acCap = 0;
  for (let h = 0; h < HOURS_PER_YEAR; h++) {
    if (hourlyInjected[h] > acCap) acCap = hourlyInjected[h];
  }

  for (let year = 1; year <= lifetimeYears; year++) {
    const degradationFactor = Math.pow(1 - degradationRate, year - 1);
    const priceEscalator = Math.pow(1 + (priceEscalation || 0), year - 1);
    const tariffEscalator = Math.pow(1 + (tariffEscalation || 0), year - 1);

    let yearMarket = 0;
    let yearInjMWh = 0;
    let yearClipLoss = 0;

    for (let h = 0; h < HOURS_PER_YEAR; h++) {
      const degradedGen = (hourlyGenerated[h] || 0) * degradationFactor;
      const injMWh = Math.min(degradedGen, acCap);
      const clippedMWh = Math.max(0, degradedGen - injMWh);
      
      const price = (priceProfile[h] || 0) * priceEscalator;
      
      yearMarket += injMWh * price;
      yearInjMWh += injMWh;
      yearClipLoss += clippedMWh * price;
    }

    lifetimeMarket += yearMarket;
    lifetimeTariff += yearInjMWh * (fixedTariffEurMWh * tariffEscalator);
    lifetimeClippingLoss += yearClipLoss;
  }

  return {
    year1RevenueMarket: year1Market,
    year1RevenueTariff: year1Tariff,
    lifetimeRevenueMarket: lifetimeMarket,
    lifetimeRevenueTariff: lifetimeTariff,
    year1ClippingLossMarket: year1ClippingLoss,
    lifetimeClippingLossMarket: lifetimeClippingLoss,
    averageMarketPrice,
    capturePriceMarket,
    marketCaptureFactor,
  };
}
