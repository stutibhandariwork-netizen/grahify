import { utcOffsetMinutes } from "@/lib/engine";

/** The local calendar day containing `at`: its date string, start instant and local hour. */
export function localDay(at: Date, timeZone: string) {
  const local = new Date(at.getTime() + utcOffsetMinutes(timeZone, at) * 60_000);
  return {
    date: local.toISOString().slice(0, 10),
    start: startOfLocalDay(at, timeZone),
    hour: local.getUTCHours(),
    parts: { year: local.getUTCFullYear(), month: local.getUTCMonth() + 1, day: local.getUTCDate() },
  };
}

/** The UTC instant at which the local calendar day containing `at` began in `timeZone`. */
export function startOfLocalDay(at: Date, timeZone: string): Date {
  const local = new Date(at.getTime() + utcOffsetMinutes(timeZone, at) * 60_000);
  const midnightAsUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(midnightAsUtc - utcOffsetMinutes(timeZone, new Date(midnightAsUtc)) * 60_000);
}
