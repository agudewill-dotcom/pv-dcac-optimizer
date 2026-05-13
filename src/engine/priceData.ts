/**
 * priceData.ts — Electricity price profiles for revenue calculation
 *
 * Provides:
 * 1. Sample German day-ahead price profile (representative hourly shape)
 * 2. CSV import parser for user-supplied price data
 *
 * Sample profile based on typical German 2023/2024 day-ahead patterns:
 * - Lower overnight prices (~40-55 EUR/MWh)
 * - Morning ramp-up
 * - Midday solar dip (duck curve effect, ~45-65 EUR/MWh)
 * - Evening peak (~80-100 EUR/MWh)
 * - Seasonal variation: higher winter prices, lower summer
 */

import { HOURS_PER_YEAR } from '../types';

// ─── Typical German hourly price shape (24h pattern, EUR/MWh) ────────────────
// Representative 2023/2024 average day-ahead pattern
const HOURLY_SHAPE = [
  48, 45, 42, 40, 42, 52, 68, 82, 78, 65, 55, 50,  // 00:00-11:00
  48, 50, 52, 58, 72, 90, 95, 85, 72, 62, 55, 50,  // 12:00-23:00
];

// Monthly price adjustment factors (relative to annual mean)
// Winter higher, summer lower (solar suppression effect)
const MONTHLY_PRICE_FACTOR = [
  1.15, 1.10, 1.00, 0.92, 0.85, 0.82,
  0.80, 0.83, 0.90, 1.00, 1.12, 1.18,
];

function getMonthFromHour(h: number): number {
  const doy = Math.floor(h / 24);
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let acc = 0;
  for (let m = 0; m < 12; m++) {
    acc += daysInMonth[m];
    if (doy < acc) return m;
  }
  return 11;
}

/**
 * Generate a sample German day-ahead price profile (8760 hours).
 * Clearly labeled as sample data for pre-feasibility use only.
 */
export function generateSamplePriceProfile(): number[] {
  const profile = new Array<number>(HOURS_PER_YEAR);

  for (let h = 0; h < HOURS_PER_YEAR; h++) {
    const hod = h % 24;
    const month = getMonthFromHour(h);

    // Base hourly shape × monthly factor
    profile[h] = HOURLY_SHAPE[hod] * MONTHLY_PRICE_FACTOR[month];

    // Add some weekend discount (Sat/Sun ~15% lower)
    const dow = Math.floor(h / 24) % 7; // 0=Mon (Jan 1 2024 was Mon)
    if (dow >= 5) {
      profile[h] *= 0.85;
    }
  }

  return profile;
}

/**
 * Parse a CSV string into an 8760-hour price profile.
 *
 * Expected format:
 *   timestamp,price_EUR_per_MWh
 *   2024-01-01 00:00,48.5
 *   2024-01-01 01:00,45.2
 *   ...
 *
 * If fewer than 8760 rows, pads with the mean of available data.
 * If more than 8760 rows, truncates.
 */
export function parsePriceCSV(csvText: string): { prices: number[]; warnings: string[] } {
  const warnings: string[] = [];
  const lines = csvText.trim().split('\n');

  // Skip header if present
  let startIdx = 0;
  if (lines[0] && isNaN(parseFloat(lines[0].split(',').pop() || ''))) {
    startIdx = 1;
  }

  const prices: number[] = [];
  for (let i = startIdx; i < lines.length && prices.length < HOURS_PER_YEAR; i++) {
    const parts = lines[i].split(',');
    const priceStr = parts[parts.length - 1]?.trim();
    const price = parseFloat(priceStr);
    if (!isNaN(price)) {
      prices.push(price);
    }
  }

  if (prices.length === 0) {
    warnings.push('No valid price data found in CSV.');
    return { prices: generateSamplePriceProfile(), warnings };
  }

  if (prices.length < HOURS_PER_YEAR) {
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    warnings.push(`Only ${prices.length} price values found. Padding remaining ${HOURS_PER_YEAR - prices.length} hours with mean (${mean.toFixed(1)} EUR/MWh).`);
    while (prices.length < HOURS_PER_YEAR) {
      prices.push(mean);
    }
  }

  return { prices: prices.slice(0, HOURS_PER_YEAR), warnings };
}

/**
 * Get average price from a price profile.
 */
export function getAveragePrice(prices: number[]): number {
  if (prices.length === 0) return 0;
  return prices.reduce((a, b) => a + b, 0) / prices.length;
}

/**
 * Get a 24h average daily price shape for chart display.
 */
export function getDailyPriceShape(prices: number[]): number[] {
  if (prices.length === 0) return HOURLY_SHAPE;

  const daily = new Array(24).fill(0);
  const counts = new Array(24).fill(0);

  for (let h = 0; h < Math.min(prices.length, HOURS_PER_YEAR); h++) {
    const hod = h % 24;
    daily[hod] += prices[h];
    counts[hod]++;
  }

  return daily.map((sum, i) => counts[i] > 0 ? sum / counts[i] : 0);
}
