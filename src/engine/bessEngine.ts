/**
 * bessEngine.ts — Battery Energy Storage System simulation
 *
 * The BESS captures clipped energy (energy that would be lost due to
 * AC export limits) and dispatches it during higher-price hours.
 *
 * Strategy: "Clip-to-store, dispatch at peak price"
 *   1. During each hour, if clipped energy > 0, charge the battery
 *      (limited by BESS power and remaining capacity)
 *   2. At end of each day, dispatch stored energy during the highest-price
 *      hours that have AC headroom (injected < AC capacity)
 *
 * Parameters:
 *   - Duration: 2h or 4h (determines MWh capacity = power × duration)
 *   - Power: MW rating (charge and discharge rate)
 *   - Round-trip efficiency: typically 85-90%
 *   - Max cycles/day: typically 1 for grid-scale BESS
 */

import type { BessConfig } from '../types';
import { HOURS_PER_YEAR } from '../types';

export interface BessResult {
  // Year-1 metrics
  annualRecoveredMWh: number;      // energy injected by BESS (after RT losses)
  annualChargedMWh: number;        // energy absorbed from clipping
  annualBessRevenueDelta: number;  // additional revenue vs selling at clipping hour

  // Hourly data for charts
  hourlyBessCharge: number[];      // 8760: MW charging per hour
  hourlyBessDischarge: number[];   // 8760: MW discharging per hour
  hourlyBessSOC: number[];         // 8760: state of charge MWh
}

/**
 * Simulate BESS operation for one year.
 *
 * @param hourlyClipped   - Clipped power per hour [MW] (8760 values)
 * @param hourlyInjected  - Injected power per hour [MW] (8760 values)
 * @param acCapacityMW    - AC export limit [MW]
 * @param priceProfile    - Hourly prices [EUR/MWh] (8760 values)
 * @param bess            - BESS configuration
 */
export function simulateBess(
  hourlyClipped: number[],
  hourlyInjected: number[],
  acCapacityMW: number,
  priceProfile: number[],
  bess: BessConfig,
): BessResult {
  if (bess.duration === 'none') {
    return emptyResult();
  }

  const durationHours = bess.duration === '4h' ? 4 : 2;
  const capacityMWh = bess.powerMW * durationHours;
  const maxDailyDischarge = capacityMWh * bess.maxCycles;

  const hourlyCharge = new Array<number>(HOURS_PER_YEAR).fill(0);
  const hourlyDischarge = new Array<number>(HOURS_PER_YEAR).fill(0);
  const hourlySOC = new Array<number>(HOURS_PER_YEAR).fill(0);

  let totalCharged = 0;
  let totalDischarged = 0;

  // Process day by day (365 days)
  for (let day = 0; day < 365; day++) {
    const dayStart = day * 24;
    const dayEnd = Math.min(dayStart + 24, HOURS_PER_YEAR);

    // ─── Phase 1: Charge from clipped energy ─────────────────────────────
    let soc = 0; // start of day SOC
    let dayCharged = 0;

    for (let h = dayStart; h < dayEnd; h++) {
      const clipped = hourlyClipped[h] || 0;
      if (clipped > 0 && soc < capacityMWh) {
        const chargeRate = Math.min(clipped, bess.powerMW);
        const spaceLeft = capacityMWh - soc;
        const charged = Math.min(chargeRate, spaceLeft);
        hourlyCharge[h] = charged;
        soc += charged;
        dayCharged += charged;
      }
      hourlySOC[h] = soc;
    }

    if (dayCharged <= 0) continue;

    // ─── Phase 2: Identify discharge hours ───────────────────────────────
    // Find hours with AC headroom, sorted by price (highest first)
    const candidates: Array<{ h: number; price: number; headroom: number }> = [];
    for (let h = dayStart; h < dayEnd; h++) {
      const headroom = acCapacityMW - (hourlyInjected[h] || 0);
      if (headroom > 0.01) {
        candidates.push({ h, price: priceProfile[h] || 0, headroom });
      }
    }
    candidates.sort((a, b) => b.price - a.price);

    // ─── Phase 3: Dispatch during highest-price hours ────────────────────
    let remainingDischarge = Math.min(
      soc * bess.roundTripEfficiency,
      maxDailyDischarge,
    );

    for (const { h, headroom } of candidates) {
      if (remainingDischarge <= 0.01) break;

      const dischargeRate = Math.min(bess.powerMW, headroom, remainingDischarge);
      hourlyDischarge[h] = dischargeRate;
      remainingDischarge -= dischargeRate;
    }

    totalCharged += dayCharged;
    totalDischarged += candidates.reduce((sum, c) => {
      const h = c.h;
      return sum + hourlyDischarge[h];
    }, 0);
  }

  return {
    annualRecoveredMWh: totalDischarged,
    annualChargedMWh: totalCharged,
    annualBessRevenueDelta: 0, // Calculated in revenue engine
    hourlyBessCharge: hourlyCharge,
    hourlyBessDischarge: hourlyDischarge,
    hourlyBessSOC: hourlySOC,
  };
}

function emptyResult(): BessResult {
  return {
    annualRecoveredMWh: 0,
    annualChargedMWh: 0,
    annualBessRevenueDelta: 0,
    hourlyBessCharge: new Array(HOURS_PER_YEAR).fill(0),
    hourlyBessDischarge: new Array(HOURS_PER_YEAR).fill(0),
    hourlyBessSOC: new Array(HOURS_PER_YEAR).fill(0),
  };
}
