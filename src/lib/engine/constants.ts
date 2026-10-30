import type { Graha } from "./types";

export const GRAHAS: readonly Graha[] = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
  "Rahu",
  "Ketu",
] as const;

/** The seven visible planets (no nodes). */
export const SAPTA_GRAHAS: readonly Graha[] = GRAHAS.slice(0, 7);

export const SIGNS = [
  { en: "Aries", sa: "Mesha" },
  { en: "Taurus", sa: "Vrishabha" },
  { en: "Gemini", sa: "Mithuna" },
  { en: "Cancer", sa: "Karka" },
  { en: "Leo", sa: "Simha" },
  { en: "Virgo", sa: "Kanya" },
  { en: "Libra", sa: "Tula" },
  { en: "Scorpio", sa: "Vrishchika" },
  { en: "Sagittarius", sa: "Dhanu" },
  { en: "Capricorn", sa: "Makara" },
  { en: "Aquarius", sa: "Kumbha" },
  { en: "Pisces", sa: "Meena" },
] as const;

export const SIGN_LORDS: readonly Graha[] = [
  "Mars",
  "Venus",
  "Mercury",
  "Moon",
  "Sun",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Saturn",
  "Jupiter",
];

export const NAKSHATRAS = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishta",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
] as const;

export const NAKSHATRA_SPAN = 360 / 27; // 13°20'
export const PADA_SPAN = NAKSHATRA_SPAN / 4; // 3°20'

/** Vimshottari order, starting from Ashwini's lord. */
export const DASHA_ORDER: readonly Graha[] = [
  "Ketu",
  "Venus",
  "Sun",
  "Moon",
  "Mars",
  "Rahu",
  "Jupiter",
  "Saturn",
  "Mercury",
];

export const DASHA_YEARS: Record<Graha, number> = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17,
};

export const DASHA_TOTAL_YEARS = 120;
export const DAYS_PER_YEAR = 365.25;

/** Exaltation sign index. Nodes are left out: traditions disagree. */
export const EXALTATION: Partial<Record<Graha, number>> = {
  Sun: 0,
  Moon: 1,
  Mars: 9,
  Mercury: 5,
  Jupiter: 3,
  Venus: 11,
  Saturn: 6,
};

export const OWN_SIGNS: Partial<Record<Graha, number[]>> = {
  Sun: [4],
  Moon: [3],
  Mars: [0, 7],
  Mercury: [2, 5],
  Jupiter: [8, 11],
  Venus: [1, 6],
  Saturn: [9, 10],
};

/**
 * Combustion orbs in degrees from the Sun (Surya Siddhanta values).
 * Mercury and Venus use a tighter orb when retrograde.
 */
export function combustionOrb(graha: Graha, retrograde: boolean): number | null {
  switch (graha) {
    case "Moon":
      return 12;
    case "Mars":
      return 17;
    case "Mercury":
      return retrograde ? 12 : 14;
    case "Jupiter":
      return 11;
    case "Venus":
      return retrograde ? 8 : 10;
    case "Saturn":
      return 15;
    default:
      return null;
  }
}

export const GRAHA_ABBR: Record<Graha, string> = {
  Sun: "Su",
  Moon: "Mo",
  Mars: "Ma",
  Mercury: "Me",
  Jupiter: "Ju",
  Venus: "Ve",
  Saturn: "Sa",
  Rahu: "Ra",
  Ketu: "Ke",
};

export const KENDRAS = [1, 4, 7, 10];

/**
 * Whole-sign Vedic aspects (drishti), as houses counted from the planet:
 * every planet aspects the 7th; Mars also the 4th and 8th, Jupiter the 5th
 * and 9th, Saturn the 3rd and 10th. Rahu and Ketu are given Jupiter's 5th
 * and 9th, a common convention.
 */
export const ASPECT_HOUSES: Record<Graha, number[]> = {
  Sun: [7],
  Moon: [7],
  Mercury: [7],
  Venus: [7],
  Mars: [4, 7, 8],
  Jupiter: [5, 7, 9],
  Saturn: [3, 7, 10],
  Rahu: [5, 7, 9],
  Ketu: [5, 7, 9],
};

/** Signs a planet in `sign` aspects. */
export function aspectedSigns(graha: Graha, sign: number): number[] {
  return ASPECT_HOUSES[graha].map((h) => (sign + h - 1) % 12);
}
