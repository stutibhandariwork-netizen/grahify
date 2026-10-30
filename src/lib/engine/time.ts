/**
 * Local wall-clock time in an IANA zone → UTC instant, using the runtime's
 * tz database (historical offsets included, e.g. Asia/Kolkata's +06:30 in 1943).
 */

const HOUR_MS = 3_600_000;

function offsetMinutes(timeZone: string, utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 60_000);
}

export interface ResolvedLocalTime {
  utc: Date;
  /**
   * "ok": the wall time happened exactly once.
   * "nonexistent": skipped by a clock change (spring forward); `utc` reads it with the earlier offset, i.e. pushed forward.
   * "ambiguous": happened twice (fall back); `utc` is the first occurrence, `candidates` lists both.
   */
  kind: "ok" | "nonexistent" | "ambiguous";
  candidates: Date[];
}

/**
 * @param date "YYYY-MM-DD"
 * @param time "HH:mm" or "HH:mm:ss"
 * @param timeZone IANA name, e.g. "Asia/Kolkata"
 */
export function resolveLocalTime(date: string, time: string, timeZone: string): ResolvedLocalTime {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi, s = 0] = time.split(":").map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi, s);

  // Offsets in force well before and well after this wall time cover any single transition.
  const before = offsetMinutes(timeZone, wall - 14 * HOUR_MS);
  const after = offsetMinutes(timeZone, wall + 14 * HOUR_MS);
  const candidates = [...new Set([before, after])]
    .map((o) => wall - o * 60_000)
    .filter((u) => wall - offsetMinutes(timeZone, u) * 60_000 === u)
    .sort((a, b) => a - b)
    .map((u) => new Date(u));

  if (candidates.length === 1) return { utc: candidates[0], kind: "ok", candidates };
  if (candidates.length > 1) return { utc: candidates[0], kind: "ambiguous", candidates };
  const pushed = new Date(wall - before * 60_000);
  return { utc: pushed, kind: "nonexistent", candidates: [] };
}

/** Like resolveLocalTime, returning only the instant. Check `kind` when the input comes from a user. */
export function localToUtc(date: string, time: string, timeZone: string): Date {
  return resolveLocalTime(date, time, timeZone).utc;
}

export function utcOffsetMinutes(timeZone: string, date: Date): number {
  return offsetMinutes(timeZone, date.getTime());
}
