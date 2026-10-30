import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";

/** Place data from GeoNames (CC BY 4.0), built by scripts/build-places.mjs. */
export interface Place {
  id: number; // row index in places.tsv, stable for a given build
  name: string;
  state: string;
  countryCode: string;
  country: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  population: number;
}

interface Row extends Place {
  keys: string[]; // normalised name + alternates
  region: string; // normalised "state country"
}

let rows: Row[] | null = null;

/** Lowercase, strip accents and punctuation; leaves Indic scripts intact. */
export function normalise(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.,'’()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function load(): Row[] {
  if (rows) return rows;
  const text = readFileSync(path.join(process.cwd(), "data", "places.tsv"), "utf8");
  rows = text
    .split("\n")
    .filter(Boolean)
    .map((line, id) => {
      const [name, alts, state, countryCode, country, lat, lon, timeZone, pop] = line.split("\t");
      return {
        id,
        name,
        state,
        countryCode,
        country,
        latitude: Number(lat),
        longitude: Number(lon),
        timeZone,
        population: Number(pop),
        keys: [...new Set([name, ...(alts ? alts.split("|") : [])].map(normalise))],
        region: normalise(`${state} ${country} ${countryCode}`),
      };
    });
  return rows;
}

/**
 * Prefix search. "cut" → Cuttack; "cuttack odisha" or "cuttack, in" narrows by state/country.
 * Rows are pre-sorted by population, so the first matches are the most likely.
 */
export function searchPlaces(query: string, limit = 8): Place[] {
  const q = normalise(query);
  if (q.length < 2) return [];
  const all = load();

  // Try the longest leading words as the place name, the rest as the region.
  const words = q.split(" ");
  const splits = words.map((_, i) => [words.slice(0, words.length - i).join(" "), words.slice(words.length - i)] as const);

  const exact: Row[] = [];
  const prefix: Row[] = [];
  for (const r of all) {
    for (const [name, region] of splits) {
      if (!region.every((w) => r.region.includes(w))) continue;
      if (r.keys.includes(name)) {
        exact.push(r);
        break;
      }
      if (r.keys.some((k) => k.startsWith(name))) {
        prefix.push(r);
        break;
      }
    }
    if (exact.length >= limit) break;
  }
  return [...exact, ...prefix].slice(0, limit).map(strip);
}

export function getPlace(id: number): Place | null {
  const r = load()[id];
  return r ? strip(r) : null;
}

function strip(r: Row): Place {
  const { id, name, state, countryCode, country, latitude, longitude, timeZone, population } = r;
  return { id, name, state, countryCode, country, latitude, longitude, timeZone, population };
}

export function placeLabel(p: Pick<Place, "name" | "state" | "country">): string {
  return [p.name, p.state, p.country].filter(Boolean).join(", ");
}
