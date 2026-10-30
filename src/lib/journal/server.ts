import "server-only";
import { templateAffirmation } from "@/lib/affirmations";
import { dailyFacts } from "@/lib/astrology/daily";
import { areaByKey } from "@/lib/astrology/life-areas";
import { weekStart, weeklyFacts } from "@/lib/astrology/weekly";
import { decrypt, decryptJson } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { SIGNS, utcOffsetMinutes } from "@/lib/engine";
import type { BaseReport } from "@/lib/llm/base-report";
import type { NumerologyReading } from "@/lib/llm/numerology";
import type { DeepDive, WeeklyReading } from "@/lib/llm/transits";
import type { loadPrimaryProfile } from "@/lib/profile";
import { DECK } from "@/lib/tarot/deck";
import { loadOwnSession, toView } from "@/lib/tarot/session";
import { spreadByKey } from "@/lib/tarot/spreads";
import { localDay } from "@/lib/time";
import { mergeTimeline, type EntryForTimeline, type JournalBody, type LinkSnapshot, type LinkType, type Section, type TimelineItem } from "./core";

type Profile = NonNullable<Awaited<ReturnType<typeof loadPrimaryProfile>>>;

/** Plain-text excerpt of Markdown. */
export function excerpt(md: string, max = 220): string {
  const text = md.replace(/[*_#>`]/g, "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

const shortDate = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone }).format(new Date(iso));

function tarotSummary(view: ReturnType<typeof toView>) {
  const spread = spreadByKey(view.spread);
  const cards = view.cards.map((c) => `${c.positionName}: ${DECK[c.cardIndex].name}${c.reversed ? " (reversed)" : ""}`).join(" · ");
  return {
    title: view.question ? `${spread.title}: “${view.question}”` : spread.title,
    summary: view.verdict ? `${view.verdict}. ${cards}` : cards,
  };
}

/**
 * What a note is being attached to, checked against the user's own data.
 * Returns null if it doesn't exist or isn't theirs.
 */
export async function resolveLink(userId: string, profile: Profile, type: LinkType, id: string, timeZone: string): Promise<LinkSnapshot | null> {
  switch (type) {
    case "tarot": {
      const s = await loadOwnSession(userId, id);
      if (!s) return null;
      const view = toView(s);
      const { title } = tarotSummary(view);
      let { summary } = tarotSummary(view);
      if (s.readingId) {
        const r = await prisma.reading.findUnique({ where: { id: s.readingId } });
        if (r) summary += ` — ${excerpt(decryptJson<{ summary: string }>(r.contentEnc).summary)}`;
      }
      return { title, summary, href: `/tarot/r/${s.id}` };
    }
    case "affirmation": {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(id)) return null;
      const saved = await prisma.dailyAffirmation.findFirst({ where: { profileId: profile.id, date: new Date(`${id}T00:00:00Z`) } });
      const today = localDay(new Date(), timeZone);
      const a = saved ? { text: saved.text, why: saved.why } : id === today.date ? templateAffirmation(dailyFacts(profile.chart, today.start, today.date)) : null;
      if (!a) return null;
      return { title: `Affirmation · ${shortDate(`${id}T12:00:00Z`, "UTC")}`, summary: `“${a.text}” ${a.why}`, href: "/" };
    }
    case "weekly": {
      const start = new Date(id);
      if (Number.isNaN(start.getTime())) return null;
      const saved = await prisma.reading.findFirst({ where: { profileId: profile.id, section: "WEEKLY_TRANSIT", periodStart: start } });
      let summary: string;
      if (saved) summary = excerpt(decryptJson<WeeklyReading>(saved.contentEnc).summary);
      else {
        const f = weeklyFacts(profile.chart, start, new Date(start.getTime() + 7 * 86_400_000));
        const MOVE: Partial<Record<string, (sign?: string) => string>> = {
          ingress: (sign) => `enters ${sign}`,
          station_retrograde: () => "turns retrograde",
          station_direct: () => "turns direct",
        };
        const moves = f.planets.flatMap((p) =>
          p.thisWeek.filter((e) => MOVE[e.type]).map((e) => `${p.graha} ${MOVE[e.type]!(e.toSignName)}`),
        );
        summary = moves.length ? moves.join(" · ") : "A quieter week for the slower planets.";
      }
      const isCurrent = weekStart(new Date(), (d) => utcOffsetMinutes(timeZone, d)).getTime() === start.getTime();
      return { title: `Week of ${shortDate(id, timeZone)}`, summary, href: isCurrent ? "/astrology/week" : "" };
    }
    case "area": {
      const area = areaByKey(id);
      if (!area) return null;
      const saved = await prisma.reading.findFirst({
        where: { profileId: profile.id, section: "ASTROLOGY_DEEP_DIVE", lifeArea: area.key.toUpperCase() as "CAREER" },
        orderBy: { createdAt: "desc" },
      });
      return {
        title: `${area.title} deep dive`,
        summary: saved ? excerpt(decryptJson<DeepDive>(saved.contentEnc).comingUp) : area.blurb,
        href: `/astrology/area/${area.key}`,
      };
    }
    case "chart": {
      const saved = await prisma.reading.findFirst({ where: { profileId: profile.id, section: "ASTROLOGY_BASE" }, orderBy: { createdAt: "desc" } });
      const c = profile.chart;
      const facts = `Moon in ${SIGNS[c.planets.Moon.sign].en}${c.lagna ? `, ${SIGNS[c.lagna.sign].en} lagna` : ""}${c.currentDasha ? `, ${c.currentDasha.mahadasha.lord}–${c.currentDasha.antardasha.lord} dasha` : ""}.`;
      return { title: "Your birth chart", summary: saved ? excerpt(decryptJson<BaseReport>(saved.contentEnc).rightNow) : facts, href: "/astrology" };
    }
    case "numerology": {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(id)) return null;
      const saved = await prisma.reading.findFirst({
        where: { profileId: profile.id, section: "NUMEROLOGY", periodStart: new Date(`${id}T00:00:00Z`) },
        orderBy: { createdAt: "desc" },
      });
      return {
        title: `Numerology · ${shortDate(`${id}T12:00:00Z`, "UTC")}`,
        summary: saved ? excerpt(decryptJson<NumerologyReading>(saved.contentEnc).cycles) : "Your numbers for the day.",
        href: "/numerology",
      };
    }
    case "answer": {
      const m = await prisma.chatMessage.findUnique({ where: { id }, include: { thread: { select: { userId: true, id: true } } } });
      if (!m || m.thread.userId !== userId || m.role !== "assistant") return null;
      return { title: "An answer from Ask", summary: excerpt(decrypt(m.contentEnc)), href: `/ask/${m.thread.id}` };
    }
  }
}

