/**
 * clippingEngine.ts — Time-step generation, AC-limiting, and clipping
 *
 * Core physics:
 *   dc_power[t] = profile[t] * dcMWp * availability * (1 - curtailment)
 *   ac_power[t] = min(dc_power[t], acMWac)
 *   clipped[t]  = max(dc_power[t] - acMWac, 0)
 *
 * Degradation applied per year:
 *   generation_year_n = generation_year_1 * (1 - degradation)^(n-1)
 */

import type { ProjectConfig } from '../types';
import { HOURS_PER_YEAR } from '../types';

export interface ClippingResult {
  // Year-1 metrics
  annualGeneratedMWh: number;
  annualInjectedMWh: number;
  annualClippedMWh: number;

  // Lifetime metrics
  lifetimeGeneratedMWh: number;
  lifetimeInjectedMWh: number;
  lifetimeClippedMWh: number;
  clippingPercent: number;

  // Derived
  capacityFactorAC: number;
  fullLoadHoursAC: number;
  fullLoadHoursDC: number;

  // Hourly time series (year 1 only, for charting)
  hourlyGenerated: number[];
  hourlyInjected: number[];
  hourlyClipped: number[];
}

/**
 * Run the clipping simulation for one DC/AC scenario.
 *
 * @param profile     - 8760 normalized capacity factors (0-1)
 * @param dcMWp       - DC generator capacity in MWp
 * @param acMWac      - AC export capacity in MWac
 * @param project     - Project config (lifetime, degradation, availability, curtailment)
 */
export function simulateClipping(
  profile: number[],
  dcMWp: number,
  acMWac: number,
  project: ProjectConfig,
): ClippingResult {
  const { lifetimeYears, degradationRate, availabilityFactor, curtailmentFactor } = project;

  // ─── Year-1 hourly simulation ──────────────────────────────────────────────
  const hourlyGenerated = new Array<number>(HOURS_PER_YEAR);
  const hourlyInjected = new Array<number>(HOURS_PER_YEAR);
  const hourlyClipped = new Array<number>(HOURS_PER_YEAR);

  let annualGenMWh = 0;
  let annualInjMWh = 0;
  let annualClipMWh = 0;

  for (let h = 0; h < HOURS_PER_YEAR; h++) {
    // DC-side power in MW (1 hour = 1 MWh per MW)
    const dcPower = profile[h] * dcMWp * availabilityFactor * (1 - curtailmentFactor);

    const injected = Math.min(dcPower, acMWac);
    const clipped = Math.max(dcPower - acMWac, 0);

    hourlyGenerated[h] = dcPower;
    hourlyInjected[h] = injected;
    hourlyClipped[h] = clipped;

    annualGenMWh += dcPower;   // MWh (1h timestep)
    annualInjMWh += injected;
    annualClipMWh += clipped;
  }

  // ─── Lifetime aggregation with degradation ─────────────────────────────────
  let lifetimeGen = 0;
  let lifetimeInj = 0;
  let lifetimeClip = 0;

  for (let year = 1; year <= lifetimeYears; year++) {
    const degradationFactor = Math.pow(1 - degradationRate, year - 1);
    // Degradation reduces DC power, which reduces both injection and clipping
    // We re-run the clipping logic per year since lower DC may reduce clipping
    let yearGen = 0;
    let yearInj = 0;
    let yearClip = 0;

    for (let h = 0; h < HOURS_PER_YEAR; h++) {
      const dcPower = hourlyGenerated[h] * degradationFactor;
      const injected = Math.min(dcPower, acMWac);
      const clipped = Math.max(dcPower - acMWac, 0);
      yearGen += dcPower;
      yearInj += injected;
      yearClip += clipped;
    }

    lifetimeGen += yearGen;
    lifetimeInj += yearInj;
    lifetimeClip += yearClip;
  }

  // ─── Derived metrics ───────────────────────────────────────────────────────
  const clippingPercent = lifetimeGen > 0 ? (lifetimeClip / lifetimeGen) * 100 : 0;
  const capacityFactorAC = acMWac > 0 ? annualInjMWh / (acMWac * HOURS_PER_YEAR) : 0;
  const fullLoadHoursAC = acMWac > 0 ? annualInjMWh / acMWac : 0;
  const fullLoadHoursDC = dcMWp > 0 ? annualGenMWh / dcMWp : 0;

  return {
    annualGeneratedMWh: annualGenMWh,
    annualInjectedMWh: annualInjMWh,
    annualClippedMWh: annualClipMWh,
    lifetimeGeneratedMWh: lifetimeGen,
    lifetimeInjectedMWh: lifetimeInj,
    lifetimeClippedMWh: lifetimeClip,
    clippingPercent,
    capacityFactorAC,
    fullLoadHoursAC,
    fullLoadHoursDC,
    hourlyGenerated,
    hourlyInjected,
    hourlyClipped,
  };
}
