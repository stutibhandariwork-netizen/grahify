import "server-only";
import * as z from "zod/v4";
import { DECK } from "@/lib/tarot/deck";
import type { SessionView } from "@/lib/tarot/session";
import { spreadByKey } from "@/lib/tarot/spreads";
import { LANGUAGE_NAMES } from "./base-report";
import type { LanguageCode } from "@/lib/profile";

export const TarotReadingSchema = z.object({
  cards: z
    .array(
      z.object({
        position: z.string().describe("The position name exactly as given."),
        meaning: z.string().describe("What this card, in this orientation, says in this position for this person. 60-120 words."),
      }),
    )
    .describe("One entry per drawn card, in order."),
  summary: z.string().describe("Depends on the spread; see the request."),
});
export type TarotReading = z.infer<typeof TarotReadingSchema>;

export const ClarifierSchema = z.object({
  meaning: z.string().describe("How the clarifier card sheds light on the card it clarifies. 50-100 words."),
});

/** Stored reading: Claude's text for the spread plus any clarifiers drawn later. */
export interface TarotReadingContent extends TarotReading {
  clarifiers: { forPick: number; meaning: string }[];
}

function describe(cardIndex: number, reversed: boolean) {
  const c = DECK[cardIndex];
  const side = reversed ? c.reversed : c.upright;
  return {
    card: c.name,
    orientation: reversed ? "reversed" : "upright",
    scene: c.scene,
    keywords: side.keywords,
    traditionalMeaning: side.meaning,
  };
}

export function tarotInput(view: SessionView, language: LanguageCode) {
  const spread = spreadByKey(view.spread);
  return {
    request: { reading: "tarot", spread: spread.title, language: LANGUAGE_NAMES[language] },
    question: view.question,
    cards: view.cards.map((c, i) => ({ position: spread.positions[i].name, positionAsks: spread.positions[i].asks, ...describe(c.cardIndex, c.reversed) })),
    ...(view.verdict ? { verdict: view.verdict, verdictRule: "Decided by the card's nature: upright keeps its leaning; reversed softens it to Maybe." } : {}),
  };
}

const SUMMARY_TASK: Record<string, string> = {
  CARD_OF_DAY: "summary: a short message for today, 2-3 sentences, warm and practical.",
  YES_NO: "summary: explain the verdict given in the data (do not change it): why this card in this orientation leans that way, and what would help. 80-140 words. Start with the verdict word.",
  default: "summary: how the cards read together as one story, and one or two concrete things to focus on. 120-200 words.",
};

export function tarotPrompt(input: ReturnType<typeof tarotInput>, spreadKey: string): string {
  return `A tarot reading. The cards were shuffled with a secure random generator and chosen by the person; here is what they drew:

<reading>
${JSON.stringify(input, null, 1)}
</reading>

Write in ${input.request.language}.
${input.question ? `Their question: "${input.question}". Answer it through the cards, honestly and without promising outcomes.` : "They did not ask a specific question; read for their life as it is now."}

Fill the response fields:
- cards: for each card, what it means in its position for them. Ground it in the card's imagery (the scene) and its orientation.
- ${SUMMARY_TASK[spreadKey] ?? SUMMARY_TASK.default}`;
}

export function clarifierPrompt(input: ReturnType<typeof tarotInput>, forPick: number, cardIndex: number, reversed: boolean): string {
  const target = input.cards[forPick];
  return `A tarot reading:

<reading>
${JSON.stringify(input, null, 1)}
</reading>

The person drew a clarifier card for "${target.card}" in the "${target.position}" position:

<clarifier>
${JSON.stringify(describe(cardIndex, reversed), null, 1)}
</clarifier>

In ${input.request.language}, explain how the clarifier adds detail to that card in that position. Do not repeat the whole reading.`;
}