/** Every reading and note for this profile, merged into one newest-first timeline. */
export async function loadTimeline(userId: string, profile: Profile, timeZone: string): Promise<TimelineItem[]> {
  const day = (d: Date) => localDay(d, timeZone).date;
  const [sessions, readings, affirmations, entries] = await Promise.all([
    prisma.tarotSession.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.reading.findMany({
      where: { profileId: profile.id, section: { not: "TAROT" }, translatedFromId: null },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.dailyAffirmation.findMany({ where: { profileId: profile.id }, orderBy: { date: "desc" }, take: 200 }),
    prisma.journalEntry.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 500 }),
  ]);

  const items: Omit<TimelineItem, "notes">[] = [];
  for (const s of sessions) {
    const view = toView(s);
    if (!view.complete) continue;
    items.push({ key: `tarot:${s.id}`, section: "TAROT", date: day(s.createdAt), ...tarotSummary(view), href: `/tarot/r/${s.id}` });
  }
  const seenArea = new Set<string>();
  for (const r of readings) {
    if (r.section === "WEEKLY_TRANSIT" && r.periodStart) {
      items.push({
        key: `weekly:${r.periodStart.toISOString()}`,
        section: r.section,
        date: day(r.periodStart),
        title: `Week of ${shortDate(r.periodStart.toISOString(), timeZone)}`,
        summary: excerpt(decryptJson<WeeklyReading>(r.contentEnc).summary),
        href: null,
      });
    } else if (r.section === "ASTROLOGY_DEEP_DIVE" && r.lifeArea && !seenArea.has(r.lifeArea)) {
      seenArea.add(r.lifeArea);
      const area = areaByKey(r.lifeArea.toLowerCase())!;
      items.push({
        key: `area:${area.key}`,
        section: r.section,
        date: day(r.createdAt),
        title: `${area.title} deep dive`,
        summary: excerpt(decryptJson<DeepDive>(r.contentEnc).comingUp),
        href: `/astrology/area/${area.key}`,
      });
    } else if (r.section === "ASTROLOGY_BASE") {
      items.push({ key: "chart:", section: r.section, date: day(r.createdAt), title: "Your birth chart", summary: excerpt(decryptJson<BaseReport>(r.contentEnc).rightNow), href: "/astrology" });
    } else if (r.section === "NUMEROLOGY" && r.periodStart) {
      const d = r.periodStart.toISOString().slice(0, 10);
      items.push({ key: `numerology:${d}`, section: r.section, date: d, title: "Numerology", summary: excerpt(decryptJson<NumerologyReading>(r.contentEnc).cycles), href: "/numerology" });
    }
  }
  for (const a of affirmations) {
    const d = a.date.toISOString().slice(0, 10);
    items.push({ key: `affirmation:${d}`, section: "AFFIRMATION", date: d, title: "Affirmation", summary: `“${a.text}” ${a.why}`, href: null });
  }

  const forTimeline: EntryForTimeline[] = entries.map((e) => {
    const body = decryptJson<JournalBody>(e.bodyEnc);
    return {
      id: e.id,
      text: body.text,
      prompt: e.prompt,
      date: e.entryDate.toISOString().slice(0, 10),
      createdAt: e.createdAt.toISOString(),
      section: e.section as Section,
      linkType: e.linkType,
      linkId: e.linkId,
      link: body.link,
    };
  });
  return mergeTimeline(items, forTimeline);
}
