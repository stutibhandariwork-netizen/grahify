import { describe, expect, it } from "vitest";
import { templateAffirmation } from "@/lib/affirmations";
import { dailyFacts } from "@/lib/astrology/daily";
import { computeNatalChart, localToUtc } from "@/lib/engine";

const chart = computeNatalChart({
  utc: localToUtc("2000-01-21", "12:46", "Asia/Kolkata"),
  latitude: 20.46,
  longitude: 85.88,
  timeKnown: true,
  saturnYears: 1,
});
const day = (date: string) => dailyFacts(chart, localToUtc(date, "00:00", "Asia/Kolkata"), date);

describe("daily facts", () => {
  it("puts Mars over the natal Moon first when Mars is in Cancer (5 Apr 2025)", () => {
    const f = day("2025-04-05");
    expect(f.highlights[0]).toMatchObject({ kind: "on_moon", planet: "Mars" });
    expect(f.dasha?.mahadasha.lord).toBe("Mercury");
  });

  it("ranks a station above everything else (Mercury direct, 7 Apr 2025)", () => {
    const f = day("2025-04-07");
    expect(f.highlights[0]).toMatchObject({ kind: "station", planet: "Mercury", event: "station_direct" });
  });

  it("reports the Moon's sign, house and any change during the day", () => {
    const f = day("2025-04-05");
    expect(f.moon.houseFromMoon).toBeGreaterThanOrEqual(1);
    expect(f.moon.houseFromMoon).toBeLessThanOrEqual(12);
    if (f.moon.changes) expect(f.moon.changes.at.startsWith("2025-04-0")).toBe(true);
  });
});

describe("template affirmation", () => {
  it("uses the strongest influence and explains why", () => {
    const a = templateAffirmation(day("2025-04-05"));
    expect(a.text).toMatch(/patience/);
    expect(a.why).toMatch(/^Mars is passing over your Moon sign, Cancer\. Today the Moon is in /);
  });

  it("falls back to the Moon's house when nothing else stands out", () => {
    const f = { ...day("2025-04-05"), highlights: [] };
    const a = templateAffirmation(f);
    expect(a.why).toBe(`Today the Moon is in ${f.moon.sign}, your ${f.moon.houseFromMoon}${["st", "nd", "rd"][f.moon.houseFromMoon - 1] ?? "th"} house from your Moon sign.`);
    expect(a.text.length).toBeGreaterThan(10);
  });
});
