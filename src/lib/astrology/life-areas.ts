import {
  aspectedSigns,
  computeTransits,
  currentDasha,
  GRAHAS,
  houseFrom,
  SIGN_LORDS,
  SIGNS,
  type DashaPeriod,
  type Graha,
  type NatalChart,
} from "@/lib/engine";

export type AreaKey = "career" | "money" | "love" | "health";

export interface AreaConfig {
  key: AreaKey;
  title: string;
  blurb: string;
  /** Whole-sign houses this area is read from, most important first. */
  houses: { house: number; why: string }[];
  /** Natural significators (karakas). */
  karakas: Graha[];
}

export const AREAS: AreaConfig[] = [
  {
    key: "career",
    title: "Career",
    blurb: "Work, status and direction",
    houses: [
      { house: 10, why: "career, status and public life" },
      { house: 6, why: "daily work, service and competition" },
      { house: 11, why: "gains, networks and goals" },
    ],
    karakas: ["Sun", "Saturn", "Mercury"],
  },
  {
    key: "money",
    title: "Money",
    blurb: "Income, savings and fortune",
    houses: [
      { house: 2, why: "earned wealth, savings and family resources" },
      { house: 11, why: "income and gains" },
      { house: 9, why: "fortune and blessings" },
    ],
    karakas: ["Jupiter", "Venus"],
  },
  {
    key: "love",
    title: "Love",
    blurb: "Romance, partnership and closeness",
    houses: [
      { house: 7, why: "partnership and marriage" },
      { house: 5, why: "romance, affection and joy" },
    ],
    karakas: ["Venus", "Moon"],
  },
  {
    key: "health",
    title: "Health",
    blurb: "Energy, wellbeing and habits",
    houses: [
      { house: 1, why: "body and vitality" },
      { house: 6, why: "resistance, routines and recovery" },
    ],
    karakas: ["Sun", "Moon"],
  },
];

export const areaByKey = (key: string) => AREAS.find((a) => a.key === key) ?? null;

const SLOW: Graha[] = ["Jupiter", "Saturn", "Rahu", "Ketu"];
const MONTH = 30.44 * 86_400_000;

/** All the computed data a deep dive is written from. */
export function lifeAreaFacts(chart: NatalChart, area: AreaConfig, now: Date) {
  const basis = chart.lagna?.sign ?? chart.planets.Moon.sign;
  const moonSign = chart.planets.Moon.sign;
  const signOfHouse = (h: number) => (basis + h - 1) % 12;
  const areaSigns = area.houses.map((h) => signOfHouse(h.house));
  const houseOf = (sign: number) => houseFrom(sign, basis);
  const ruledHouses = (g: Graha) => chart.houses.filter((h) => h.lord === g).map((h) => h.house);
  const placement = (g: Graha) => {
    const p = chart.planets[g];
    return {
      planet: g,
      sign: SIGNS[p.sign].en,
      house: p.house,
      ...(p.dignity ? { dignity: p.dignity } : {}),
      ...(p.retrograde && g !== "Rahu" && g !== "Ketu" ? { retrograde: true } : {}),
      ...(p.combust ? { combust: true } : {}),
      rulesHouses: ruledHouses(g),
    };
  };
  const touchesArea = (g: Graha) =>
    areaSigns.includes(chart.planets[g].sign) || ruledHouses(g).some((h) => area.houses.some((a) => a.house === h));

  const houses = area.houses.map(({ house, why }) => {
    const sign = signOfHouse(house);
    const lord = SIGN_LORDS[sign];
    return {
      house,
      means: why,
      sign: SIGNS[sign].en,
      lord: placement(lord),
      occupants: GRAHAS.filter((g) => chart.planets[g].sign === sign),
      aspectedBy: GRAHAS.filter((g) => aspectedSigns(g, chart.planets[g].sign).includes(sign)),
    };
  });

  const dashaPeriod = (p: DashaPeriod) => ({ lord: p.lord, start: p.start.slice(0, 10), end: p.end.slice(0, 10), activatesArea: touchesArea(p.lord) });
  const cur = currentDasha(chart.dasha, now);
  const md = cur && chart.dasha.mahadashas.find((m) => m.start === cur.mahadasha.start);
  const adIndex = md ? md.antardashas.findIndex((a) => a.start === cur!.antardasha.start) : -1;
  const antardashas = md
    ? [...md.antardashas, ...(chart.dasha.mahadashas[chart.dasha.mahadashas.indexOf(md) + 1]?.antardashas ?? [])]
    : [];

  // Slow-planet movements over the last 18 months and the next 12.
  const from = new Date(now.getTime() - 18 * MONTH);
  const to = new Date(now.getTime() + 12 * MONTH);
  const report = computeTransits({ start: from, end: to, moonSign, lagnaSign: chart.lagna?.sign ?? null, grahas: SLOW });
  const segments = SLOW.flatMap((g) => {
    const ingresses = report.events.filter((e) => e.graha === g && e.type === "ingress");
    const out: { planet: Graha; sign: string; from: string; to: string; houseFromBasis: number; houseFromMoon: number; inAreaHouse: boolean; aspectsAreaHouse: boolean }[] = [];
    let sign = report.atStart[g].sign;
    // The first and last stays run past the window; use their real ingress dates.
    let start = report.context[g].current.since;
    const push = (end: string) =>
      out.push({
        planet: g,
        sign: SIGNS[sign].en,
        from: start.slice(0, 10),
        to: end.slice(0, 10),
        houseFromBasis: houseOf(sign),
        houseFromMoon: houseFrom(sign, moonSign),
        inAreaHouse: areaSigns.includes(sign),
        aspectsAreaHouse: aspectedSigns(g, sign).some((s) => areaSigns.includes(s)),
      });
    for (const e of ingresses) {
      push(e.date);
      start = e.date;
      sign = e.toSign!;
    }
    push(report.context[g].next?.date ?? report.range.end);
    return out;
  });
  segments.sort((a, b) => a.from.localeCompare(b.from) || SLOW.indexOf(a.planet) - SLOW.indexOf(b.planet));
  const nowIso = now.toISOString().slice(0, 10);
  const relevant = segments.filter((s) => s.inAreaHouse || s.aspectsAreaHouse);

  return {
    area: area.title,
    today: nowIso,
    housesCountedFrom: chart.lagna ? "lagna" : "Moon sign (birth time unknown)",
    houses,
    karakas: area.karakas.map(placement),
    dasha: cur && {
      mahadasha: dashaPeriod(cur.mahadasha),
      antardasha: dashaPeriod(cur.antardasha),
      pratyantar: dashaPeriod(cur.pratyantar),
      previousAntardasha: adIndex > 0 ? dashaPeriod(antardashas[adIndex - 1]) : null,
      nextAntardashas: antardashas.slice(adIndex + 1, adIndex + 3).map(dashaPeriod),
      lords: [...new Set([cur.mahadasha.lord, cur.antardasha.lord])].map(placement),
    },
    slowTransits: {
      past: relevant.filter((s) => s.to <= nowIso),
      now: segments.filter((s) => s.from <= nowIso && nowIso < s.to),
      coming: relevant.filter((s) => s.from > nowIso),
    },
  };
}

export type LifeAreaFacts = ReturnType<typeof lifeAreaFacts>;
