/**
 * generationProfiles.ts — Normalized hourly PV generation profiles
 *
 * Creates synthetic 8760-hour capacity factor profiles for different
 * PV array orientations. These are illustrative profiles for comparative
 * analysis, NOT bankable yield data.
 *
 * Physics basis:
 * - Solar elevation via declination + hour angle
 * - Day length varies by latitude (default: 52°N, Central Germany)
 * - Clear-sky envelope modulated by monthly clearness index
 * - Orientation shifts peak generation timing
 *
 * Annual yield equivalents (at 52°N):
 *   South:       ~1050 kWh/kWp
 *   East-West:   ~970 kWh/kWp
 *   South-East:  ~1020 kWh/kWp
 *   South-West:  ~1020 kWh/kWp
 */

import type { Orientation } from '../types';
import { HOURS_PER_YEAR } from '../types';

// ─── Solar Geometry Helpers ──────────────────────────────────────────────────

const DEG2RAD = Math.PI / 180;
const LATITUDE_DEG = 52.0; // Central Germany default
const LATITUDE_RAD = LATITUDE_DEG * DEG2RAD;

/** Solar declination angle for day of year (Cooper equation) */
function solarDeclination(dayOfYear: number): number {
  return 23.45 * Math.sin(DEG2RAD * (360 / 365) * (dayOfYear - 81));
}

/** Hour angle in degrees: 0 at solar noon, -180 to +180 */
function hourAngle(hourOfDay: number): number {
  return (hourOfDay - 12) * 15; // 15° per hour
}

/** Solar elevation angle */
function solarElevation(declDeg: number, hourAngleDeg: number): number {
  const decl = declDeg * DEG2RAD;
  const ha = hourAngleDeg * DEG2RAD;
  const sinElev = Math.sin(LATITUDE_RAD) * Math.sin(decl)
    + Math.cos(LATITUDE_RAD) * Math.cos(decl) * Math.cos(ha);
  return Math.asin(Math.max(-1, Math.min(1, sinElev))) / DEG2RAD;
}

/** Solar azimuth angle (0=North, 180=South, measured clockwise) */
function solarAzimuth(declDeg: number, hourAngleDeg: number, elevDeg: number): number {
  if (elevDeg <= 0) return 180;
  const decl = declDeg * DEG2RAD;
  const elev = elevDeg * DEG2RAD;
  let cosAz = (Math.sin(decl) - Math.sin(LATITUDE_RAD) * Math.sin(elev))
    / (Math.cos(LATITUDE_RAD) * Math.cos(elev));
  cosAz = Math.max(-1, Math.min(1, cosAz));
  let az = Math.acos(cosAz) / DEG2RAD;
  if (hourAngleDeg > 0) az = 360 - az;
  return az;
}

// ─── Monthly clearness indices (typical Germany, ~52°N) ──────────────────────
// Accounts for clouds, atmospheric attenuation. Higher in summer.
const MONTHLY_CLEARNESS = [
  0.30, 0.35, 0.42, 0.48, 0.52, 0.54,
  0.53, 0.50, 0.45, 0.38, 0.30, 0.27,
];

function getMonthFromDoy(doy: number): number {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let acc = 0;
  for (let m = 0; m < 12; m++) {
    acc += daysInMonth[m];
    if (doy <= acc) return m;
  }
  return 11;
}

// ─── Orientation-specific capacity factor ────────────────────────────────────

/**
 * Compute instantaneous capacity factor for a given orientation.
 *
 * South: cos(AOI) on surface tilted ~35° facing south
 * East-West: average of east-facing and west-facing tilted surfaces (~15° tilt)
 * South-East: tilted surface facing SE (azimuth 135°)
 * South-West: tilted surface facing SW (azimuth 225°)
 */
function orientationFactor(
  orientation: Orientation,
  elevDeg: number,
  azDeg: number,
): number {
  if (elevDeg <= 1) return 0;

  const elev = elevDeg * DEG2RAD;
  const az = azDeg * DEG2RAD;

  // cos(AOI) on a tilted surface = beam component
  // cos(AOI) = sin(elev)*cos(tilt) + cos(elev)*sin(tilt)*cos(sun_az - surface_az)
  const beamFactor = (tiltDeg: number, surfaceAzDeg: number) => {
    const t = tiltDeg * DEG2RAD;
    const sa = surfaceAzDeg * DEG2RAD;
    return Math.sin(elev) * Math.cos(t)
      + Math.cos(elev) * Math.sin(t) * Math.cos(az - sa);
  };

  // Isotropic diffuse fraction on tilted surface = (1 + cos(tilt)) / 2
  const diffuseFraction = (tiltDeg: number) => (1 + Math.cos(tiltDeg * DEG2RAD)) / 2;

  switch (orientation) {
    case 'south': {
      const beam = Math.max(0, beamFactor(32, 180));
      return beam;
    }
    case 'east_west': {
      // EW at 15° tilt — model each half separately
      // Beam: only the surface facing the sun gets direct irradiance
      // Diffuse: both surfaces get isotropic sky diffuse
      const tilt = 15;
      const beamE = Math.max(0, beamFactor(tilt, 90));
      const beamW = Math.max(0, beamFactor(tilt, 270));
      const diff = diffuseFraction(tilt); // ~0.966

      // Approximate beam/diffuse split: ~70% beam, 30% diffuse in clear sky
      const beamWeight = 0.70;
      const diffWeight = 0.30;

      const eastTotal = beamWeight * beamE + diffWeight * diff * Math.sin(elev);
      const westTotal = beamWeight * beamW + diffWeight * diff * Math.sin(elev);

      // Average of both halves of the array
      return Math.max(0, (eastTotal + westTotal) / 2);
    }
    case 'south_east': {
      // SE at 25° tilt, azimuth 135° (true south-east)
      const beam = Math.max(0, beamFactor(25, 135));
      return beam;
    }
    case 'south_west': {
      // SW at 25° tilt, azimuth 225° (true south-west)
      const beam = Math.max(0, beamFactor(25, 225));
      return beam;
    }
    default:
      return Math.max(0, beamFactor(32, 180));
  }
}


