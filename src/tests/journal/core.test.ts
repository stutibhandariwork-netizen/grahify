import { describe, expect, it } from "vitest";
import { filterTimeline, journalPrompt, mergeTimeline, type EntryForTimeline } from "@/lib/journal/core";

const moon = { sign: "Cancer", nakshatra: "Pushya", houseFromMoon: 10, houseFromLagna: 1, changes: null };

describe("journalPrompt", () => {
  it("uses the Moon's house on a quiet day", () => {
    expect(journalPrompt({ highlights: [], moon })).toBe("What would make you proud of today's work?");
  });
  it("prefers a planet on the Moon, and a station above that", () => {
    expect(journalPrompt({ highlights: [{ kind: "on_moon", planet: "Mars", fact: "" }], moon })).toMatch(/patience/);
    expect(journalPrompt({ highlights: [{ kind: "station", planet: "Mercury", event: "station_retrograde", fact: "" }], moon })).toMatch(
      /^Mercury turns retrograde today/,
    );
  });
});

const entry = (over: Partial<EntryForTimeline>): EntryForTimeline => ({
  id: "e1",
  text: "note",
  prompt: null,
  date: "2026-10-31",
  createdAt: "2026-10-31T10:00:00Z",
  section: "FREE",
  linkType: null,
  linkId: null,
  ...over,
});

describe("mergeTimeline", () => {
  const tarot = { key: "tarot:s1", section: "TAROT" as const, date: "2026-10-30", title: "Three-card reading", summary: "Ten of Swords…", href: "/tarot/r/s1" };

  it("nests notes under their reading and keeps free writing separate, newest first", () => {
    const t = mergeTimeline(
      [tarot],
      [
        entry({ id: "n1", section: "TAROT", linkType: "tarot", linkId: "s1", text: "It came true", createdAt: "2026-10-31T09:00:00Z" }),
        entry({ id: "n2", text: "Free thought", date: "2026-10-31" }),
      ],
    );
    expect(t.map((i) => i.key)).toEqual(["free:n2", "tarot:s1"]);
    expect(t[1].notes.map((n) => n.text)).toEqual(["It came true"]);
  });

  it("uses the saved snapshot when the reading itself isn't in the list", () => {
    const t = mergeTimeline(
      [],
      [entry({ section: "WEEKLY_TRANSIT", linkType: "weekly", linkId: "2026-10-30T18:30:00.000Z", link: { title: "Week of 31 Oct", summary: "Jupiter enters Leo", href: "/astrology/week" } })],
    );
    expect(t[0]).toMatchObject({ key: "weekly:2026-10-30T18:30:00.000Z", title: "Week of 31 Oct", summary: "Jupiter enters Leo" });
  });
});

describe("filterTimeline", () => {
  const items = mergeTimeline(
    [{ key: "tarot:s1", section: "TAROT", date: "2026-10-01", title: "Yes / No", summary: "Page of Wands", href: null }],
    [entry({ id: "n2", text: "Started the PROJECT", date: "2026-10-31" })],
  );
  it("filters by section, dates and text (case-insensitive, including notes)", () => {
    expect(filterTimeline(items, { section: "TAROT" })).toHaveLength(1);
    expect(filterTimeline(items, { from: "2026-10-15" }).map((i) => i.key)).toEqual(["free:n2"]);
    expect(filterTimeline(items, { to: "2026-10-15" }).map((i) => i.key)).toEqual(["tarot:s1"]);
    expect(filterTimeline(items, { q: "project" }).map((i) => i.key)).toEqual(["free:n2"]);
    expect(filterTimeline(items, { q: "wands" }).map((i) => i.key)).toEqual(["tarot:s1"]);
  });
});
