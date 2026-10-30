import * as A from "astronomy-engine";
import { lahiriAyanamsa, nutationLongitude } from "./ayanamsa";
import { combustionOrb, EXALTATION, OWN_SIGNS } from "./constants";
import { addDays, angleDiff, DEG, julianCenturies, norm360 } from "./math";
import type { Dignity, Graha } from "./types";

const BODY: Partial<Record<Graha, A.Body>> = {
  Mars: A.Body.Mars,
  Mercury: A.Body.Mercury,
  Jupiter: A.Body.Jupiter,
  Venus: A.Body.Venus,
  Saturn: A.Body.Saturn,
};

/** Mean lunar ascending node, tropical (Meeus, Astronomical Algorithms 47.7). */
function meanNode(date: Date): number {
  const T = julianCenturies(date);
  return norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T ** 2 + T ** 3 / 467441 - T ** 4 / 60616000);
}

/** Apparent geocentric tropical longitude, true ecliptic and equinox of date. */
export function tropicalLongitude(graha: Graha, date: Date): number {
  switch (graha) {
    case "Sun":
      return A.SunPosition(date).elon;
    case "Moon":
      return norm360(A.EclipticGeoMoon(date).lon);
    // The mean node is referred to the mean equinox; add nutation to match the other bodies.
    case "Rahu":
      return norm360(meanNode(date) + nutationLongitude(date));
    case "Ketu":
      return norm360(meanNode(date) + nutationLongitude(date) + 180);
    default:
      return norm360(A.Ecliptic(A.GeoVector(BODY[graha]!, date, true)).elon);
  }
}

export function siderealLongitude(graha: Graha, date: Date): number {
  return norm360(tropicalLongitude(graha, date) - lahiriAyanamsa(date));
}

/** Degrees per day; negative means retrograde. */
export function speed(graha: Graha, date: Date): number {
  if (graha === "Rahu" || graha === "Ketu") {
    return -0.0529539; // mean node rate
  }
  const h = graha === "Moon" ? 1 / 24 : 0.5;
  return angleDiff(tropicalLongitude(graha, addDays(date, h)), tropicalLongitude(graha, addDays(date, -h))) / (2 * h);
}

export function isRetrograde(graha: Graha, date: Date): boolean {
  if (graha === "Rahu" || graha === "Ketu") return true;
  if (graha === "Sun" || graha === "Moon") return false;
  return speed(graha, date) < 0;
}

export function isCombust(graha: Graha, date: Date, retrograde = isRetrograde(graha, date)): boolean {
  const orb = combustionOrb(graha, retrograde);
  if (orb === null) return false;
  return Math.abs(angleDiff(tropicalLongitude(graha, date), tropicalLongitude("Sun", date))) <= orb;
}

export function dignity(graha: Graha, sign: number): Dignity {
  const ex = EXALTATION[graha];
  if (ex === undefined) return null;
  if (sign === ex) return "exalted";
  if (sign === (ex + 6) % 12) return "debilitated";
  if (OWN_SIGNS[graha]?.includes(sign)) return "own";
  return null;
}

/** Sidereal ascendant (lagna) longitude. */
export function ascendant(date: Date, latitude: number, longitude: number): number {
  // Apparent sidereal time with true obliquity: both refer to the true equinox.
  const ramc = norm360(A.SiderealTime(date) * 15 + longitude) * DEG;
  const eps = A.e_tilt(A.MakeTime(date)).tobl * DEG;
  const phi = latitude * DEG;
  const tropical = Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))) / DEG;
  return norm360(tropical - lahiriAyanamsa(date));
}
