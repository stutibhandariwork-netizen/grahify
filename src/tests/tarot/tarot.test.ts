import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { DECK } from "@/lib/tarot/deck";
import { checkClarifier, checkPick, shuffleDeck, type DrawState } from "@/lib/tarot/shuffle";
import { SPREADS, yesNoVerdict } from "@/lib/tarot/spreads";

describe("deck", () => {
  it("has 78 unique cards indexed 0-77 with an image for each", () => {
    expect(DECK).toHaveLength(78);
    expect(DECK.map((c) => c.index)).toEqual(Array.from({ length: 78 }, (_, i) => i));
    expect(new Set(DECK.map((c) => c.id)).size).toBe(78);
    for (const c of DECK) expect(existsSync(path.join(process.cwd(), "public", "tarot", `${c.id}.jpg`)), c.id).toBe(true);
  });

  it("names and orders the minor arcana", () => {
    expect(DECK[22].name).toBe("Ace of Wands");
    expect(DECK[35].name).toBe("King of Wands");
    expect(DECK[36].id).toBe("cups-01");
    expect(DECK[77].name).toBe("King of Pentacles");
    expect(DECK.filter((c) => c.arcana === "major")).toHaveLength(22);
  });

  it("gives every card a scene and both meanings", () => {
    for (const c of DECK) {
      expect(c.scene.length, c.name).toBeGreaterThan(30);
      expect(c.upright.keywords.length, c.name).toBe(4);
      expect(c.reversed.keywords.length, c.name).toBe(4);
    }
  });
});

describe("shuffle", () => {
  it("returns a permutation of all 78 cards", () => {
    const { order, reversals } = shuffleDeck();
    expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: 78 }, (_, i) => i));
    expect(reversals).toHaveLength(78);
  });

  it("reverses about 30% of cards", () => {
    let reversed = 0;
    const runs = 400;
    for (let i = 0; i < runs; i++) reversed += shuffleDeck().reversals.filter(Boolean).length;
    const share = reversed / (runs * 78);
    expect(share).toBeGreaterThan(0.28);
    expect(share).toBeLessThan(0.32);
  });

  it("puts every card in every position with similar frequency", () => {
    const counts = new Array(78).fill(0);
    for (let i = 0; i < 7800; i++) counts[shuffleDeck().order[0]]++;
    // Expected 100 each; a biased shuffle would skew far beyond this.
    expect(Math.min(...counts)).toBeGreaterThan(55);
    expect(Math.max(...counts)).toBeLessThan(150);
  });
});

describe("picks", () => {
  const base: DrawState = { deckOrder: [], reversals: [], picks: [], clarifiers: [] };

  it("accepts positions 1-78 once each, up to the spread size", () => {
    expect(checkPick(base, 0, 3)).toBe("out_of_range");
    expect(checkPick(base, 79, 3)).toBe("out_of_range");
    expect(checkPick(base, 2.5, 3)).toBe("out_of_range");
    expect(checkPick(base, 12, 3)).toBeNull();
    expect(checkPick({ ...base, picks: [12] }, 12, 3)).toBe("already_drawn");
    expect(checkPick({ ...base, picks: [1, 2, 3] }, 4, 3)).toBe("spread_complete");
  });

  it("allows one clarifier per card after the spread is complete", () => {
    const done = { ...base, picks: [5, 9, 40] };
    expect(checkClarifier({ ...base, picks: [5] }, 0, 10, 3)).toBe("not_complete");
    expect(checkClarifier(done, 3, 10, 3)).toBe("bad_target");
    expect(checkClarifier(done, 1, 9, 3)).toBe("already_drawn");
    expect(checkClarifier(done, 1, 10, 3)).toBeNull();
    expect(checkClarifier({ ...done, clarifiers: [{ forPick: 1, position: 10 }] }, 1, 11, 3)).toBe("bad_target");
    expect(checkClarifier({ ...done, clarifiers: [{ forPick: 1, position: 10 }] }, 2, 10, 3)).toBe("already_drawn");
  });
});

describe("spreads and yes/no", () => {
  it("defines the five spreads with the right number of positions", () => {
    const sizes = Object.fromEntries(SPREADS.map((s) => [s.key, s.positions.length]));
    expect(sizes).toEqual({ THREE_CARD: 3, CARD_OF_DAY: 1, YES_NO: 1, LOVE: 3, CAREER: 3, MONEY: 3 });
    expect(SPREADS.find((s) => s.key === "THREE_CARD")!.positions.map((p) => p.name)).toEqual(["Situation", "Challenge", "What's coming"]);
  });

  it("derives the verdict from the card's nature and orientation", () => {
    expect(yesNoVerdict({ nature: "yes" }, false)).toBe("Yes");
    expect(yesNoVerdict({ nature: "yes" }, true)).toBe("Maybe");
    expect(yesNoVerdict({ nature: "no" }, false)).toBe("No");
    expect(yesNoVerdict({ nature: "no" }, true)).toBe("Maybe");
    expect(yesNoVerdict({ nature: "maybe" }, false)).toBe("Maybe");
  });
});
