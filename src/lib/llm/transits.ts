import "server-only";
import * as z from "zod/v4";
import type { LifeAreaFacts } from "@/lib/astrology/life-areas";
import type { WeeklyFacts } from "@/lib/astrology/weekly";
import type { LanguageCode } from "@/lib/profile";
import { LANGUAGE_NAMES } from "./base-report";

export const WeeklyReadingSchema = z.object({
  planets: z
    .array(
      z.object({
        planet: z.string().describe("Planet name exactly as in the data."),
        whatHappened: z.string().describe("While it was in its previous sign: what was probably happening in the person's life, and why. 40-80 words."),
        expect: z.string().describe("Now and over the coming weeks: what to expect and how to work with it, citing dates from the data. 40-80 words."),
      }),
    )
    .describe("One entry per planet in the data's planets list, same order."),
  moon: z.string().describe("The Moon's quick journey this week: the emotional tone of each stretch. 40-80 words."),
  dasha: z.string().describe("The running dasha periods and what they colour this week; mention any change within the week. 50-100 words."),
  summary: z.string().describe("The week in a nutshell: 2-4 sentences. Also used for the WhatsApp message."),
});
export type WeeklyReading = z.infer<typeof WeeklyReadingSchema>;

export const DeepDiveSchema = z.object({
  naturalPattern: z.string().describe("The person's natural pattern in this area from the birth chart. 120-200 words."),
  recentPast: z.string().describe("What has probably been happening over the past year and a half, from dashas and slow transits. 100-180 words."),
  comingUp: z.string().describe("What the next 12 months bring, with dates from the data. 100-180 words."),
  focus: z.string().describe("What to focus on: 3-5 practical, specific suggestions as a bullet list."),
});
export type DeepDive = z.infer<typeof DeepDiveSchema>;

const day = (iso: string) => iso.slice(0, 10);

/** Weekly facts with dates trimmed to days, plus the request header. */
export function weeklyInput(f: WeeklyFacts, language: LanguageCode) {
  return {
    request: { reading: "weekly_transits", language: LANGUAGE_NAMES[language], week: { from: day(f.week.start), to: day(f.week.end) } },
    houses: { countedFrom: f.reference.lagnaSign ? "both the Moon sign and the lagna" : "the Moon sign only (birth time unknown)", moonSign: f.reference.moonSign, lagnaSign: f.reference.lagnaSign },
    planets: f.planets.map((p) => ({
      planet: p.graha,
      before: { ...p.before, from: day(p.before.from), to: day(p.before.to) },
      now: { ...p.now, since: day(p.now.since) },
      thisWeek: p.thisWeek.map((e) => ({ event: e.type, date: day(e.date), ...(e.toSignName ? { into: e.toSignName } : {}) })),
      next: p.next && { ...p.next, date: day(p.next.date) },
    })),
    moon: f.moon.map((m) => ({ ...m, from: day(m.from), to: day(m.to) })),
    dasha: f.dasha.atStart && {
      mahadasha: { lord: f.dasha.atStart.mahadasha.lord, until: day(f.dasha.atStart.mahadasha.end) },
      antardasha: { lord: f.dasha.atStart.antardasha.lord, until: day(f.dasha.atStart.antardasha.end) },
      pratyantar: { lord: f.dasha.atStart.pratyantar.lord, until: day(f.dasha.atStart.pratyantar.end) },
      changesThisWeek: f.dasha.changes.map((c) => ({ ...c, date: day(c.date) })),
    },
  };
}

export function weeklyPrompt(input: ReturnType<typeof weeklyInput>): string {
  return `Weekly transit reading for ${input.request.week.from} to ${input.request.week.to}. Transits were calculated by the engine against this person's birth chart:

<transits>
${JSON.stringify(input, null, 1)}
</transits>

Write in ${input.request.language}. Go planet by planet, in the order given. For each planet the app already shows the facts (where it was, where it is, the dates), so you write two things:
- whatHappened: "While it was in <previous sign>…" what this probably meant in their life, given the houses it occupied, any natal planets it sat on or aspected, and its dignity. Speak in likelihoods ("you likely…", "this may have been…").
- expect: what its current sign, house and this week's events (stations, ingresses, combustion) bring now, and what to do with it. Use only dates from the data.

Then the Moon's journey through the week, the dasha, and a short summary. Talk only about planetary movements and dasha periods; no festivals or calendar events.`;
}

export function deepDivePrompt(facts: LifeAreaFacts, language: LanguageCode): string {
  const health = facts.area === "Health";
  return `A ${facts.area.toLowerCase()} deep dive, written from this person's computed birth chart, dashas and slow transits:

<chart_data>
${JSON.stringify({ ...facts, language: LANGUAGE_NAMES[language] }, null, 1)}
</chart_data>

Write in ${LANGUAGE_NAMES[language]}, in four parts:
1. naturalPattern: the houses, their lords and the karakas, read together: their natural style and strengths in this area.
2. recentPast: what has probably been happening, from the current and previous antardasha and the past slow transits through these houses.
3. comingUp: the next 12 months, from the coming antardashas and slow transits, with their dates.
4. focus: practical suggestions.
${health ? "\nThis is about wellbeing tendencies only. Do not diagnose, name diseases or predict illness; suggest general habits (rest, routine, movement, checking in with a doctor when something feels off)." : ""}`;
}
