import {
  aspectedSigns,
  computeTransits,
  currentDasha,
  dignity,
  GRAHAS,
  houseFrom,
  SIGNS,
  type CurrentDasha,
  type Dignity,
  type Graha,
  type NatalChart,
  type TransitEvent,
  type TransitReport,
} from "@/lib/engine";

/** Slowest first: the long transits shape a week more than the quick ones. */
export const WEEKLY_ORDER: Graha[] = ["Saturn", "Jupiter", "Rahu", "Ketu", "Mars", "Sun", "Venus", "Mercury"];

export interface SignStay {
  sign: number;
  signName: string;
  houseFromMoon: number;
  houseFromLagna: number | null;
  dignity: Dignity;
  /** Natal planets in this sign (the transit sits on them). */
  overNatal: Graha[];
  /** Natal planets this transit aspects from this sign. */
  aspectsNatal: Graha[];
}

export interface PlanetWeek {
  graha: Graha;
  before: SignStay & { from: string; to: string };
  now: SignStay & { since: string; retrograde: boolean; combust: boolean; nakshatra: string; degree: number };
  /** Ingresses, stations and combustion changes during the week. */
  thisWeek: TransitEvent[];
  next: (SignStay & { date: string }) | null;
}

export interface WeeklyFacts {
  week: { start: string; end: string };
  reference: { moonSign: string; lagnaSign: string | null };
  planets: PlanetWeek[];
  moon: { sign: string; houseFromMoon: number; houseFromLagna: number | null; from: string; to: string }[];
  dasha: {
    atStart: CurrentDasha | null;
    changes: { level: "mahadasha" | "antardasha" | "pratyantar"; from: Graha; to: Graha; date: string }[];
  };
}

/** The Saturday 00:00 (local) on or before `at`, as a UTC instant. Weeks run Saturday to Friday. */
export function weekStart(at: Date, offsetMinutes: (d: Date) => number): Date {
  const local = new Date(at.getTime() + offsetMinutes(at) * 60_000);
  const daysSinceSaturday = (local.getUTCDay() + 1) % 7;
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - daysSinceSaturday);
  return new Date(midnight - offsetMinutes(new Date(midnight)) * 60_000);
}

export function weeklyFacts(chart: NatalChart, start: Date, end: Date): WeeklyFacts {
  const moonSign = chart.planets.Moon.sign;
  const lagnaSign = chart.lagna?.sign ?? null;
  const report = computeTransits({ start, end, moonSign, lagnaSign });

  const natalIn = (sign: number) => GRAHAS.filter((g) => chart.planets[g].sign === sign);
  const stay = (graha: Graha, sign: number): SignStay => ({
    sign,
    signName: SIGNS[sign].en,
    houseFromMoon: houseFrom(sign, moonSign),
    houseFromLagna: lagnaSign === null ? null : houseFrom(sign, lagnaSign),
    dignity: dignity(graha, sign),
    overNatal: natalIn(sign),
    aspectsNatal: aspectedSigns(graha, sign).flatMap(natalIn),
  });

  const planets = WEEKLY_ORDER.map((graha): PlanetWeek => {
    const ctx = report.context[graha];
    const events = report.events.filter((e) => e.graha === graha && e.type !== "nakshatra_change");
    const ingress = events.filter((e) => e.type === "ingress").at(-1);
    const snap = report.atEnd[graha];

    // If it changes sign this week, "before" is the sign it is leaving.
    const before = ingress
      ? { ...stay(graha, ingress.fromSign!), from: ctx.current.since, to: ingress.date }
      : { ...stay(graha, ctx.previous.sign), from: ctx.previous.from, to: ctx.previous.to };
    const now = {
      ...stay(graha, snap.sign),
      since: ingress ? ingress.date : ctx.current.since,
      retrograde: snap.retrograde,
      combust: snap.combust,
      nakshatra: `${snap.nakshatra} pada ${snap.pada}`,
      degree: Math.round(snap.degree * 10) / 10,
    };
    return { graha, before, now, thisWeek: events, next: ctx.next && { ...stay(graha, ctx.next.sign), date: ctx.next.date } };
  });

  return {
    week: { start: start.toISOString(), end: end.toISOString() },
    reference: { moonSign: SIGNS[moonSign].en, lagnaSign: lagnaSign === null ? null : SIGNS[lagnaSign].en },
    planets,
    moon: moonJourney(report),
    dasha: dashaChanges(chart, start, end),
  };
}

function moonJourney(report: TransitReport): WeeklyFacts["moon"] {
  const ingresses = report.events.filter((e) => e.graha === "Moon" && e.type === "ingress");
  const legs: WeeklyFacts["moon"] = [];
  let from = report.range.start;
  let { sign } = report.atStart.Moon;
  const push = (to: string) =>
    legs.push({
      sign: SIGNS[sign].en,
      houseFromMoon: houseFrom(sign, report.reference.moonSign),
      houseFromLagna: report.reference.lagnaSign === null ? null : houseFrom(sign, report.reference.lagnaSign),
      from,
      to,
    });
  for (const e of ingresses) {
    push(e.date);
    from = e.date;
    sign = e.toSign!;
  }
  push(report.range.end);
  return legs;
}

function dashaChanges(chart: NatalChart, start: Date, end: Date): WeeklyFacts["dasha"] {
  const atStart = currentDasha(chart.dasha, start);
  const changes: WeeklyFacts["dasha"]["changes"] = [];
  if (!atStart) return { atStart, changes };
  for (const level of ["mahadasha", "antardasha", "pratyantar"] as const) {
    const p = atStart[level];
    if (p.end < end.toISOString()) {
      const after = currentDasha(chart.dasha, new Date(new Date(p.end).getTime() + 60_000));
      if (after) changes.push({ level, from: p.lord, to: after[level].lord, date: p.end });
    }
  }
  return { atStart, changes };
}
