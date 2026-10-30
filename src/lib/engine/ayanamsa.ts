import * as A from "astronomy-engine";
import { julianCenturies } from "./math";

/** Lahiri reference epoch, as defined in Swiss Ephemeris (SE_SIDM_LAHIRI). */
const LAHIRI_T0_JD = 2435553.5; // 1956-09-22 00:00 TT
const LAHIRI_AT_T0 = 23.245524743;

/** IAU 2006 general precession in longitude, arcseconds. */
function precessionArcsec(T: number): number {
  return (
    5028.796195 * T +
    1.1054348 * T ** 2 +
    0.00007964 * T ** 3 -
    0.000023857 * T ** 4 -
    0.0000000383 * T ** 5
  );
}

const T0 = (LAHIRI_T0_JD - 2451545.0) / 36525;

/** Mean Lahiri ayanamsa in degrees (measured from the mean equinox). */
export function meanLahiriAyanamsa(date: Date): number {
  const T = julianCenturies(date);
  return LAHIRI_AT_T0 + (precessionArcsec(T) - precessionArcsec(T0)) / 3600;
}

/** Nutation in longitude, degrees. */
export function nutationLongitude(date: Date): number {
  return A.e_tilt(A.MakeTime(date)).dpsi / 3600;
}

/**
 * True Lahiri ayanamsa (mean + nutation), as Swiss Ephemeris applies it.
 * Subtract this from true-equinox tropical longitudes.
 */
export function lahiriAyanamsa(date: Date): number {
  return meanLahiriAyanamsa(date) + nutationLongitude(date);
}
