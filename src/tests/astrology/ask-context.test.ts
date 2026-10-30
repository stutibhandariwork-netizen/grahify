import { describe, expect, it } from "vitest";
import { askTimeContext } from "@/lib/astrology/ask-context";
import { computeNatalChart, localToUtc } from "@/lib/engine";

const chart = computeNatalChart({
  utc: localToUtc("2000-01-21", "12:46", "Asia/Kolkata"),
  latitude: 20.46,
  longitude: 85.88,
  timeKnown: true,
  saturnYears: 30,
});
const ctx = askTimeContext(chart, new Date("2025-02-01T00:00:00Z"));

describe("ask context", () => {
  it("places every planet now, relative to the natal chart", () => {
    expect(ctx.transitsNow).toHaveLength(9);
    const saturn = ctx.transitsNow.find((t) => t.planet === "Saturn")!;
    expect(saturn).toMatchObject({ sign: "Aquarius", houseFromMoon: 8, overNatal: ["Mars"] });
  });

  it("lists the next six months of slow-planet moves", () => {
    expect(ctx.nextSixMonths).toContainEqual(expect.objectContaining({ planet: "Saturn", event: "ingress", into: "Pisces", date: "2025-03-29" }));
  });

  it("offers the running periods and current Saturn cycle as citable basis", () => {
    const ids = ctx.basisOptions.map((o) => o.id);
    expect(ids).toEqual(expect.arrayContaining(["mahadasha", "antardasha", "pratyantar", "next_antardasha", "transit_saturn", "saturn_cycle"]));
    expect(ctx.basisOptions.find((o) => o.id === "mahadasha")!.label).toBe("Mercury mahadasha (2012–2029)");
    expect(ctx.basisOptions.find((o) => o.id === "saturn_cycle")!.label).toBe("Ashtama Shani (to 2025-03-29)");
  });
});
