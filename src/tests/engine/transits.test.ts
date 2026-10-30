import { beforeAll, describe, expect, it } from "vitest";
import { computeTransits, type TransitReport } from "@/lib/engine";

// Reference chart: Moon in Cancer, lagna Taurus.
const CANCER = 3, TAURUS = 1;

const DAY = 86_400_000;
const near = (iso: string, expected: string, days = 1) =>
  expect(Math.abs(new Date(iso).getTime() - new Date(expected).getTime())).toBeLessThanOrEqual(days * DAY);

let year: TransitReport;
beforeAll(() => {
  year = computeTransits({
    start: new Date("2025-01-01T00:00:00Z"),
    end: new Date("2025-12-31T00:00:00Z"),
    moonSign: CANCER,
    lagnaSign: TAURUS,
  });
});

const find = (graha: string, type: string, after = "") =>
  year.events.find((e) => e.graha === graha && e.type === type && e.date >= after)!;

describe("sign changes in 2025 (sidereal, Lahiri)", () => {
  it("Sun enters Capricorn on Makar Sankranti", () => near(find("Sun", "ingress").date, "2025-01-14T03:00Z"));

  it("Saturn enters Pisces, 9th from Moon and 11th from lagna", () => {
    const e = year.events.find((x) => x.graha === "Saturn" && x.type === "ingress")!;
    near(e.date, "2025-03-29T12:00Z");
    expect(e.toSignName).toBe("Pisces");
    expect(e.houseFromMoon).toBe(9);
    expect(e.houseFromLagna).toBe(11);
  });

  it("Jupiter enters Gemini, then Cancer", () => {
    const ingresses = year.events.filter((x) => x.graha === "Jupiter" && x.type === "ingress");
    near(ingresses[0].date, "2025-05-14T12:00Z");
    expect(ingresses[1].toSignName).toBe("Cancer");
    near(ingresses[1].date, "2025-10-18T12:00Z");
  });

  it("Rahu and Ketu change sign together", () => {
    const r = find("Rahu", "ingress");
    const k = find("Ketu", "ingress");
    expect(r.toSignName).toBe("Aquarius");
    expect(k.toSignName).toBe("Leo");
    expect(r.date).toBe(k.date);
  });
});

describe("stations and combustion", () => {
  it("finds Mercury's three retrograde cycles", () => {
    const retro = year.events.filter((e) => e.graha === "Mercury" && e.type === "station_retrograde").map((e) => e.date);
    const direct = year.events.filter((e) => e.graha === "Mercury" && e.type === "station_direct").map((e) => e.date);
    ["2025-03-15", "2025-07-18", "2025-11-09"].forEach((d, i) => near(retro[i], `${d}T12:00Z`));
    ["2025-04-07", "2025-08-11", "2025-11-29"].forEach((d, i) => near(direct[i], `${d}T12:00Z`));
  });

  it("pairs every combustion start with an end", () => {
    const start = find("Saturn", "combust_start");
    const end = find("Saturn", "combust_end", start.date);
    expect(end.date > start.date).toBe(true);
  });

  it("returns events in date order", () => {
    const dates = year.events.map((e) => e.date);
    expect(dates).toEqual([...dates].sort());
  });
});

describe("weekly context", () => {
  it("says where Saturn was before, since when, and where it goes next", () => {
    const week = computeTransits({
      start: new Date("2025-04-05T00:00:00Z"),
      end: new Date("2025-04-12T00:00:00Z"),
      moonSign: CANCER,
      lagnaSign: TAURUS,
    });
    const c = week.context.Saturn;
    expect(c.current.signName).toBe("Pisces");
    near(c.current.since, "2025-03-29T12:00Z");
    expect(c.previous.signName).toBe("Aquarius");
    expect(c.previous.houseFromMoon).toBe(8);
    near(c.previous.from, "2023-01-17T12:00Z", 2);
    expect(c.next?.signName).toBe("Aries");
    expect(new Date(c.next!.date).getUTCFullYear()).toBe(2027);
  });

  it("counts houses from the Moon only when the lagna is unknown", () => {
    const r = computeTransits({
      start: new Date("2025-04-05T00:00:00Z"),
      end: new Date("2025-04-06T00:00:00Z"),
      moonSign: CANCER,
      lagnaSign: null,
      natalSigns: { Moon: CANCER },
      grahas: ["Mars"],
    });
    expect(r.atStart.Mars.signName).toBe("Cancer");
    expect(r.atStart.Mars.houseFromMoon).toBe(1);
    expect(r.atStart.Mars.houseFromLagna).toBeNull();
    expect(r.atStart.Mars.overNatal).toEqual(["Moon"]);
  });
});
