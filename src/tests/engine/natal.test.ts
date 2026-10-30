import { beforeAll, describe, expect, it } from "vitest";
import {
  computeNatalChart,
  lahiriAyanamsa,
  localToUtc,
  meanLahiriAyanamsa,
  northIndianChartSvg,
  nutationLongitude,
  resolveLocalTime,
  type Graha,
  type NatalChart,
} from "@/lib/engine";

// Reference case: 21 Jan 2000, 12:46 IST, Cuttack (20.46°N, 85.88°E).
const BIRTH = localToUtc("2000-01-21", "12:46", "Asia/Kolkata");
const CUTTACK = { latitude: 20.46, longitude: 85.88 };
const AS_OF = new Date("2026-10-31T00:00:00Z");

const ARIES = 0, TAURUS = 1, CANCER = 3, SAGITTARIUS = 8, CAPRICORN = 9, AQUARIUS = 10;

let chart: NatalChart;
beforeAll(() => {
  chart = computeNatalChart({ utc: BIRTH, ...CUTTACK, timeKnown: true, asOf: AS_OF });
});

describe("time and ayanamsa", () => {
  it("converts IST to UTC", () => {
    expect(BIRTH.toISOString()).toBe("2000-01-21T07:16:00.000Z");
  });

  it("uses historical offsets (IST war time, +06:30 in 1943)", () => {
    expect(localToUtc("1943-06-01", "12:00", "Asia/Kolkata").toISOString()).toBe("1943-06-01T05:30:00.000Z");
  });

  it("matches the mean Lahiri ayanamsa at J2000 (23°51′25″)", () => {
    expect(meanLahiriAyanamsa(new Date("2000-01-01T12:00:00Z"))).toBeCloseTo(23.857, 3);
  });

  it("applies nutation to the true ayanamsa, as Swiss Ephemeris does", () => {
    const d = new Date("2000-01-01T12:00:00Z");
    expect(lahiriAyanamsa(d) - meanLahiriAyanamsa(d)).toBeCloseTo(nutationLongitude(d), 9);
    expect(Math.abs(nutationLongitude(d))).toBeGreaterThan(0.003); // ~ -14″ at J2000
  });

  it("keeps the mean node free of nutation in sidereal terms", () => {
    // Sidereal mean node = mean-equinox node − mean ayanamsa; the nutation terms cancel.
    expect(chart.planets.Rahu.degree).toBeCloseTo(10.14, 2);
  });

  it("flags times skipped by a clock change and pushes them forward", () => {
    const r = resolveLocalTime("2021-03-14", "02:30", "America/New_York");
    expect(r.kind).toBe("nonexistent");
    expect(r.utc.toISOString()).toBe("2021-03-14T07:30:00.000Z"); // 03:30 EDT
  });

  it("flags times that happen twice and returns both", () => {
    const r = resolveLocalTime("2021-11-07", "01:30", "America/New_York");
    expect(r.kind).toBe("ambiguous");
    expect(r.candidates.map((d) => d.toISOString())).toEqual(["2021-11-07T05:30:00.000Z", "2021-11-07T06:30:00.000Z"]);
    expect(resolveLocalTime("2000-01-21", "12:46", "Asia/Kolkata").kind).toBe("ok");
  });
});

describe("planet positions (±1°)", () => {
  const cases: [Graha, number, number][] = [
    ["Moon", CANCER, 8],
    ["Rahu", CANCER, 10],
    ["Sun", CAPRICORN, 7],
    ["Mercury", CAPRICORN, 10],
    ["Venus", SAGITTARIUS, 2],
    ["Mars", AQUARIUS, 19],
    ["Jupiter", ARIES, 3],
    ["Saturn", ARIES, 16],
  ];
  it.each(cases)("%s in sign %i at ~%i°", (g, sign, deg) => {
    expect(chart.planets[g].sign).toBe(sign);
    expect(Math.abs(chart.planets[g].degree - deg)).toBeLessThanOrEqual(1);
  });

  it("puts Ketu in Capricorn, opposite Rahu", () => {
    expect(chart.planets.Ketu.sign).toBe(CAPRICORN);
    expect(chart.planets.Ketu.longitude).toBeCloseTo((chart.planets.Rahu.longitude + 180) % 360, 6);
  });

  it("puts the Moon in Pushya", () => {
    expect(chart.planets.Moon.nakshatra.name).toBe("Pushya");
    expect(chart.planets.Moon.nakshatra.lord).toBe("Saturn");
  });

  it("flags dignities, retrogression and combustion", () => {
    expect(chart.planets.Saturn.dignity).toBe("debilitated");
    expect(chart.planets.Moon.dignity).toBe("own");
    expect(chart.planets.Mercury.combust).toBe(true); // ~3.5° from the Sun
    expect(chart.planets.Rahu.retrograde).toBe(true);
    expect(chart.planets.Saturn.retrograde).toBe(false);
  });
});

