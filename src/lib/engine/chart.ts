import { lahiriAyanamsa } from "./ayanamsa";
import { GRAHAS, SIGN_LORDS, SIGNS } from "./constants";
import { currentDasha, vimshottari } from "./dasha";
import { addDays, bisect, degreeInSign, houseFrom, nakshatraOf, navamsaSign, signOf } from "./math";
import { ascendant, dignity, isCombust, siderealLongitude, speed } from "./positions";
import { saturnCycles, saturnSegments } from "./saturn";
import type { Graha, House, Lagna, NatalChart, NatalInput, PlanetPosition } from "./types";
import { detectYogas } from "./yogas";

export const ENGINE_VERSION = "1.0.0";

const BORDERLINE_DEGREES = 2;
/** Longer than one full Sade Sati (~7.5 years, more with retrograde re-entries). */
const SATURN_LOOKBACK_YEARS = 10;

export function computeNatalChart(input: NatalInput): NatalChart {
  const { utc, latitude, longitude, timeKnown } = input;
  const warnings: string[] = [];

  const lon = Object.fromEntries(GRAHAS.map((g) => [g, siderealLongitude(g, utc)])) as Record<Graha, number>;
  const moonSign = signOf(lon.Moon);

  const lagna = timeKnown ? computeLagna(utc, latitude, longitude, lon) : null;
  const basisSign = lagna ? lagna.sign : moonSign;
  if (!lagna) {
    warnings.push("Birth time unknown: lagna and houses are not calculated; houses are counted from the Moon sign (Chandra lagna).");
    const early = siderealLongitude("Moon", addDays(utc, -0.5));
    const late = siderealLongitude("Moon", addDays(utc, 0.5));
    if (signOf(early) !== signOf(late)) warnings.push("The Moon changes sign on this birth date, so the Moon sign itself is uncertain.");
    if (nakshatraOf(early).index !== nakshatraOf(late).index)
      warnings.push("The Moon changes nakshatra on this birth date, so the nakshatra and dasha dates are uncertain.");
  }

  const planets = Object.fromEntries(
    GRAHAS.map((g): [Graha, PlanetPosition] => {
      const l = lon[g];
      const sign = signOf(l);
      const spd = speed(g, utc);
      const retrograde = g === "Rahu" || g === "Ketu" ? true : spd < 0;
      return [
        g,
        {
          graha: g,
          longitude: l,
          sign,
          signName: SIGNS[sign].en,
          degree: degreeInSign(l),
          house: houseFrom(sign, basisSign),
          houseFromMoon: houseFrom(sign, moonSign),
          nakshatra: nakshatraOf(l),
          speed: spd,
          retrograde,
          dignity: dignity(g, sign),
          combust: isCombust(g, utc, retrograde),
          navamsaSign: navamsaSign(l),
        },
      ];
    }),
  ) as Record<Graha, PlanetPosition>;

  const houses: House[] = Array.from({ length: 12 }, (_, i) => {
    const sign = (basisSign + i) % 12;
    return {
      house: i + 1,
      sign,
      signName: SIGNS[sign].en,
      lord: SIGN_LORDS[sign],
      occupants: GRAHAS.filter((g) => planets[g].sign === sign),
    };
  });

  const dasha = vimshottari(lon.Moon, utc);
  const saturnYears = input.saturnYears ?? 100;
  // Start well before birth so a cycle already running at birth gets its true start date.
  const segments = saturnSegments(addDays(utc, -SATURN_LOOKBACK_YEARS * 365.25), addDays(utc, saturnYears * 365.25), moonSign);
  const birthIso = utc.toISOString();

  return {
    engineVersion: ENGINE_VERSION,
    input: { utc: utc.toISOString(), latitude, longitude, timeKnown },
    ayanamsa: { name: "Lahiri", degrees: lahiriAyanamsa(utc) },
    lagna,
    houseBasis: lagna ? "lagna" : "moon",
    planets,
    houses,
    navamsa: {
      lagnaSign: lagna ? lagna.navamsaSign : null,
      planets: Object.fromEntries(GRAHAS.map((g) => [g, planets[g].navamsaSign])) as Record<Graha, number>,
    },
    yogas: detectYogas(planets, basisSign, !!lagna),
    dasha,
    currentDasha: currentDasha(dasha, input.asOf ?? new Date()),
    saturnCycles: saturnCycles(segments).filter((c) => c.end > birthIso),
    warnings,
  };
}

function computeLagna(utc: Date, lat: number, lon: number, planetLon: Record<Graha, number>): Lagna {
  const asc = ascendant(utc, lat, lon);
  const sign = signOf(asc);
  const degree = degreeInSign(asc);

  let borderline: Lagna["borderline"] = null;
  const nearStart = degree < BORDERLINE_DEGREES;
  if (nearStart || degree > 30 - BORDERLINE_DEGREES) {
    const alternateSign = (sign + (nearStart ? 11 : 1)) % 12;
    // The ascendant moves ~1° every 4 minutes; 3 hours is ample search room.
    const edge = addDays(utc, (nearStart ? -3 : 3) / 24);
    const change = bisect((d) => (signOf(ascendant(d, lat, lon)) === sign ? 1 : -1), utc, edge, 1000);
    borderline = {
      alternateSign,
      alternateSignName: SIGNS[alternateSign].en,
      degreesToBoundary: nearStart ? degree : 30 - degree,
      minutesToChange: Math.round((change.getTime() - utc.getTime()) / 60_000),
      alternateHouses: Object.fromEntries(GRAHAS.map((g) => [g, houseFrom(signOf(planetLon[g]), alternateSign)])) as Record<
        Graha,
        number
      >,
    };
  }

  return {
    longitude: asc,
    sign,
    signName: SIGNS[sign].en,
    degree,
    nakshatra: nakshatraOf(asc),
    navamsaSign: navamsaSign(asc),
    borderline,
  };
}
