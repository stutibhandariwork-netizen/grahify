import type { TarotCard, YesNoNature } from "./deck";

export type SpreadKey = "THREE_CARD" | "CARD_OF_DAY" | "YES_NO" | "LOVE" | "CAREER" | "MONEY";

export interface SpreadPosition {
  name: string;
  /** What a card in this position speaks to; given to Claude with the card. */
  asks: string;
}

export interface Spread {
  key: SpreadKey;
  slug: string;
  title: string;
  blurb: string;
  question: "none" | "optional" | "required";
  positions: SpreadPosition[];
}

export const SPREADS: Spread[] = [
  {
    key: "THREE_CARD",
    slug: "three-card",
    title: "Three-card reading",
    blurb: "Where you stand, what's in the way, and what's coming.",
    question: "optional",
    positions: [
      { name: "Situation", asks: "the heart of the situation as it stands now" },
      { name: "Challenge", asks: "the obstacle or tension to work with" },
      { name: "What's coming", asks: "where things are heading if the current path continues" },
    ],
  },
  {
    key: "CARD_OF_DAY",
    slug: "card-of-the-day",
    title: "Card of the day",
    blurb: "One card and a short message for today.",
    question: "none",
    positions: [{ name: "Today", asks: "the energy and focus for today" }],
  },
  {
    key: "YES_NO",
    slug: "yes-no",
    title: "Yes / No",
    blurb: "Ask a clear question and pull one card.",
    question: "required",
    positions: [{ name: "Answer", asks: "the answer to the question and why" }],
  },
  {
    key: "LOVE",
    slug: "love",
    title: "Love",
    blurb: "Your heart now, what helps love grow, and where it's heading.",
    question: "optional",
    positions: [
      { name: "Your heart now", asks: "how the person is feeling and showing up in love right now" },
      { name: "What love needs", asks: "what would help the relationship, or the search for one, to grow" },
      { name: "Where it's heading", asks: "the direction love is moving in" },
    ],
  },
  {
    key: "CAREER",
    slug: "career",
    title: "Career",
    blurb: "Your work now, what's in the way, and your next step.",
    question: "optional",
    positions: [
      { name: "Your work now", asks: "the person's current working situation and energy" },
      { name: "What's in the way", asks: "the main block or tension at work" },
      { name: "Your next step", asks: "the most useful next move for their career" },
    ],
  },
  {
    key: "MONEY",
    slug: "money",
    title: "Money",
    blurb: "Your money picture, what to watch, and where it's heading.",
    question: "optional",
    positions: [
      { name: "Your money picture", asks: "the person's current relationship with money and resources" },
      { name: "What to watch", asks: "the habit, risk or pattern to be careful with" },
      { name: "Where it's heading", asks: "the direction their finances are moving in" },
    ],
  },
];

export const spreadByKey = (key: SpreadKey) => SPREADS.find((s) => s.key === key)!;
export const spreadBySlug = (slug: string) => SPREADS.find((s) => s.slug === slug) ?? null;

export type Verdict = "Yes" | "No" | "Maybe";

/**
 * Yes/No from the card's nature and orientation, decided in code so it is
 * consistent; Claude only explains the reasoning.
 * Upright keeps the card's leaning; reversed softens a yes or a no to a maybe.
 */
export function yesNoVerdict(card: Pick<TarotCard, "nature">, reversed: boolean): Verdict {
  const byNature: Record<YesNoNature, Verdict> = { yes: "Yes", no: "No", maybe: "Maybe" };
  if (card.nature === "maybe" || reversed) return "Maybe";
  return byNature[card.nature];
}