describe("lagna", () => {
  it("is ~0-1° Taurus and borderline with Aries", () => {
    const l = chart.lagna!;
    expect(l.sign).toBe(TAURUS);
    expect(l.degree).toBeLessThan(1.5);
    expect(l.borderline?.alternateSign).toBe(ARIES);
    expect(l.borderline!.minutesToChange).toBeLessThan(0);
    expect(l.borderline!.minutesToChange).toBeGreaterThan(-10);
  });

  it("flags a lagna near the end of a sign with the next sign as the alternate", () => {
    const early = computeNatalChart({ utc: localToUtc("2000-01-21", "12:41", "Asia/Kolkata"), ...CUTTACK, timeKnown: true, asOf: AS_OF, saturnYears: 1 });
    const l = early.lagna!;
    expect(l.sign).toBe(ARIES);
    expect(l.degree).toBeGreaterThan(28);
    expect(l.borderline?.alternateSign).toBe(TAURUS);
    expect(l.borderline!.minutesToChange).toBeGreaterThan(0);
    expect(l.borderline!.minutesToChange).toBeLessThan(10);
  });

  it("computes whole-sign houses from the lagna and the alternate lagna", () => {
    expect(chart.houseBasis).toBe("lagna");
    expect(chart.planets.Moon.house).toBe(3);
    expect(chart.planets.Saturn.house).toBe(12);
    expect(chart.planets.Mars.house).toBe(10);
    expect(chart.lagna!.borderline!.alternateHouses.Saturn).toBe(1);
    expect(chart.houses[0]).toMatchObject({ sign: TAURUS, lord: "Venus" });
  });
});

describe("vimshottari dasha", () => {
  it("starts in Saturn mahadasha and moves to Mercury around 2012", () => {
    expect(chart.dasha.balanceAtBirth.lord).toBe("Saturn");
    const mercury = chart.dasha.mahadashas[1];
    expect(mercury.lord).toBe("Mercury");
    expect(new Date(mercury.start).getUTCFullYear()).toBe(2012);
  });

  it("nests antardashas and pratyantars that add up exactly", () => {
    for (const md of chart.dasha.mahadashas) {
      expect(md.antardashas[0].lord).toBe(md.lord);
      expect(md.antardashas[0].start).toBe(md.start);
      expect(md.antardashas.at(-1)!.end).toBe(md.end);
      for (const ad of md.antardashas) {
        expect(ad.pratyantars[0].start).toBe(ad.start);
        expect(ad.pratyantars.at(-1)!.end).toBe(ad.end);
      }
    }
  });

  it("finds the current period", () => {
    const c = chart.currentDasha!;
    expect(c.mahadasha.lord).toBe("Mercury");
    for (const p of [c.mahadasha, c.antardasha, c.pratyantar]) {
      expect(p.start <= c.asOf && c.asOf < p.end).toBe(true);
    }
  });

  it("returns no current period before birth", () => {
    const c = computeNatalChart({ utc: BIRTH, ...CUTTACK, timeKnown: true, asOf: new Date("1990-01-01T00:00:00Z"), saturnYears: 1 });
    expect(c.currentDasha).toBeNull();
  });
});

describe("navamsa", () => {
  it("maps each 3°20′ to the right D9 sign", () => {
    // Moon 8.2° Cancer → 3rd navamsa of a movable water sign → Virgo
    expect(chart.navamsa.planets.Moon).toBe(5);
    // Lagna 0.7° Taurus → 1st navamsa of a fixed sign → Capricorn
    expect(chart.navamsa.lagnaSign).toBe(CAPRICORN);
  });
});