// ─── Main Profile Generator ─────────────────────────────────────────────────

/**
 * Generate a normalized 8760-hour capacity factor profile.
 *
 * Returns array of 8760 floats (0–1) representing the fraction of
 * peak DC capacity produced in each hour of a typical meteorological year.
 *
 * @param orientation - PV array orientation
 * @returns number[] of length 8760
 */
export function generateProfile(orientation: Orientation): number[] {
  const profile = new Array<number>(HOURS_PER_YEAR);

  // Extraterrestrial irradiance normalization
  // We scale so the south-facing profile yields ~1050 kWh/kWp
  let rawSum = 0;
  const rawValues = new Array<number>(HOURS_PER_YEAR);

  for (let h = 0; h < HOURS_PER_YEAR; h++) {
    const doy = Math.floor(h / 24) + 1; // day of year (1-365)
    const hod = h % 24;                 // hour of day (0-23)
    const month = getMonthFromDoy(doy);

    const decl = solarDeclination(doy);
    const ha = hourAngle(hod + 0.5);    // center of hour
    const elev = solarElevation(decl, ha);
    const az = solarAzimuth(decl, ha, elev);

    if (elev <= 1) {
      rawValues[h] = 0;
      continue;
    }

    // Clear-sky irradiance on horizontal (simplified Hottel model)
    const sinElev = Math.sin(elev * DEG2RAD);
    const airmass = 1 / Math.max(sinElev, 0.05);
    const clearSky = 1.0 * Math.exp(-0.185 * airmass) * sinElev;

    // Apply monthly clearness and orientation
    const orientFactor = orientationFactor(orientation, elev, az);
    const hourlyFactor = clearSky * MONTHLY_CLEARNESS[month] * orientFactor;

    rawValues[h] = Math.max(0, hourlyFactor);
    rawSum += rawValues[h];
  }

  // Target annual sum per kWp by orientation
  const targetYield: Record<Orientation, number> = {
    south: 1050,
    east_west: 970,
    south_east: 1020,
    south_west: 1020,
  };

  // Scale factor: rawSum currently in arbitrary units, scale to target kWh/kWp
  // If we treat 1.0 capacity factor = 1 kW output, then sum of profile = full load hours
  const scaleFactor = rawSum > 0 ? targetYield[orientation] / rawSum : 0;

  for (let h = 0; h < HOURS_PER_YEAR; h++) {
    profile[h] = Math.min(1.0, rawValues[h] * scaleFactor);
  }

  return profile;
}

/**
 * Get descriptive metadata for an orientation.
 */
export function getOrientationInfo(orientation: Orientation): {
  label: string;
  description: string;
  yieldKWhKWp: number;
  peakCharacter: string;
} {
  const info: Record<Orientation, ReturnType<typeof getOrientationInfo>> = {
    south: {
      label: 'South-Facing',
      description: 'Modules face due south at ~32° tilt. Strongest midday peak, highest annual yield, but highest clipping risk.',
      yieldKWhKWp: 1050,
      peakCharacter: 'Sharp midday peak',
    },
    east_west: {
      label: 'East-West',
      description: 'Dual-orientation at ~15° tilt. Flatter generation curve, broader morning/evening production, lower clipping.',
      yieldKWhKWp: 970,
      peakCharacter: 'Broad flat-top plateau',
    },
    south_east: {
      label: 'South-East',
      description: 'Modules face SE (135°) at ~25° tilt. Morning-biased generation, earlier peak.',
      yieldKWhKWp: 1020,
      peakCharacter: 'Morning-shifted peak',
    },
    south_west: {
      label: 'South-West',
      description: 'Modules face SW (225°) at ~25° tilt. Afternoon-biased generation, later revenue capture.',
      yieldKWhKWp: 1020,
      peakCharacter: 'Afternoon-shifted peak',
    },
  };
  return info[orientation];
}

/**
 * Generate a representative daily profile (24h) for chart preview.
 * Uses a midsummer day (June 21, DOY ~172) for visual impact.
 */
export function getDailyPreviewProfile(orientation: Orientation): number[] {
  const doy = 172; // June 21
  const daily: number[] = [];

  for (let hod = 0; hod < 24; hod++) {
    const decl = solarDeclination(doy);
    const ha = hourAngle(hod + 0.5);
    const elev = solarElevation(decl, ha);
    const az = solarAzimuth(decl, ha, elev);

    if (elev <= 1) {
      daily.push(0);
      continue;
    }

    const sinElev = Math.sin(elev * DEG2RAD);
    const airmass = 1 / Math.max(sinElev, 0.05);
    const clearSky = Math.exp(-0.185 * airmass) * sinElev;
    const orientFactor = orientationFactor(orientation, elev, az);
    daily.push(Math.max(0, clearSky * orientFactor));
  }

  // Normalize to peak = 1.0
  const peak = Math.max(...daily, 0.001);
  return daily.map(v => v / peak);
}
