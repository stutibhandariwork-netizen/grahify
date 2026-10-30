import { DASHA_ORDER, DASHA_TOTAL_YEARS, DASHA_YEARS, DAYS_PER_YEAR } from "./constants";
import { addDays, nakshatraOf } from "./math";
import type { CurrentDasha, DashaPeriod, DashaTimeline, Graha, Mahadasha } from "./types";

function rotation(from: Graha): Graha[] {
  const i = DASHA_ORDER.indexOf(from);
  return [...DASHA_ORDER.slice(i), ...DASHA_ORDER.slice(0, i)];
}

/** Splits a period into the nine sub-periods, starting with its own lord. */
function subdivide(parent: { lord: Graha; start: Date; years: number }) {
  let cursor = parent.start;
  return rotation(parent.lord).map((lord) => {
    const years = (parent.years * DASHA_YEARS[lord]) / DASHA_TOTAL_YEARS;
    const start = cursor;
    cursor = addDays(start, years * DAYS_PER_YEAR);
    return { lord, start, end: cursor, years };
  });
}

const iso = (p: { lord: Graha; start: Date; end: Date; years: number }): DashaPeriod => ({
  lord: p.lord,
  start: p.start.toISOString(),
  end: p.end.toISOString(),
  years: p.years,
});

/**
 * Vimshottari dasha from the Moon's sidereal longitude.
 * The first mahadasha's `start` is its theoretical start before birth;
 * `balanceAtBirth` is what remains of it at birth.
 */
export function vimshottari(moonLongitude: number, birth: Date, spanYears = DASHA_TOTAL_YEARS): DashaTimeline {
  const nak = nakshatraOf(moonLongitude);
  const firstLord = nak.lord;
  const elapsedYears = nak.fractionElapsed * DASHA_YEARS[firstLord];
  const virtualStart = addDays(birth, -elapsedYears * DAYS_PER_YEAR);
  const until = addDays(birth, spanYears * DAYS_PER_YEAR);

  const mahadashas: Mahadasha[] = [];
  let cursor = virtualStart;
  for (let i = 0; cursor < until; i++) {
    const lord = DASHA_ORDER[(DASHA_ORDER.indexOf(firstLord) + i) % 9];
    const years = DASHA_YEARS[lord];
    const md = { lord, start: cursor, end: addDays(cursor, years * DAYS_PER_YEAR), years };
    mahadashas.push({
      ...iso(md),
      antardashas: subdivide(md).map((ad) => ({ ...iso(ad), pratyantars: subdivide(ad).map(iso) })),
    });
    cursor = md.end;
  }

  return {
    system: "vimshottari",
    birth: birth.toISOString(),
    yearLengthDays: DAYS_PER_YEAR,
    moonNakshatra: nak.name,
    balanceAtBirth: { lord: firstLord, years: DASHA_YEARS[firstLord] - elapsedYears },
    mahadashas,
  };
}

function find<T extends DashaPeriod>(list: T[], t: string): T {
  return list.find((p) => p.start <= t && t < p.end)!;
}

/** The running periods at `asOf`, or null if `asOf` is before birth or past the timeline. */
export function currentDasha(timeline: DashaTimeline, asOf: Date): CurrentDasha | null {
  const t = asOf.toISOString();
  if (t < timeline.birth || t >= timeline.mahadashas[timeline.mahadashas.length - 1].end) return null;
  const md = find(timeline.mahadashas, t);
  const ad = find(md.antardashas, t);
  const pd = find(ad.pratyantars, t);
  const strip = ({ lord, start, end, years }: DashaPeriod): DashaPeriod => ({ lord, start, end, years });
  return { asOf: t, mahadasha: strip(md), antardasha: strip(ad), pratyantar: strip(pd) };
}
