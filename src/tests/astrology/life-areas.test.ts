import { describe, expect, it } from "vitest";
import { AREAS, areaByKey, lifeAreaFacts } from "@/lib/astrology/life-areas";
import { computeNatalChart, localToUtc } from "@/lib/engine";

const chart = computeNatalChart({
  utc: localToUtc("2000-01-21", "12:46", "Asia/Kolkata"),
  latitude: 20.46,
  longitude: 85.88,
  timeKnown: true,
  saturnYears: 1,
});
const NOW = new Date("2025-06-01T00:00:00Z");

describe("life-area facts", () => {
  it("reads career from the 10th (Aquarius for Taurus lagna), with its lord and occupants", () => {
    const f = lifeAreaFacts(chart, areaByKey("career")!, NOW);
    const tenth = f.houses[0];
    expect(tenth).toMatchObject({ house: 10, sign: "Aquarius", occupants: ["Mars"] });
    expect(tenth.lord).toMatchObject({ planet: "Saturn", sign: "Aries", house: 12, dignity: "debilitated" });
    expect(tenth.lord.rulesHouses).toEqual([9, 10]);
  });

  it("includes the dasha and flags lords that touch the area", () => {
    const f = lifeAreaFacts(chart, areaByKey("career")!, NOW);
    expect(f.dasha?.mahadasha.lord).toBe("Mercury");
    // Mercury rules the 2nd and 5th for Taurus lagna, not career houses, and sits in the 9th.
    expect(f.dasha?.mahadasha.activatesArea).toBe(false);
    expect(f.dasha?.nextAntardashas.length).toBeGreaterThan(0);
  });

  it("finds slow transits through the area's houses, past and coming", () => {
    const f = lifeAreaFacts(chart, areaByKey("career")!, NOW);
    // Saturn was in Aquarius (the 10th) until 29 Mar 2025.
    expect(f.slowTransits.past.some((s) => s.planet === "Saturn" && s.sign === "Aquarius" && s.inAreaHouse)).toBe(true);
    expect(f.slowTransits.now.map((s) => s.planet).sort()).toEqual(["Jupiter", "Ketu", "Rahu", "Saturn"]);
  });

  it("gives stays that began before the 18-month window their real start, in date order", () => {
    const f = lifeAreaFacts(chart, areaByKey("career")!, NOW);
    const aquarius = f.slowTransits.past.find((s) => s.planet === "Saturn" && s.sign === "Aquarius")!;
    expect(aquarius.from).toBe("2023-01-17");
    expect(aquarius.to).toBe("2025-03-29");
    const froms = f.slowTransits.past.map((s) => s.from);
    expect(froms).toEqual([...froms].sort());
  });

  it("reads love from the 7th (Scorpio) and 5th (Virgo)", () => {
    const f = lifeAreaFacts(chart, areaByKey("love")!, NOW);
    expect(f.houses.map((h) => [h.house, h.sign])).toEqual([
      [7, "Scorpio"],
      [5, "Virgo"],
    ]);
    expect(f.karakas.map((k) => k.planet)).toEqual(["Venus", "Moon"]);
  });

  it("defines the four areas", () => {
    expect(AREAS.map((a) => a.key)).toEqual(["career", "money", "love", "health"]);
  });
});
