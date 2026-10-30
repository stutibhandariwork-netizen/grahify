import { beforeAll, describe, expect, it } from "vitest";
import { weekStart, weeklyFacts, type WeeklyFacts } from "@/lib/astrology/weekly";
import { computeNatalChart, localToUtc, utcOffsetMinutes } from "@/lib/engine";

const chart = computeNatalChart({
  utc: localToUtc("2000-01-21", "12:46", "Asia/Kolkata"),
  latitude: 20.46,
  longitude: 85.88,
  timeKnown: true,
  saturnYears: 1,
});
const ist = (d: Date) => utcOffsetMinutes("Asia/Kolkata", d);

describe("weekStart", () => {
  it("starts weeks on Saturday at local midnight", () => {
    // Wed 2 Apr 2025, 10:00 IST → Sat 29 Mar 2025, 00:00 IST
    expect(weekStart(new Date("2025-04-02T04:30:00Z"), ist).toISOString()).toBe("2025-03-28T18:30:00.000Z");
    // A Saturday maps to itself
    expect(weekStart(new Date("2025-03-29T10:00:00Z"), ist).toISOString()).toBe("2025-03-28T18:30:00.000Z");
  });
});

describe("weekly facts: the week Saturn entered Pisces (29 Mar 2025)", () => {
  let f: WeeklyFacts;
  beforeAll(() => {
    const start = new Date("2025-03-28T18:30:00Z");
    f = weeklyFacts(chart, start, new Date(start.getTime() + 7 * 86_400_000));
  });

  it("orders planets slowest first and leaves the Moon to its own journey", () => {
    expect(f.planets.map((p) => p.graha)).toEqual(["Saturn", "Jupiter", "Rahu", "Ketu", "Mars", "Sun", "Venus", "Mercury"]);
    expect(f.moon.length).toBeGreaterThanOrEqual(3);
    expect(f.moon[0].from).toBe(f.week.start);
    expect(f.moon.at(-1)!.to).toBe(f.week.end);
  });

  it("describes Saturn leaving Aquarius (8th from Moon) for Pisces (9th) this week", () => {
    const s = f.planets[0];
    expect(s.before.signName).toBe("Aquarius");
    expect(s.before.houseFromMoon).toBe(8);
    expect(s.before.from.slice(0, 10)).toBe("2023-01-17");
    expect(s.now.signName).toBe("Pisces");
    expect(s.now.houseFromMoon).toBe(9);
    expect(s.now.houseFromLagna).toBe(11);
    expect(s.thisWeek.some((e) => e.type === "ingress")).toBe(true);
    expect(s.next?.signName).toBe("Aries");
  });

  it("uses the previous sign when nothing changes this week", () => {
    const j = f.planets[1];
    expect(j.now.signName).toBe("Taurus");
    expect(j.before.signName).toBe("Aries");
    expect(j.thisWeek.filter((e) => e.type === "ingress")).toHaveLength(0);
    expect(new Date(j.before.to) < new Date(f.week.start)).toBe(true);
  });

  it("notes natal planets a transit sits on or aspects", () => {
    // Saturn in Pisces aspects Taurus (3rd), Virgo (7th) and Sagittarius (10th): natal Venus is in Sagittarius.
    expect(f.planets[0].now.aspectsNatal).toContain("Venus");
    // Saturn in Aquarius sat on natal Mars.
    expect(f.planets[0].before.overNatal).toEqual(["Mars"]);
  });

  it("includes the running dasha", () => {
    expect(f.dasha.atStart?.mahadasha.lord).toBe("Mercury");
  });
});
