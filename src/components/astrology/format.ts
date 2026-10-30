import type { Graha } from "@/lib/engine";

export const GLYPH: Record<Graha, string> = {
  Sun: "☉",
  Moon: "☽",
  Mars: "♂",
  Mercury: "☿",
  Jupiter: "♃",
  Venus: "♀",
  Saturn: "♄",
  Rahu: "☊",
  Ketu: "☋",
};

export const SANSKRIT: Record<Graha, string> = {
  Sun: "Surya",
  Moon: "Chandra",
  Mars: "Mangal",
  Mercury: "Budh",
  Jupiter: "Guru",
  Venus: "Shukra",
  Saturn: "Shani",
  Rahu: "Rahu",
  Ketu: "Ketu",
};

/** 8.19 → "8°11′" */
export function dms(degree: number): string {
  const d = Math.floor(degree);
  const m = Math.floor((degree - d) * 60);
  return `${d}°${String(m).padStart(2, "0")}′`;
}

const monthYear = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
const fullDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export const fmtMonth = (iso: string) => monthYear.format(new Date(iso));
export const fmtDate = (iso: string) => fullDate.format(new Date(iso));

export function ageAt(birthIso: string, iso: string): number {
  return Math.floor((new Date(iso).getTime() - new Date(birthIso).getTime()) / (365.25 * 86_400_000));
}
