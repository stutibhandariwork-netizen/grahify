import "server-only";
import * as z from "zod/v4";
import { NUMBER_MEANINGS, PERSONAL_YEAR, type NumerologyProfile } from "@/lib/numerology/meanings";
import type { LanguageCode } from "@/lib/profile";
import { LANGUAGE_NAMES } from "./base-report";

export const NumerologyReadingSchema = z.object({
  core: z.string().describe("Birth number and life path together: who this person is and what they are here to grow into. 150-220 words."),
  name: z.string().describe("What the name number adds, and how it sits with the birth number and life path. 80-140 words. Empty string if there is no name number."),
  cycles: z.string().describe("This personal year, month and day: what to lean into now. 120-180 words."),
});
export type NumerologyReading = z.infer<typeof NumerologyReadingSchema>;

const meaning = (n: number) => ({ number: n, ...NUMBER_MEANINGS[n] });

export function numerologyInput(p: NumerologyProfile, firstName: string, language: LanguageCode) {
  return {
    request: { reading: "numerology", language: LANGUAGE_NAMES[language], date: p.personal.on },
    person: { firstName },
    birthNumber: { ...meaning(p.birth.value), fromDay: p.birth.compound, alsoCalled: "mulank / psychic number" },
    lifePath: { ...meaning(p.lifePath.value), compound: p.lifePath.compound, alsoCalled: "bhagyank" },
    nameNumber: p.name && { ...meaning(p.name.value), compound: p.name.compound, system: p.name.system, nameUsed: p.name.name, alsoCalled: "namank / destiny number" },
    personal: {
      year: { number: p.personal.year, theme: PERSONAL_YEAR[p.personal.year] },
      month: { number: p.personal.month, theme: PERSONAL_YEAR[p.personal.month] },
      day: { number: p.personal.day, theme: PERSONAL_YEAR[p.personal.day] },
    },
    lucky: p.lucky,
  };
}

export function numerologyPrompt(input: ReturnType<typeof numerologyInput>): string {
  return `A numerology reading. These numbers were calculated by code from the person's date of birth and name:

<numbers>
${JSON.stringify(input, null, 1)}
</numbers>

Write in ${input.request.language}, using the numbers and their given meanings as your basis; do not recalculate them. Explain what each number means for this person in everyday terms, and how the numbers work together or pull against each other. Keep lucky associations light: mention them only as traditional associations. Fill the response fields with Markdown prose.`;
}