describe("yogas", () => {
  const present = () => new Set(chart.yogas.filter((y) => y.present).map((y) => y.key));

  it("detects the yogas in the reference chart", () => {
    const p = present();
    for (const k of ["budhaditya", "gajakesari", "neecha_bhanga_saturn", "grahan", "mangal_dosha"]) expect(p).toContain(k);
  });

  it("does not report Kaal Sarp (Moon and Mars fall outside the axis)", () => {
    expect(present()).not.toContain("kaal_sarp");
  });

  it("reports Kaal Sarp when all seven planets are on one side of the axis", () => {
    const c = computeNatalChart({ utc: new Date("1980-01-15T06:00:00Z"), latitude: 20, longitude: 85, timeKnown: true, asOf: AS_OF, saturnYears: 1 });
    const ks = c.yogas.find((y) => y.key === "kaal_sarp")!;
    expect(ks.present).toBe(true);
    expect(ks.involves).toEqual(["Rahu", "Ketu"]);
  });

  it("explains Mangal dosha as counted from the Moon only", () => {
    const md = chart.yogas.find((y) => y.key === "mangal_dosha")!;
    expect(md.details).toContain("house 8 from the Moon");
    expect(md.details).toContain("Counted from Moon.");
  });
});

describe("Saturn cycles", () => {
  it("finds Ashtama Shani while Saturn was in Aquarius (Jan 2023 → Mar 2025)", () => {
    const a = chart.saturnCycles.find((c) => c.kind === "ashtama_shani" && c.start.startsWith("2023"))!;
    expect(a.start.slice(0, 10)).toBe("2023-01-17");
    expect(a.end.slice(0, 10)).toBe("2025-03-29");
  });

  it("finds the next Sade Sati with rising, peak and setting phases", () => {
    const s = chart.saturnCycles.find((c) => c.kind === "sade_sati" && c.start > AS_OF.toISOString())!;
    expect(new Date(s.start).getUTCFullYear()).toBe(2032);
    expect(s.segments.map((x) => x.phase)).toEqual(["rising", "peak", "setting"]);
  });

  it("gives a cycle already running at birth its real start date", () => {
    // Cancer Moon with Saturn in Cancer: born at the Sade Sati peak.
    const c = computeNatalChart({ utc: localToUtc("2005-08-04", "12:00", "Asia/Kolkata"), ...CUTTACK, timeKnown: true, asOf: AS_OF, saturnYears: 5 });
    expect(c.planets.Saturn.sign).toBe(c.planets.Moon.sign);
    const first = c.saturnCycles[0];
    expect(first.kind).toBe("sade_sati");
    expect(first.start < "2005-08-04").toBe(true);
    expect(first.start.slice(0, 4)).toBe("2003");
    expect(first.segments[0].phase).toBe("rising");
  });

  it("drops cycles that ended before birth", () => {
    expect(chart.saturnCycles.every((c) => c.end > chart.input.utc)).toBe(true);
  });
});

describe("unknown birth time", () => {
  it("counts houses from the Moon and warns", () => {
    const noon = localToUtc("2000-01-21", "12:00", "Asia/Kolkata");
    const c = computeNatalChart({ utc: noon, ...CUTTACK, timeKnown: false, asOf: AS_OF, saturnYears: 1 });
    expect(c.lagna).toBeNull();
    expect(c.houseBasis).toBe("moon");
    expect(c.planets.Moon.house).toBe(1);
    expect(c.warnings[0]).toMatch(/Birth time unknown/);

    const mangal = c.yogas.find((y) => y.key === "mangal_dosha")!.details;
    expect(mangal.match(/from the Moon/g)).toHaveLength(1);
    expect(mangal).not.toMatch(/birth time unknown|lagna/);
    const nb = c.yogas.find((y) => y.key === "neecha_bhanga_saturn")!.details;
    expect(nb).toContain("in a kendra from the Moon.");
    expect(nb).not.toMatch(/or Moon/);
  });
});

describe("North Indian SVG", () => {
  it("renders all twelve signs, the lagna and planets", () => {
    const svg = northIndianChartSvg(chart);
    expect(svg.startsWith("<svg")).toBe(true);
    for (let s = 1; s <= 12; s++) expect(svg).toContain(`class="sign">${s}<`);
    expect(svg).toContain("Asc 0°");
    expect(svg).toContain("Sa16°");
    expect(svg).toContain("Me10°ᶜ");
  });

  it("marks the ascendant in the D9 chart", () => {
    const svg = northIndianChartSvg(chart, { ascendantSign: chart.navamsa.lagnaSign!, planetSigns: chart.navamsa.planets });
    expect(svg).toContain(`class="sign">${chart.navamsa.lagnaSign! + 1}<`);
    expect(svg).toContain(">Asc<");
  });
});
