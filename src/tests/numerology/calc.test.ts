import { describe, expect, it } from "vitest";
import { birthNumber, latinLetters, lifePath, nameNumber, personalCycles, reduce } from "@/lib/numerology/calc";
import { NUMBER_MEANINGS, numerologyProfile } from "@/lib/numerology/meanings";

describe("reduce", () => {
  it("sums digits down to one digit", () => {
    expect(reduce(2000)).toBe(2);
    expect(reduce(29)).toBe(2);
    expect(reduce(9)).toBe(9);
    expect(reduce(99)).toBe(9);
  });
  it("keeps master numbers only when asked", () => {
    expect(reduce(29, true)).toBe(11);
    expect(reduce(29)).toBe(2);
    expect(reduce(1993, true)).toBe(22);
  });
});

describe("birth number and life path", () => {
  it("reads the reference date 21 Jan 2000", () => {
    expect(birthNumber(21)).toEqual({ value: 3, compound: 21 });
    expect(lifePath(2000, 1, 21).value).toBe(6);
  });
  it("keeps master life paths", () => {
    expect(lifePath(2007, 1, 1).value).toBe(11); // 1 + 1 + 9
    expect(lifePath(2007, 9, 4).value).toBe(22); // 4 + 9 + 9
    expect(lifePath(1985, 11, 29).value).toBe(9); // 11 + 11 + 5 = 27
  });
});

describe("name number", () => {
  it("uses the Pythagorean table", () => {
    expect(nameNumber("John", "pythagorean")).toEqual({ value: 2, compound: 20 }); // 1+6+8+5
  });
  it("uses the Chaldean table, where no letter is 9", () => {
    expect(nameNumber("John", "chaldean")).toEqual({ value: 9, compound: 18 }); // 1+7+5+5
    expect(nameNumber("Asha", "chaldean")).toEqual({ value: 1, compound: 10 }); // 1+3+5+1
  });
  it("ignores spaces, punctuation and accents", () => {
    expect(nameNumber("José-María", "pythagorean")).toEqual(nameNumber("Jose Maria", "pythagorean"));
  });
  it("returns null for names in other scripts", () => {
    expect(latinLetters("स्तुति")).toBe("");
    expect(nameNumber("ସ୍ତୁତି", "chaldean")).toBeNull();
  });
});

describe("profile", () => {
  it("assembles numbers and lucky associations from the birth number", () => {
    const p = numerologyProfile({ year: 2000, month: 1, day: 21 }, "Asha", "chaldean", { year: 2026, month: 10, day: 31 });
    expect(p.birth.value).toBe(3);
    expect(p.lifePath.value).toBe(6);
    expect(p.name?.value).toBe(1);
    expect(p.personal).toEqual({ year: 5, month: 6, day: 1, on: "2026-10-31" });
    expect(p.lucky).toEqual({ number: 3, supportive: [1, 2, 9], day: "Thursday", colours: ["yellow", "saffron"], planet: "Jupiter" });
  });
  it("has a meaning for every number it can produce", () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]) expect(NUMBER_MEANINGS[n].gifts.length).toBeGreaterThan(10);
  });
});

describe("personal cycles", () => {
  it("computes personal year, month and day", () => {
    // Born 21 Jan: 3 + 1 + (2026 → 1) = 5; October: 5 + 1 = 6; the 31st: 6 + 4 = 10 → 1
    expect(personalCycles(1, 21, { year: 2026, month: 10, day: 31 })).toEqual({ year: 5, month: 6, day: 1 });
  });
});
