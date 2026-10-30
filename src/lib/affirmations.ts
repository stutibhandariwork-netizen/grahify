import type { DailyFacts, Highlight } from "@/lib/astrology/daily";
import type { Graha } from "@/lib/engine";

/**
 * Hand-written English affirmations keyed to the day's main influence. Used
 * when Claude is not available (preview mode), and as examples of the tone.
 */

const ON_MOON: Partial<Record<Graha, string>> = {
  Saturn: "I take one steady step at a time, and that is enough.",
  Mars: "I meet today with patience; my strength is in staying calm.",
  Rahu: "I stay grounded in what is real and true for me.",
  Ketu: "I let go of what I no longer need and trust what remains.",
  Jupiter: "I am open to growth, good guidance and quiet luck.",
  Sun: "I can shine without needing to prove anything.",
  Venus: "I welcome beauty, ease and kindness into my day.",
  Mercury: "I speak clearly and listen with care.",
};

const MOON_HOUSE: Record<number, string> = {
  1: "I take care of myself first, and everything else follows.",
  2: "I value what I have and speak from a place of worth.",
  3: "I have the courage to say what I mean and try something new.",
  4: "I make room for comfort, home and rest.",
  5: "I let myself enjoy, create and play today.",
  6: "Small, steady routines are how I look after myself.",
  7: "I meet the people around me with openness and fairness.",
  8: "I can sit with what is deep, and let change do its work.",
  9: "I trust the bigger picture and stay open to learning.",
  10: "I show up for my work with purpose and focus.",
  11: "I welcome support from friends and celebrate small wins.",
  12: "I allow myself to rest, release and recharge.",
};

const ordinal = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

function fromHighlight(h: Highlight): string | null {
  if (h.kind === "station") {
    return h.event === "station_retrograde"
      ? "I slow down and give what matters a second look."
      : "I move forward, carrying what I have learned.";
  }
  if (h.kind === "on_moon" || (h.kind === "saturn_cycle" && h.houseFromMoon === 1)) return ON_MOON[h.planet] ?? null;
  if (h.kind === "saturn_cycle") return ON_MOON.Saturn!;
  return null;
}

export interface Affirmation {
  text: string;
  why: string;
}

/** The template affirmation for a day: the strongest influence if it has one, else the Moon's house. */
export function templateAffirmation(f: DailyFacts): Affirmation {
  const moonLine = `Today the Moon is in ${f.moon.sign}, your ${ordinal(f.moon.houseFromMoon)} house from your Moon sign.`;
  for (const h of f.highlights) {
    const text = fromHighlight(h);
    if (text) return { text, why: `${h.fact} ${moonLine}` };
  }
  return { text: MOON_HOUSE[f.moon.houseFromMoon], why: moonLine };
}
