import "server-only";
import * as z from "zod/v4";
import { SIGN_LORDS, SIGNS, type DashaPeriod, type NatalChart } from "@/lib/engine";
import type { BirthData, LanguageCode } from "@/lib/profile";

export const LANGUAGE_NAMES: Record<LanguageCode, string> = { en: "English", hi: "Hindi", or: "Odia" };

export const BaseReportSchema = z.object({
  coreSigns: z.string().describe("Moon sign and nakshatra, Sun sign, and lagna: what each says about the person. 150-250 words."),
  placements: z.string().describe("The most telling planet placements, one short paragraph each for 4-6 planets. 250-400 words."),
  patterns: z.string().describe("The yogas present, in plain language: what each means day to day. 150-300 words."),
  dashaTimeline: z.string().describe("The mahadasha sequence as chapters of life, with the years from the data. 150-250 words."),
  lifeCycles: z.string().describe("Sade Sati and Ashtama Shani periods from the data, with ages, and what they ask of the person. 100-200 words."),
  rightNow: z.string().describe("Where they are now: current mahadasha, antardasha and pratyantar, and any Saturn cycle running today. 100-180 words."),
});
export type BaseReport = z.infer<typeof BaseReportSchema>;

const signLabel = (s: number) => `${SIGNS[s].en} (${SIGNS[s].sa})`;
const day = (iso: string) => iso.slice(0, 10);
const period = (p: DashaPeriod) => ({ lord: p.lord, start: day(p.start), end: day(p.end) });
const round = (x: number) => Math.round(x * 10) / 10;

/** The compact, factual input Claude receives. Nothing here is computed by the model. */
export function baseReportInput(chart: NatalChart, birth: BirthData, language: LanguageCode, today: Date) {
  const currentMd = chart.currentDasha
    ? chart.dasha.mahadashas.find((m) => m.start === chart.currentDasha!.mahadasha.start)
    : undefined;

  return {
    request: { reading: "base_report", language: LANGUAGE_NAMES[language], today: day(today.toISOString()) },
    person: { name: birth.name, birthDate: birth.birthDate, birthTimeKnown: birth.timeKnown },
    system: { zodiac: "sidereal", ayanamsa: "Lahiri", houses: "whole-sign", nodes: "mean" },
    notes: chart.warnings,
    lagna: chart.lagna && {
      sign: signLabel(chart.lagna.sign),
      degree: round(chart.lagna.degree),
      nakshatra: `${chart.lagna.nakshatra.name} pada ${chart.lagna.nakshatra.pada}`,
      borderline: chart.lagna.borderline && {
        alternateLagna: signLabel(chart.lagna.borderline.alternateSign),
        birthTimeChangeNeededMinutes: chart.lagna.borderline.minutesToChange,
        planetHousesUnderAlternate: chart.lagna.borderline.alternateHouses,
      },
    },
    housesCountedFrom: chart.houseBasis === "lagna" ? "lagna" : "Moon sign (birth time unknown)",
    planets: Object.values(chart.planets).map((p) => ({
      planet: p.graha,
      sign: signLabel(p.sign),
      degree: round(p.degree),
      house: p.house,
      houseFromMoon: p.houseFromMoon,
      nakshatra: `${p.nakshatra.name} pada ${p.nakshatra.pada}`,
      ...(p.retrograde && p.graha !== "Rahu" && p.graha !== "Ketu" ? { retrograde: true } : {}),
      ...(p.dignity ? { dignity: p.dignity } : {}),
      ...(p.combust ? { combust: true } : {}),
      navamsaSign: SIGNS[p.navamsaSign].en,
    })),
    houses: chart.houses.map((h) => ({
      house: h.house,
      sign: SIGNS[h.sign].en,
      lord: h.lord,
      lordIn: chart.planets[SIGN_LORDS[h.sign]].house,
      occupants: h.occupants,
    })),
    yogasPresent: chart.yogas
      .filter((y) => y.present)
      .map((y) => ({ name: y.name, details: y.details, ...(y.cancelled ? { cancelled: true } : {}) })),
    yogasChecked: chart.yogas.filter((y) => !y.present).map((y) => y.name),
    dasha: {
      system: "Vimshottari",
      mahadashas: chart.dasha.mahadashas.map(period),
      current: chart.currentDasha && {
        mahadasha: period(chart.currentDasha.mahadasha),
        antardasha: period(chart.currentDasha.antardasha),
        pratyantar: period(chart.currentDasha.pratyantar),
      },
      antardashasOfCurrentMahadasha: currentMd?.antardashas.map(period),
    },
    saturnCycles: chart.saturnCycles.map((c) => ({
      kind: c.kind === "sade_sati" ? "Sade Sati" : "Ashtama Shani",
      start: day(c.start),
      end: day(c.end),
      phases: c.segments.map((s) => ({ sign: SIGNS[s.sign].en, phase: s.phase, from: day(s.start), to: day(s.end) })),
    })),
  };
}

export function baseReportPrompt(input: ReturnType<typeof baseReportInput>): string {
  return `Here is ${input.person.name}'s calculated birth chart as JSON:

<chart>
${JSON.stringify(input, null, 1)}
</chart>

Write their base astrology report in ${input.request.language}. It is the first reading they will see, so orient them: what kind of person this chart describes, how their life unfolds through the dashas, and where they are today (${input.request.today}).

Fill each field of the response with Markdown prose for that section. The app shows the sign cards, chart drawing, placements table and timelines next to your text, so interpret rather than list: say what things mean for this person.
${input.lagna?.borderline ? `\nTheir lagna is within 2° of the next sign. In coreSigns, say so gently, name both possible lagnas, and explain what would differ.` : ""}${input.person.birthTimeKnown ? "" : "\nTheir birth time is unknown: there is no lagna, houses are counted from the Moon sign. Say this once, briefly, in coreSigns."}`;
}
