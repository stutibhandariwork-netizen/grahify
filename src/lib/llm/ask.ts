import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import * as z from "zod/v4";
import type { askTimeContext, BasisOption } from "@/lib/astrology/ask-context";
import { GRAHAS } from "@/lib/engine";
import type { NumerologyProfile } from "@/lib/numerology/meanings";
import type { LanguageCode } from "@/lib/profile";
import { DECK } from "@/lib/tarot/deck";
import { baseReportInput, LANGUAGE_NAMES } from "./base-report";

/** The answer plus what it rests on, picked from ids we supplied so nothing is invented. */
export function answerSchema(options: BasisOption[]) {
  const ids = options.map((o) => o.id);
  return z.object({
    answer: z.string().describe("The answer in Markdown, 80-250 words. Lead with the direct answer, then why, then what to do."),
    basisPlanets: z.array(z.enum(GRAHAS as [string, ...string[]])).describe("Planets the answer mainly rests on, at most 4."),
    basisPeriods: z
      .array(ids.length ? z.enum(ids as [string, ...string[]]) : z.string())
      .describe("Ids of the dasha periods or transits the answer rests on, from basisOptions, at most 4."),
  });
}

export interface AskExtras {
  tarot?: { cardIndex: number; reversed: boolean };
  numerology?: NumerologyProfile;
  journal?: { date: string; text: string }[];
}

type Natal = ReturnType<typeof baseReportInput>;

export function askPrompt(
  question: string,
  natal: Omit<Natal, "request">,
  time: ReturnType<typeof askTimeContext>,
  extras: AskExtras,
  language: LanguageCode,
): string {
  const tarot = extras.tarot && DECK[extras.tarot.cardIndex];
  const context = {
    birthChart: natal,
    now: time,
    ...(tarot
      ? {
          tarotCard: {
            card: tarot.name,
            orientation: extras.tarot!.reversed ? "reversed" : "upright",
            scene: tarot.scene,
            keywords: (extras.tarot!.reversed ? tarot.reversed : tarot.upright).keywords,
            note: "Drawn for this question with a secure random shuffle.",
          },
        }
      : {}),
    ...(extras.numerology
      ? {
          numerology: {
            birthNumber: extras.numerology.birth.value,
            lifePath: extras.numerology.lifePath.value,
            personalYear: extras.numerology.personal.year,
            personalMonth: extras.numerology.personal.month,
            personalDay: extras.numerology.personal.day,
          },
        }
      : {}),
    ...(extras.journal?.length ? { theirRecentJournalNotes: extras.journal } : {}),
  };

  return `<context>
${JSON.stringify(context, null, 1)}
</context>

Their question: ${question}

Answer in ${LANGUAGE_NAMES[language]}, using only the context above${tarot ? " (including the tarot card they drew)" : ""}${extras.numerology ? " and their numbers" : ""}. Be direct: if the chart leans one way, say so, and say how confident it is. If the question asks for something astrology can't responsibly answer (medical, legal, financial guarantees, death, pregnancy), say so kindly and offer what the chart can speak to instead. In basisPlanets and basisPeriods, list what you actually relied on.`;
}

/** Earlier turns as plain text (no context blocks), then the new question with fresh context. */
export function askMessages(history: { role: "user" | "assistant"; text: string }[], prompt: string): Anthropic.Beta.BetaMessageParam[] {
  return [...history.slice(-12).map((m) => ({ role: m.role, content: m.text })), { role: "user", content: prompt }];
}
