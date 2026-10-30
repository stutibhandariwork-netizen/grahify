import "server-only";
import * as z from "zod/v4";
import { templateAffirmation } from "@/lib/affirmations";
import type { DailyFacts } from "@/lib/astrology/daily";
import type { LanguageCode } from "@/lib/profile";
import { LANGUAGE_NAMES } from "./base-report";

export const AffirmationSchema = z.object({
  affirmation: z.string().describe("One line, first person, present tense, at most 20 words."),
  why: z.string().describe("One or two short sentences naming the transit or dasha it comes from, e.g. 'Today the Moon is in your 10th house…'."),
});

export function affirmationPrompt(f: DailyFacts, firstName: string, language: LanguageCode): string {
  const example = templateAffirmation(f);
  return `Today's sky for ${firstName}, calculated from their birth chart (date ${f.date}):

<today>
${JSON.stringify({ moon: f.moon, highlights: f.highlights, dasha: f.dasha && { mahadasha: f.dasha.mahadasha.lord, antardasha: f.dasha.antardasha.lord, pratyantar: f.dasha.pratyantar.lord } }, null, 1)}
</today>

Write today's personal affirmation in ${LANGUAGE_NAMES[language]}. Base it on the most significant influence (highlights are listed strongest first; if there are none, use the Moon's house). For example, Mars on their Moon calls for calm and patience; the Moon in the 10th calls for purpose at work.

- affirmation: one warm, grounded line in the first person. No predictions, no promises.
- why: one or two short sentences explaining which movement it comes from, in plain words.

For reference, a plain English version might be: "${example.text}" (${example.why}) Write your own, in ${LANGUAGE_NAMES[language]}.`;
}
