/**
 * Journal logic that needs no database: link types, daily prompts and
 * merging readings with notes into one timeline.
 */
import type { DailyFacts } from "@/lib/astrology/daily";
import type { Graha } from "@/lib/engine";

export type Section =
  | "ASTROLOGY_BASE"
  | "ASTROLOGY_DEEP_DIVE"
  | "WEEKLY_TRANSIT"
  | "AFFIRMATION"
  | "TAROT"
  | "NUMEROLOGY"
  | "ANSWER"
  | "FREE";

export type LinkType = "tarot" | "affirmation" | "weekly" | "area" | "chart" | "numerology" | "answer";

export const LINK_SECTION: Record<LinkType, Section> = {
  tarot: "TAROT",
  affirmation: "AFFIRMATION",
  weekly: "WEEKLY_TRANSIT",
  area: "ASTROLOGY_DEEP_DIVE",
  chart: "ASTROLOGY_BASE",
  numerology: "NUMEROLOGY",
  answer: "ANSWER",
};

export const SECTION_LABEL: Record<Section, string> = {
  ASTROLOGY_BASE: "Birth chart",
  ASTROLOGY_DEEP_DIVE: "Deep dive",
  WEEKLY_TRANSIT: "Weekly",
  AFFIRMATION: "Affirmation",
  TAROT: "Tarot",
  NUMEROLOGY: "Numerology",
  ANSWER: "Ask",
  FREE: "Free writing",
};

export const isLinkType = (s: string): s is LinkType => s in LINK_SECTION;

/** What a note is attached to, captured when the note is written. */
export interface LinkSnapshot {
  title: string;
  summary: string;
  href: string;
}

/** Decrypted shape of JournalEntry.bodyEnc. */
export interface JournalBody {
  text: string;
  link?: LinkSnapshot;
}

// --- Daily prompts -------------------------------------------------------

const MOON_HOUSE_PROMPTS: Record<number, string> = {
  1: "How are you really feeling in your body and mind today?",
  2: "What do you value most right now, and are you spending your energy on it?",
  3: "What is something you've been wanting to say or try? What's stopping you?",
  4: "What makes you feel at home, and how can you give yourself more of it?",
  5: "What brought you joy recently, even something small?",
  6: "Which daily habit is helping you most right now, and which one isn't?",
  7: "Which relationship is asking for your attention, and what does it need?",
  8: "What are you ready to let go of?",
  9: "What belief or lesson is guiding you at the moment?",
  10: "What would make you proud of today's work?",
  11: "Who supports you, and how could you thank them?",
  12: "What do you need to rest from?",
};

const PLANET_PROMPTS: Partial<Record<Graha, string>> = {
  Saturn: "Where in your life are you being asked to be patient and steady?",
  Mars: "What has been testing your patience, and how do you want to respond?",
  Rahu: "What are you chasing right now, and is it truly yours to chase?",
  Ketu: "What feels like it's slipping away, and could that be a relief?",
  Jupiter: "Where do you feel growth or good fortune opening up?",
  Sun: "Where do you want to be seen for who you are?",
  Venus: "What would bring a little more beauty or ease into your day?",
  Mercury: "What conversation or idea is on your mind?",
};

/** Today's journal prompt, from the strongest influence or else the Moon's house. */
export function journalPrompt(f: Pick<DailyFacts, "highlights" | "moon">): string {
  const top = f.highlights[0];
  if (top?.kind === "station") {
    return top.event === "station_retrograde"
      ? `${top.planet} turns retrograde today. What in your life deserves a second look?`
      : `${top.planet} turns direct today. What are you ready to move forward with?`;
  }
  if (top && (top.kind === "on_moon" || top.kind === "saturn_cycle")) return PLANET_PROMPTS[top.planet] ?? MOON_HOUSE_PROMPTS[f.moon.houseFromMoon];
  return MOON_HOUSE_PROMPTS[f.moon.houseFromMoon];
}

// --- Timeline ------------------------------------------------------------

export interface TimelineNote {
  id: string;
  text: string;
  prompt: string | null;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface TimelineItem {
  key: string; // "<linkType>:<linkId>" or "free:<entryId>"
  section: Section;
  date: string; // YYYY-MM-DD
  title: string;
  summary: string;
  href: string | null;
  notes: TimelineNote[];
}

export interface EntryForTimeline extends TimelineNote {
  section: Section;
  linkType: string | null;
  linkId: string | null;
  link?: LinkSnapshot;
}

/**
 * Puts each note under the reading it belongs to. Notes whose reading isn't in
 * `items` (for example a weekly reading that was never saved) become their own
 * item, using the snapshot taken when the note was written. Newest first.
 */
export function mergeTimeline(items: Omit<TimelineItem, "notes">[], entries: EntryForTimeline[]): TimelineItem[] {
  const byKey = new Map<string, TimelineItem>(items.map((i) => [i.key, { ...i, notes: [] }]));
  for (const e of entries) {
    const note: TimelineNote = { id: e.id, text: e.text, prompt: e.prompt, date: e.date, createdAt: e.createdAt };
    const key = e.linkType ? `${e.linkType}:${e.linkId ?? ""}` : `free:${e.id}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.notes.push(note);
      continue;
    }
    byKey.set(key, {
      key,
      section: e.section,
      date: e.date,
      title: e.link?.title ?? (e.prompt ? "Journal prompt" : "Journal entry"),
      summary: e.link?.summary ?? e.prompt ?? "",
      href: e.link?.href ?? null,
      notes: [note],
    });
  }
  const all = [...byKey.values()];
  for (const i of all) i.notes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return all.sort((a, b) => b.date.localeCompare(a.date) || (b.notes[0]?.createdAt ?? "").localeCompare(a.notes[0]?.createdAt ?? ""));
}

export interface TimelineFilter {
  section?: Section;
  from?: string; // YYYY-MM-DD
  to?: string;
  q?: string;
}

/** Filters by section, date range and a case-insensitive search over titles, summaries and notes. */
export function filterTimeline(items: TimelineItem[], f: TimelineFilter): TimelineItem[] {
  const q = f.q?.trim().toLowerCase();
  return items.filter((i) => {
    if (f.section && i.section !== f.section) return false;
    if (f.from && i.date < f.from) return false;
    if (f.to && i.date > f.to) return false;
    if (q) {
      const hay = [i.title, i.summary, ...i.notes.flatMap((n) => [n.text, n.prompt ?? ""])].join("\n").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
