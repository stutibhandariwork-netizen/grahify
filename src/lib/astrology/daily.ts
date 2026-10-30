import {
  computeTransits,
  currentDasha,
  houseFrom,
  SIGNS,
  type CurrentDasha,
  type Graha,
  type NatalChart,
  type TransitEvent,
} from "@/lib/engine";

export type HighlightKind = "station" | "ingress" | "on_moon" | "saturn_cycle" | "on_lagna";

export interface Highlight {
  kind: HighlightKind;
  planet: Graha;
  /** Plain factual sentence, safe to show as-is. */
  fact: string;
  event?: TransitEvent["type"];
  houseFromMoon?: number;
}

export interface DailyFacts {
  date: string; // local YYYY-MM-DD
  moon: {
    sign: string;
    nakshatra: string;
    houseFromMoon: number;
    houseFromLagna: number | null;
    /** If the Moon changes sign today: when, and into which sign. */
    changes: { at: string; sign: string; houseFromMoon: number } | null;
  };
  /** Most significant first. */
  highlights: Highlight[];
  dasha: CurrentDasha | null;
}

/** Planets whose transit over the natal Moon is felt most, strongest first. */
const ON_MOON_ORDER: Graha[] = ["Saturn", "Mars", "Rahu", "Ketu", "Jupiter", "Sun", "Venus", "Mercury"];
const ordinal = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

/** What is happening in the sky for this person on one local day, ranked. */
export function dailyFacts(chart: NatalChart, dayStart: Date, localDate: string): DailyFacts {
  const moonSign = chart.planets.Moon.sign;
  const lagnaSign = chart.lagna?.sign ?? null;
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const report = computeTransits({ start: dayStart, end: dayEnd, moonSign, lagnaSign });
  const at = report.atStart;

  const highlights: Highlight[] = [];
  for (const e of report.events) {
    if (e.graha === "Moon" || e.type === "nakshatra_change") continue;
    if (e.type === "station_retrograde" || e.type === "station_direct") {
      highlights.push({
        kind: "station",
        planet: e.graha,
        event: e.type,
        fact: `${e.graha} turns ${e.type === "station_retrograde" ? "retrograde" : "direct"} today.`,
      });
    } else if (e.type === "ingress") {
      highlights.push({
        kind: "ingress",
        planet: e.graha,
        event: e.type,
        houseFromMoon: e.houseFromMoon,
        fact: `${e.graha} enters ${e.toSignName} today, your ${ordinal(e.houseFromMoon!)} house from the Moon.`,
      });
    }
  }
  for (const g of ON_MOON_ORDER) {
    if (at[g].sign === moonSign) {
      highlights.push({ kind: "on_moon", planet: g, houseFromMoon: 1, fact: `${g} is passing over your Moon sign, ${SIGNS[moonSign].en}.` });
    }
  }
  const satHouse = at.Saturn.houseFromMoon;
  if ([12, 2, 8].includes(satHouse)) {
    highlights.push({
      kind: "saturn_cycle",
      planet: "Saturn",
      houseFromMoon: satHouse,
      fact: satHouse === 8 ? "Saturn is 8th from your Moon (Ashtama Shani)." : `You are in Sade Sati: Saturn is ${ordinal(satHouse)} from your Moon.`,
    });
  }
  if (lagnaSign !== null) {
    for (const g of ON_MOON_ORDER) {
      if (at[g].sign === lagnaSign && lagnaSign !== moonSign) {
        highlights.push({ kind: "on_lagna", planet: g, fact: `${g} is passing over your lagna, ${SIGNS[lagnaSign].en}.` });
      }
    }
  }

  const moonIngress = report.events.find((e) => e.graha === "Moon" && e.type === "ingress");
  return {
    date: localDate,
    moon: {
      sign: at.Moon.signName,
      nakshatra: at.Moon.nakshatra,
      houseFromMoon: at.Moon.houseFromMoon,
      houseFromLagna: at.Moon.houseFromLagna,
      changes: moonIngress ? { at: moonIngress.date, sign: moonIngress.toSignName!, houseFromMoon: houseFrom(moonIngress.toSign!, moonSign) } : null,
    },
    highlights,
    dasha: currentDasha(chart.dasha, new Date(dayStart.getTime() + 12 * 3_600_000)),
  };
}
