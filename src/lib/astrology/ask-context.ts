import {
  computeTransits,
  currentDasha,
  GRAHAS,
  SIGNS,
  type DashaPeriod,
  type Graha,
  type NatalChart,
} from "@/lib/engine";

const UPCOMING: Graha[] = ["Saturn", "Jupiter", "Rahu", "Ketu", "Mars"];
const DAY = 86_400_000;
const day = (iso: string) => iso.slice(0, 10);
const ordinal = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

/** A period or transit the answer can cite; Claude picks from these ids. */
export interface BasisOption {
  id: string;
  label: string;
}

/**
 * Time-sensitive context for a question: where every planet is now (relative
 * to the natal chart), what moves in the next six months, and which dasha
 * periods are running or about to start. Plus the list of citable periods.
 */
export function askTimeContext(chart: NatalChart, now: Date) {
  const moonSign = chart.planets.Moon.sign;
  const lagnaSign = chart.lagna?.sign ?? null;
  const end = new Date(now.getTime() + 182 * DAY);
  const report = computeTransits({ start: now, end, moonSign, lagnaSign });

  const transitsNow = GRAHAS.map((g) => {
    const s = report.atStart[g];
    return {
      planet: g,
      sign: s.signName,
      degree: Math.round(s.degree * 10) / 10,
      houseFromMoon: s.houseFromMoon,
      houseFromLagna: s.houseFromLagna,
      ...(s.retrograde && g !== "Rahu" && g !== "Ketu" ? { retrograde: true } : {}),
      ...(s.combust ? { combust: true } : {}),
      ...(s.dignity ? { dignity: s.dignity } : {}),
      overNatal: GRAHAS.filter((n) => chart.planets[n].sign === s.sign),
    };
  });

  const upcoming = report.events
    .filter((e) => UPCOMING.includes(e.graha) && ["ingress", "station_retrograde", "station_direct"].includes(e.type))
    .map((e) => ({
      planet: e.graha,
      event: e.type,
      date: day(e.date),
      ...(e.toSignName ? { into: e.toSignName, houseFromMoon: e.houseFromMoon, houseFromLagna: e.houseFromLagna } : {}),
    }));

  const cur = currentDasha(chart.dasha, now);
  const options: BasisOption[] = [];
  const periodLabel = (p: DashaPeriod, level: string) => `${p.lord} ${level} (${day(p.start).slice(0, 4)}–${day(p.end).slice(0, 4)})`;
  let dasha = null;
  if (cur) {
    const md = chart.dasha.mahadashas.find((m) => m.start === cur.mahadasha.start)!;
    const ads = md.antardashas;
    const adIdx = ads.findIndex((a) => a.start === cur.antardasha.start);
    const nextAd = ads[adIdx + 1] ?? chart.dasha.mahadashas[chart.dasha.mahadashas.indexOf(md) + 1]?.antardashas[0];
    const pds = ads[adIdx].pratyantars;
    const pdIdx = pds.findIndex((p) => p.start === cur.pratyantar.start);
    const nextPds = pds.slice(pdIdx + 1, pdIdx + 3);
    dasha = {
      mahadasha: { lord: cur.mahadasha.lord, start: day(cur.mahadasha.start), end: day(cur.mahadasha.end) },
      antardasha: { lord: cur.antardasha.lord, start: day(cur.antardasha.start), end: day(cur.antardasha.end) },
      pratyantar: { lord: cur.pratyantar.lord, start: day(cur.pratyantar.start), end: day(cur.pratyantar.end) },
      nextAntardasha: nextAd && { lord: nextAd.lord, start: day(nextAd.start) },
      nextPratyantars: nextPds.map((p) => ({ lord: p.lord, start: day(p.start) })),
    };
    options.push(
      { id: "mahadasha", label: periodLabel(cur.mahadasha, "mahadasha") },
      { id: "antardasha", label: `${cur.mahadasha.lord}–${cur.antardasha.lord} antardasha (to ${day(cur.antardasha.end)})` },
      { id: "pratyantar", label: `${cur.pratyantar.lord} pratyantar (to ${day(cur.pratyantar.end)})` },
    );
    if (nextAd) options.push({ id: "next_antardasha", label: `${nextAd.lord} antardasha from ${day(nextAd.start)}` });
  }
  for (const t of transitsNow) {
    if (["Saturn", "Jupiter", "Rahu", "Ketu", "Mars"].includes(t.planet)) {
      options.push({ id: `transit_${t.planet.toLowerCase()}`, label: `${t.planet} in ${t.sign} (${ordinal(t.houseFromMoon)} from Moon)` });
    }
  }
  if (chart.saturnCycles.some((c) => c.start <= now.toISOString() && now.toISOString() < c.end)) {
    const c = chart.saturnCycles.find((x) => x.start <= now.toISOString() && now.toISOString() < x.end)!;
    options.push({ id: "saturn_cycle", label: `${c.kind === "sade_sati" ? "Sade Sati" : "Ashtama Shani"} (to ${day(c.end)})` });
  }

  return {
    today: day(now.toISOString()),
    housesCountedFrom: lagnaSign === null ? "Moon sign only" : `lagna ${SIGNS[lagnaSign].en} and Moon ${SIGNS[moonSign].en}`,
    transitsNow,
    nextSixMonths: upcoming,
    dasha,
    basisOptions: options,
  };
}
