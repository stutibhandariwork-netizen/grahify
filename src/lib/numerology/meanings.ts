import type { Graha } from "@/lib/engine";
import { birthNumber, lifePath, nameNumber, personalCycles, reduce, type NameSystem, type NumberResult } from "./calc";

export interface NumberMeaning {
  title: string;
  /** Ruling planet in Indian numerology (1-9 only). */
  planet: Graha | null;
  gifts: string;
  watch: string;
}

/** Short, original descriptions. Claude expands on these for the person. */
export const NUMBER_MEANINGS: Record<number, NumberMeaning> = {
  1: { title: "The initiator", planet: "Sun", gifts: "Independent, driven and original; happiest leading or starting something new.", watch: "Can turn stubborn or impatient with slower people." },
  2: { title: "The peacemaker", planet: "Moon", gifts: "Sensitive, intuitive and tactful; brings people together.", watch: "Moods and self-doubt; may give in too easily." },
  3: { title: "The communicator", planet: "Jupiter", gifts: "Expressive, optimistic and wise; teaches and inspires.", watch: "Scattered energy and promising more than there is time for." },
  4: { title: "The builder", planet: "Rahu", gifts: "Practical, hard-working and unconventional; builds systems that last.", watch: "Rigidity, or a restless streak that resists routine." },
  5: { title: "The explorer", planet: "Mercury", gifts: "Quick, curious and adaptable; good with words, trade and change.", watch: "Restlessness and nerves; starting more than gets finished." },
  6: { title: "The nurturer", planet: "Venus", gifts: "Warm, responsible and artistic; creates beauty and harmony at home.", watch: "Over-giving, or needing things to be perfect." },
  7: { title: "The seeker", planet: "Ketu", gifts: "Reflective, intuitive and spiritual; looks beneath the surface.", watch: "Withdrawal and overthinking; can feel misunderstood." },
  8: { title: "The achiever", planet: "Saturn", gifts: "Disciplined, ambitious and patient; success that builds slowly and lasts.", watch: "Carrying too much alone; work can crowd out rest." },
  9: { title: "The humanitarian", planet: "Mars", gifts: "Courageous, generous and idealistic; fights for others.", watch: "Quick temper and impatience; endings can hit hard." },
  11: { title: "The visionary (master 11)", planet: null, gifts: "A heightened 2: deep intuition and the power to inspire.", watch: "Nervous tension when the ideal and the real don't match." },
  22: { title: "The master builder (master 22)", planet: null, gifts: "A heightened 4: big plans turned into practical reality.", watch: "Pressure to achieve can become overwhelming." },
  33: { title: "The master teacher (master 33)", planet: null, gifts: "A heightened 6: compassion and service on a large scale.", watch: "Self-sacrifice that leaves nothing for yourself." },
};

export const PERSONAL_YEAR: Record<number, string> = {
  1: "New beginnings: plant seeds, start projects, act on your own initiative.",
  2: "Patience and partnership: cooperate, listen, and let things grow quietly.",
  3: "Expression and joy: create, socialise and share your ideas.",
  4: "Foundations: steady work, routines and building something solid.",
  5: "Change and freedom: travel, new experiences and letting go of what's stale.",
  6: "Home and responsibility: family, love, care and commitments.",
  7: "Reflection: study, rest, inner work and listening to intuition.",
  8: "Achievement: career, money and authority; effort pays off.",
  9: "Completion: finish cycles, clear out and forgive before the next 1.",
};

const PLANET_DAY: Record<number, string> = { 1: "Sunday", 2: "Monday", 3: "Thursday", 4: "Saturday", 5: "Wednesday", 6: "Friday", 7: "Monday", 8: "Saturday", 9: "Tuesday" };
const COLOURS: Record<number, string[]> = {
  1: ["gold", "orange"],
  2: ["white", "silver"],
  3: ["yellow", "saffron"],
  4: ["grey", "electric blue"],
  5: ["green"],
  6: ["pink", "light blue"],
  7: ["light green", "white"],
  8: ["dark blue", "black"],
  9: ["red", "coral"],
};
/** Supportive numbers follow the natural friendships of their planets. */
const FRIENDS: Record<number, number[]> = { 1: [2, 3, 9], 2: [1, 5], 3: [1, 2, 9], 4: [5, 6, 8], 5: [1, 6], 6: [5, 8, 4], 7: [9, 6], 8: [5, 6, 4], 9: [1, 2, 3] };

export interface NumerologyProfile {
  birth: NumberResult;
  lifePath: NumberResult;
  name: (NumberResult & { system: NameSystem; name: string }) | null;
  personal: { year: number; month: number; day: number; on: string };
  lucky: { number: number; supportive: number[]; day: string; colours: string[]; planet: Graha };
}

export function numerologyProfile(
  dob: { year: number; month: number; day: number },
  name: string,
  system: NameSystem,
  today: { year: number; month: number; day: number },
): NumerologyProfile {
  const birth = birthNumber(dob.day);
  const nn = nameNumber(name, system);
  const b = reduce(birth.value);
  return {
    birth,
    lifePath: lifePath(dob.year, dob.month, dob.day),
    name: nn && { ...nn, system, name },
    personal: {
      ...personalCycles(dob.month, dob.day, today),
      on: `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`,
    },
    lucky: { number: b, supportive: FRIENDS[b], day: PLANET_DAY[b], colours: COLOURS[b], planet: NUMBER_MEANINGS[b].planet! },
  };
}
