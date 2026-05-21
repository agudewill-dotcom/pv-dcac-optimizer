/**
 * priceData.ts — Electricity price profiles for revenue calculation
 *
 * Provides:
 * 1. Real German DE-LU day-ahead auction prices from SMARD.de (2024, CC BY 4.0)
 * 2. CSV import parser for user-supplied price data
 *
 * Default price profile: SMARD.de 2024 hourly day-ahead auction (8760h)
 * Source: Bundesnetzagentur | SMARD.de via Energy-Charts API
 * License: CC BY 4.0 (creativecommons.org/licenses/by/4.0)
 */

import { HOURS_PER_YEAR } from '../types';
import { SMARD_2024_PRICES } from '../data/smard2024';

export interface PriceStats {
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  negativeHours: number;
  missingHours: number;
  totalHours: number;
}

/**
 * Return the SMARD 2024 DE-LU day-ahead price profile (8760 hours, EUR/MWh).
 * This is real market data from Bundesnetzagentur | SMARD.de.
 */
export function getDefaultPriceProfile(): number[] {
  // Return a copy to prevent mutation
  return SMARD_2024_PRICES.slice(0, HOURS_PER_YEAR);
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
export function parsePriceCSV(csvText: string): { prices: number[]; missingHours: number; warnings: string[] } {
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
    return { prices: getDefaultPriceProfile(), missingHours: HOURS_PER_YEAR, warnings };
  }

  let missingHours = 0;
  if (prices.length < HOURS_PER_YEAR) {
    missingHours = HOURS_PER_YEAR - prices.length;
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    warnings.push(`Only ${prices.length} price values found. Padding remaining ${missingHours} hours with mean (${mean.toFixed(1)} EUR/MWh).`);
    while (prices.length < HOURS_PER_YEAR) {
      prices.push(mean);
    }
  }

  return { prices: prices.slice(0, HOURS_PER_YEAR), missingHours, warnings };
}

/**
 * Get detailed stats from a price profile.
 */
export function getPriceStats(prices: number[], missingHours: number = 0): PriceStats {
  if (prices.length === 0) {
    return { averagePrice: 0, minPrice: 0, maxPrice: 0, negativeHours: 0, missingHours, totalHours: 0 };
  }
  let sum = 0, min = prices[0], max = prices[0], neg = 0;
  for (const p of prices) {
    sum += p;
    if (p < min) min = p;
    if (p > max) max = p;
    if (p < 0) neg++;
  }
  return {
    averagePrice: sum / prices.length,
    minPrice: min,
    maxPrice: max,
    negativeHours: neg,
    missingHours,
    totalHours: prices.length
  };
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
  if (prices.length === 0) return getDailyPriceShape(SMARD_2024_PRICES);

  const daily = new Array(24).fill(0);
  const counts = new Array(24).fill(0);

  for (let h = 0; h < Math.min(prices.length, HOURS_PER_YEAR); h++) {
    const hod = h % 24;
    daily[hod] += prices[h];
    counts[hod]++;
  }

  return daily.map((sum, i) => counts[i] > 0 ? sum / counts[i] : 0);
}
