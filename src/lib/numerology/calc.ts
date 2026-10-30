/**
 * Numerology calculations. Pure functions: no I/O, no interpretation.
 */

export type NameSystem = "chaldean" | "pythagorean";

export const MASTER_NUMBERS = [11, 22, 33];

const digitSum = (n: number) =>
  String(n)
    .split("")
    .reduce((s, d) => s + Number(d), 0);

/** Repeatedly sums digits down to 1-9, stopping at 11, 22 or 33 when `keepMasters` is set. */
export function reduce(n: number, keepMasters = false): number {
  let x = Math.abs(n);
  while (x > 9 && !(keepMasters && MASTER_NUMBERS.includes(x))) x = digitSum(x);
  return x;
}

export interface NumberResult {
  value: number; // 1-9, or a master number where the method keeps them
  /** The unreduced total, e.g. 29 before it became 11. */
  compound: number;
}

/** Birth number (mulank / psychic number): the day of birth reduced to 1-9. */
export function birthNumber(day: number): NumberResult {
  return { value: reduce(day), compound: day };
}

/**
 * Life path (bhagyank): day, month and year each reduced, then added and reduced,
 * keeping master numbers 11, 22 and 33.
 */
export function lifePath(year: number, month: number, day: number): NumberResult {
  const compound = reduce(day, true) + reduce(month, true) + reduce(year, true);
  return { value: reduce(compound, true), compound };
}

const PYTHAGOREAN: Record<string, number> = Object.fromEntries(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((c, i) => [c, (i % 9) + 1]),
);

// Chaldean has no 9: it is held sacred and not assigned to any letter.
const CHALDEAN: Record<string, number> = Object.fromEntries(
  Object.entries({ 1: "AIJQY", 2: "BKR", 3: "CGLS", 4: "DMT", 5: "EHNX", 6: "UVW", 7: "OZ", 8: "FP" }).flatMap(([n, letters]) =>
    letters.split("").map((c) => [c, Number(n)]),
  ),
);

/** Latin letters only, accents removed. Returns "" for names written only in other scripts. */
export function latinLetters(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

/**
 * Destiny / name number (namank). Pythagorean keeps master numbers; Chaldean
 * reports the compound total (whose meaning some traditions read) and its root.
 * Returns null when the name has no Latin letters.
 */
export function nameNumber(name: string, system: NameSystem): NumberResult | null {
  const letters = latinLetters(name);
  if (!letters) return null;
  const table = system === "chaldean" ? CHALDEAN : PYTHAGOREAN;
  const compound = letters.split("").reduce((s, c) => s + table[c], 0);
  return { value: reduce(compound, system === "pythagorean"), compound };
}

export function letterValues(name: string, system: NameSystem): { letter: string; value: number }[] {
  const table = system === "chaldean" ? CHALDEAN : PYTHAGOREAN;
  return latinLetters(name)
    .split("")
    .map((letter) => ({ letter, value: table[letter] }));
}

/** Personal year, month and day for a calendar date (calendar-year method). */
export function personalCycles(birthMonth: number, birthDay: number, on: { year: number; month: number; day: number }) {
  const year = reduce(reduce(birthDay) + reduce(birthMonth) + reduce(on.year));
  const month = reduce(year + reduce(on.month));
  const day = reduce(month + reduce(on.day));
  return { year, month, day };
}
