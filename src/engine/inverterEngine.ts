import type { InverterProduct, InverterResult } from '../types';

// Small epsilon for floating-point comparisons
const EPSILON = 1e-6;

/**
 * Creates a safe default InverterResult when inputs are invalid (e.g. zero capacities).
 */
function createDefaultResult(product: InverterProduct, targetExportAcMW: number): InverterResult {
  return {
    manufacturer: product.manufacturer,
    productName: product.productName,
    maxOversizingRatio: product.maxDcAcOversizingRatio,
    targetExportAcMW,
    requiredInverterAcMW: 0,
    numberOfUnits: 0,
    actualInstalledInverterAcMW: 0,
    additionalInverterAcMW: 0,
    projectDcExportRatio: 0,
    inverterLoadingRatio: 0,
    inverterCapex: 0,
    additionalCapexVsBaseline: 0,
    isFeasible: false,
    feasibilityStatus: 'not_feasible',
    statusMessage: 'Invalid input: DC capacity, export AC, or unit capacity is zero.',
  };
}

/**
 * Calculate inverter requirements for a given DC capacity, target export AC, and inverter product.
 *
 * Steps:
 *  1. Determine minimum inverter AC capacity from DC/AC oversizing constraint
 *  2. Ensure we never install less inverter capacity than the export target
 *  3. Round up to whole inverter units
 *  4. Derive loading ratios, feasibility, and CAPEX
 */
export function calculateInverterRequirements(
  dcMWp: number,
  targetExportAcMW: number,
  product: InverterProduct,
): InverterResult {
  // ── Guard against invalid / zero inputs ──────────────────────────────
  if (
    dcMWp <= 0 ||
    targetExportAcMW <= 0 ||
    product.unitAcCapacityMW <= 0 ||
    product.maxDcAcOversizingRatio <= 0
  ) {
    return createDefaultResult(product, targetExportAcMW);
  }

  // ── 1. Minimum inverter AC capacity to stay within oversizing limit ──
  let requiredInverterAcMW = dcMWp / product.maxDcAcOversizingRatio;

  // ── 2. Never install less inverter AC than the export target ─────────
  requiredInverterAcMW = Math.max(requiredInverterAcMW, targetExportAcMW);

  // ── 3. Number of discrete inverter units (round up) ──────────────────
  const numberOfUnits = Math.ceil(requiredInverterAcMW / product.unitAcCapacityMW);

  // ── 4. Actual installed inverter AC capacity ─────────────────────────
  const actualInstalledInverterAcMW = numberOfUnits * product.unitAcCapacityMW;

  // ── 5. Additional inverter AC above the export target ────────────────
  const additionalInverterAcMW = Math.max(actualInstalledInverterAcMW - targetExportAcMW, 0);

  // ── 6. Project-level DC / Export-AC ratio ────────────────────────────
  const projectDcExportRatio = dcMWp / targetExportAcMW;

  // ── 7. Inverter loading ratio (DC / installed inverter AC) ───────────
  const inverterLoadingRatio =
    actualInstalledInverterAcMW > 0 ? dcMWp / actualInstalledInverterAcMW : 0;

  // ── 8. Feasibility check (with epsilon tolerance) ────────────────────
  const isFeasible = inverterLoadingRatio <= product.maxDcAcOversizingRatio + EPSILON;

  // ── 9. CAPEX calculation ─────────────────────────────────────────────
  //   Priority: per-unit cost → per-MWac cost → 0
  let inverterCapex = 0;
  if (product.capexPerUnit !== undefined && product.capexPerUnit > 0) {
    inverterCapex = numberOfUnits * product.capexPerUnit;
  } else if (product.capexPerMWac !== undefined && product.capexPerMWac > 0) {
    // capexPerMWac is stored in EUR/MWac (e.g. 45 000 EUR/MWac)
    inverterCapex = actualInstalledInverterAcMW * product.capexPerMWac;
  }

  // ── 10. Feasibility status & human-readable message ──────────────────
  let feasibilityStatus: InverterResult['feasibilityStatus'];
  let statusMessage: string;

  if (!isFeasible) {
    feasibilityStatus = 'not_feasible';
    statusMessage =
      `Not feasible: inverter loading ratio (${inverterLoadingRatio.toFixed(2)}×) ` +
      `exceeds ${product.manufacturer} ${product.productName} maximum of ${product.maxDcAcOversizingRatio}×.`;
  } else if (additionalInverterAcMW > 0.01) {
    feasibilityStatus = 'feasible_additional_capacity';
    statusMessage =
      `Feasible with additional capacity: ${additionalInverterAcMW.toFixed(3)} MWac ` +
      `extra inverter capacity beyond the ${targetExportAcMW} MWac export target ` +
      `(${numberOfUnits}× ${product.productName} units installed).`;
  } else {
    feasibilityStatus = 'feasible';
    statusMessage =
      `Directly feasible: ${numberOfUnits}× ${product.productName} ` +
      `(${actualInstalledInverterAcMW.toFixed(3)} MWac) meets the ${targetExportAcMW} MWac export target ` +
      `at a ${inverterLoadingRatio.toFixed(2)}× loading ratio.`;
  }

  // ── 11. Baseline comparison placeholder (set by compareManufacturers) ─
  const additionalCapexVsBaseline = 0;

  return {
    manufacturer: product.manufacturer,
    productName: product.productName,
    maxOversizingRatio: product.maxDcAcOversizingRatio,
    targetExportAcMW,
    requiredInverterAcMW,
    numberOfUnits,
    actualInstalledInverterAcMW,
    additionalInverterAcMW,
    projectDcExportRatio,
    inverterLoadingRatio,
    inverterCapex,
    additionalCapexVsBaseline,
    isFeasible,
    feasibilityStatus,
    statusMessage,
  };
}

/**
 * Compare inverter requirements across multiple manufacturer products.
 *
 * Returns one InverterResult per product. Additionally calculates
 * `additionalCapexVsBaseline` relative to the cheapest feasible option,
 * making it easy to see the incremental cost of each alternative.
 */
export function compareManufacturers(
  dcMWp: number,
  targetExportAcMW: number,
  products: InverterProduct[],
): InverterResult[] {
  // Calculate individual results
  const results = products.map((p) =>
    calculateInverterRequirements(dcMWp, targetExportAcMW, p),
  );

  // Find the minimum inverter CAPEX among feasible results
  const feasibleResults = results.filter((r) => r.isFeasible);
  const minCapex =
    feasibleResults.length > 0
      ? Math.min(...feasibleResults.map((r) => r.inverterCapex))
      : 0;

  // Set additionalCapexVsBaseline: delta from the cheapest feasible option
  for (const r of results) {
    r.additionalCapexVsBaseline = r.isFeasible ? r.inverterCapex - minCapex : 0;
  }

  return results;
}
