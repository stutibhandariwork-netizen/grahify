import { NAKSHATRAS, NAKSHATRA_SPAN, PADA_SPAN, DASHA_ORDER } from "./constants";
import type { NakshatraInfo } from "./types";

export const DEG = Math.PI / 180;
export const DAY_MS = 86_400_000;

export function norm360(x: number): number {
  const r = x % 360;
  return r < 0 ? r + 360 : r;
}

/** Signed shortest difference a - b in (-180, 180]. */
export function angleDiff(a: number, b: number): number {
  const d = norm360(a - b);
  return d > 180 ? d - 360 : d;
}

export function signOf(longitude: number): number {
  return Math.floor(norm360(longitude) / 30);
}

export function degreeInSign(longitude: number): number {
  return norm360(longitude) % 30;
}

/** Whole-sign house of `sign` counted from `fromSign` (1-12). */
export function houseFrom(sign: number, fromSign: number): number {
  return ((sign - fromSign + 12) % 12) + 1;
}

export function nakshatraOf(longitude: number): NakshatraInfo {
  const lon = norm360(longitude);
  const index = Math.floor(lon / NAKSHATRA_SPAN);
  const within = lon - index * NAKSHATRA_SPAN;
  return {
    index,
    name: NAKSHATRAS[index],
    lord: DASHA_ORDER[index % 9],
    pada: Math.floor(within / PADA_SPAN) + 1,
    fractionElapsed: within / NAKSHATRA_SPAN,
  };
}

/** D9 sign: each 3°20' maps onward through the zodiac from Aries. */
export function navamsaSign(longitude: number): number {
  return Math.floor((norm360(longitude) * 9) / 30) % 12;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Julian centuries since J2000.0 (UT; the TT offset is below our precision needs). */
export function julianCenturies(date: Date): number {
  const jd = date.getTime() / DAY_MS + 2440587.5;
  return (jd - 2451545.0) / 36525;
}

/**
 * Finds when f changes sign between a and b (f(a), f(b) of opposite sign).
 * `a` may be later than `b`. Returns the time to within `toleranceMs`.
 */
export function bisect(
  f: (d: Date) => number,
  a: Date,
  b: Date,
  toleranceMs = 60_000,
): Date {
  let lo = a.getTime();
  let hi = b.getTime();
  let flo = f(a);
  while (Math.abs(hi - lo) > toleranceMs) {
    const mid = (lo + hi) / 2;
    const fm = f(new Date(mid));
    if (Math.sign(fm) === Math.sign(flo)) {
      lo = mid;
      flo = fm;
    } else {
      hi = mid;
    }
  }
  return new Date((lo + hi) / 2);
}
