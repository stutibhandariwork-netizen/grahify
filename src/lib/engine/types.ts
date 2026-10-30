export type Graha =
  | "Sun"
  | "Moon"
  | "Mars"
  | "Mercury"
  | "Jupiter"
  | "Venus"
  | "Saturn"
  | "Rahu"
  | "Ketu";

export type Dignity = "exalted" | "debilitated" | "own" | null;

export interface NakshatraInfo {
  index: number; // 0-26
  name: string;
  lord: Graha;
  pada: number; // 1-4
  fractionElapsed: number; // 0-1
}

export interface PlanetPosition {
  graha: Graha;
  longitude: number; // sidereal, 0-360
  sign: number; // 0-11
  signName: string;
  degree: number; // 0-30 within sign
  house: number; // whole-sign, from chart.houseBasis
  houseFromMoon: number;
  nakshatra: NakshatraInfo;
  speed: number; // deg/day
  retrograde: boolean;
  dignity: Dignity;
  combust: boolean;
  navamsaSign: number;
}

export interface Lagna {
  longitude: number;
  sign: number;
  signName: string;
  degree: number;
  nakshatra: NakshatraInfo;
  navamsaSign: number;
  /** Set when within 2° of a sign boundary. */
  borderline: null | {
    alternateSign: number;
    alternateSignName: string;
    degreesToBoundary: number;
    /** How many minutes earlier (negative) or later (positive) the birth time would have to be for the lagna to change. */
    minutesToChange: number;
    /** Whole-sign houses of each planet under the alternate lagna. */
    alternateHouses: Record<Graha, number>;
  };
}

export interface House {
  house: number;
  sign: number;
  signName: string;
  lord: Graha;
  occupants: Graha[];
}

export interface Yoga {
  key: string;
  name: string;
  present: boolean;
  involves: Graha[];
  /** Plain factual explanation for the LLM; never shown raw. */
  details: string;
  /** Present but weakened or cancelled by a classical rule. */
  cancelled?: boolean;
}

export interface DashaPeriod {
  lord: Graha;
  start: string; // ISO
  end: string;
  years: number;
}

export interface Mahadasha extends DashaPeriod {
  antardashas: (DashaPeriod & { pratyantars: DashaPeriod[] })[];
}

export interface DashaTimeline {
  system: "vimshottari";
  birth: string;
  yearLengthDays: number;
  moonNakshatra: string;
  balanceAtBirth: { lord: Graha; years: number };
  mahadashas: Mahadasha[];
}

export interface CurrentDasha {
  asOf: string;
  mahadasha: DashaPeriod;
  antardasha: DashaPeriod;
  pratyantar: DashaPeriod;
}

export type SaturnPhase = "rising" | "peak" | "setting";

export interface SaturnSegment {
  sign: number;
  signName: string;
  houseFromMoon: number;
  start: string;
  end: string;
}

export interface SaturnCycle {
  kind: "sade_sati" | "ashtama_shani";
  start: string;
  end: string;
  segments: (SaturnSegment & { phase?: SaturnPhase })[];
}

export interface NatalInput {
  /** The birth instant in UTC. If time is unknown, pass local noon. */
  utc: Date;
  latitude: number;
  longitude: number;
  timeKnown: boolean;
  /** Reference instant for "current" dasha. Defaults to now. */
  asOf?: Date;
  /** Years after birth to cover for Sade Sati. Default 100. */
  saturnYears?: number;
}

export interface NatalChart {
  engineVersion: string;
  input: { utc: string; latitude: number; longitude: number; timeKnown: boolean };
  ayanamsa: { name: "Lahiri"; degrees: number };
  /** null when birth time is unknown. */
  lagna: Lagna | null;
  houseBasis: "lagna" | "moon";
  planets: Record<Graha, PlanetPosition>;
  houses: House[];
  navamsa: { lagnaSign: number | null; planets: Record<Graha, number> };
  yogas: Yoga[];
  dasha: DashaTimeline;
  /** null when `asOf` is before birth or past the dasha timeline. */
  currentDasha: CurrentDasha | null;
  saturnCycles: SaturnCycle[];
  warnings: string[];
}

export type TransitEventType =
  | "ingress"
  | "nakshatra_change"
  | "station_retrograde"
  | "station_direct"
  | "combust_start"
  | "combust_end";

export interface TransitEvent {
  type: TransitEventType;
  graha: Graha;
  date: string;
  fromSign?: number;
  toSign?: number;
  toSignName?: string;
  nakshatra?: string;
  houseFromMoon?: number;
  houseFromLagna?: number | null;
}

export interface TransitSnapshot {
  graha: Graha;
  longitude: number;
  sign: number;
  signName: string;
  degree: number;
  nakshatra: string;
  pada: number;
  retrograde: boolean;
  combust: boolean;
  dignity: Dignity;
  houseFromMoon: number;
  houseFromLagna: number | null;
  /** Natal planets in the same sign. */
  overNatal: Graha[];
}

export interface GrahaTransitContext {
  graha: Graha;
  /** Sign at range start, and when it entered. */
  current: { sign: number; signName: string; since: string; houseFromMoon: number; houseFromLagna: number | null };
  /** Sign before that, and its span. */
  previous: { sign: number; signName: string; from: string; to: string; houseFromMoon: number; houseFromLagna: number | null };
  /** First sign change after the range end, if within the search horizon. */
  next: null | { sign: number; signName: string; date: string; houseFromMoon: number; houseFromLagna: number | null };
}

export interface TransitReport {
  range: { start: string; end: string };
  ayanamsa: number;
  reference: { moonSign: number; lagnaSign: number | null };
  atStart: Record<Graha, TransitSnapshot>;
  atEnd: Record<Graha, TransitSnapshot>;
  events: TransitEvent[];
  context: Record<Graha, GrahaTransitContext>;
}
