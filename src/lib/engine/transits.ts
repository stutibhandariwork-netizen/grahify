import { lahiriAyanamsa } from "./ayanamsa";
import { GRAHAS, NAKSHATRAS, SIGNS } from "./constants";
import { addDays, bisect, degreeInSign, houseFrom, nakshatraOf, signOf } from "./math";
import { dignity, isCombust, isRetrograde, siderealLongitude, speed } from "./positions";
import type {
  Graha,
  GrahaTransitContext,
  TransitEvent,
  TransitReport,
  TransitSnapshot,
} from "./types";

export interface TransitInput {
  start: Date;
  end: Date;
  /** Natal Moon sign (0-11): houses are counted from here. */
  moonSign: number;
  /** Natal lagna sign, or null when birth time is unknown. */
  lagnaSign: number | null;
  /** Natal planet signs, to flag transits over natal planets. */
  natalSigns?: Partial<Record<Graha, number>>;
  grahas?: readonly Graha[];
}

/** Scan step in days: small enough that no event is skipped between samples. */
const STEP: Record<Graha, number> = {
  Moon: 0.25,
  Sun: 0.5,
  Mercury: 0.5,
  Venus: 0.5,
  Mars: 0.5,
  Jupiter: 1,
  Saturn: 1,
  Rahu: 2,
  Ketu: 2,
};

/** How far back/forward to look for the previous and next sign change. */
const HORIZON_DAYS = 4 * 365;

const canStation = (g: Graha) => !["Sun", "Moon", "Rahu", "Ketu"].includes(g);
const canCombust = (g: Graha) => !["Sun", "Rahu", "Ketu"].includes(g);

export function computeTransits(input: TransitInput): TransitReport {
  const { start, end, moonSign, lagnaSign } = input;
  const grahas = input.grahas ?? GRAHAS;
  const houses = (sign: number) => ({
    houseFromMoon: houseFrom(sign, moonSign),
    houseFromLagna: lagnaSign === null ? null : houseFrom(sign, lagnaSign),
  });

  const snapshot = (g: Graha, d: Date): TransitSnapshot => {
    const lon = siderealLongitude(g, d);
    const sign = signOf(lon);
    const nak = nakshatraOf(lon);
    const retrograde = isRetrograde(g, d);
    return {
      graha: g,
      longitude: lon,
      sign,
      signName: SIGNS[sign].en,
      degree: degreeInSign(lon),
      nakshatra: nak.name,
      pada: nak.pada,
      retrograde,
      combust: isCombust(g, d, retrograde),
      dignity: dignity(g, sign),
      ...houses(sign),
      overNatal: (Object.keys(input.natalSigns ?? {}) as Graha[]).filter((n) => input.natalSigns![n] === sign),
    };
  };

  const events: TransitEvent[] = [];
  for (const g of grahas) events.push(...scanEvents(g, start, end, houses));
  events.sort((a, b) => a.date.localeCompare(b.date));

  return {
    range: { start: start.toISOString(), end: end.toISOString() },
    ayanamsa: lahiriAyanamsa(start),
    reference: { moonSign, lagnaSign },
    atStart: Object.fromEntries(grahas.map((g) => [g, snapshot(g, start)])) as Record<Graha, TransitSnapshot>,
    atEnd: Object.fromEntries(grahas.map((g) => [g, snapshot(g, end)])) as Record<Graha, TransitSnapshot>,
    events,
    context: Object.fromEntries(grahas.map((g) => [g, context(g, start, end, houses)])) as Record<Graha, GrahaTransitContext>,
  };
}

type Houses = (sign: number) => { houseFromMoon: number; houseFromLagna: number | null };

function scanEvents(g: Graha, start: Date, end: Date, houses: Houses): TransitEvent[] {
  const out: TransitEvent[] = [];
  const signAt = (d: Date) => signOf(siderealLongitude(g, d));
  const nakAt = (d: Date) => nakshatraOf(siderealLongitude(g, d)).index;
  const combustAt = (d: Date) => isCombust(g, d);

  let d = start;
  let sign = signAt(d);
  let nak = nakAt(d);
  let spd = speed(g, d);
  let combust = canCombust(g) && combustAt(d);

  while (d < end) {
    const next = new Date(Math.min(addDays(d, STEP[g]).getTime(), end.getTime()));

    const s = signAt(next);
    if (s !== sign) {
      const at = bisect((x) => (signAt(x) === sign ? 1 : -1), d, next);
      out.push({ type: "ingress", graha: g, date: at.toISOString(), fromSign: sign, toSign: s, toSignName: SIGNS[s].en, ...houses(s) });
      sign = s;
    }

    const n = nakAt(next);
    if (n !== nak) {
      const at = bisect((x) => (nakAt(x) === nak ? 1 : -1), d, next);
      out.push({ type: "nakshatra_change", graha: g, date: at.toISOString(), nakshatra: NAKSHATRAS[n] });
      nak = n;
    }

    if (canStation(g)) {
      const sp = speed(g, next);
      if (Math.sign(sp) !== Math.sign(spd)) {
        const at = bisect((x) => speed(g, x), d, next);
        out.push({ type: sp < 0 ? "station_retrograde" : "station_direct", graha: g, date: at.toISOString(), ...houses(signAt(at)) });
      }
      spd = sp;
    }

    if (canCombust(g)) {
      const c = combustAt(next);
      if (c !== combust) {
        const at = bisect((x) => (combustAt(x) === combust ? 1 : -1), d, next);
        out.push({ type: c ? "combust_start" : "combust_end", graha: g, date: at.toISOString() });
        combust = c;
      }
    }

    d = next;
  }
  return out;
}

/** Walks from `from` in `direction` until the sign differs; returns the change time and new sign. */
function findSignChange(g: Graha, from: Date, direction: 1 | -1): { date: Date; sign: number } | null {
  const signAt = (d: Date) => signOf(siderealLongitude(g, d));
  const sign = signAt(from);
  const step = STEP[g] * 2 * direction;
  for (let d = from, k = 0; k * Math.abs(step) < HORIZON_DAYS; k++) {
    const next = addDays(d, step);
    const s = signAt(next);
    if (s !== sign) {
      const [a, b] = direction === 1 ? [d, next] : [next, d];
      const at = bisect((x) => (signAt(x) === signAt(a) ? 1 : -1), a, b);
      return { date: at, sign: s };
    }
    d = next;
  }
  return null;
}

function context(g: Graha, start: Date, end: Date, houses: Houses): GrahaTransitContext {
  const currentSign = signOf(siderealLongitude(g, start));
  const since = findSignChange(g, start, -1);
  const sinceDate = since?.date ?? addDays(start, -HORIZON_DAYS);
  const prevSign = since?.sign ?? currentSign;
  const prevFrom = since ? findSignChange(g, addDays(since.date, -5 / 1440), -1)?.date ?? addDays(sinceDate, -HORIZON_DAYS) : sinceDate;
  const next = findSignChange(g, end, 1);

  return {
    graha: g,
    current: { sign: currentSign, signName: SIGNS[currentSign].en, since: sinceDate.toISOString(), ...houses(currentSign) },
    previous: { sign: prevSign, signName: SIGNS[prevSign].en, from: prevFrom.toISOString(), to: sinceDate.toISOString(), ...houses(prevSign) },
    next: next ? { sign: next.sign, signName: SIGNS[next.sign].en, date: next.date.toISOString(), ...houses(next.sign) } : null,
  };
}
