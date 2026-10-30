import "server-only";
import type { LifeArea, Section, TarotSession } from "@prisma/client";
import type * as z from "zod/v4";
import { templateAffirmation } from "@/lib/affirmations";
import type { DailyFacts } from "@/lib/astrology/daily";
import type { LifeAreaFacts } from "@/lib/astrology/life-areas";
import { AffirmationSchema, affirmationPrompt } from "@/lib/llm/affirmation";
import type { WeeklyFacts } from "@/lib/astrology/weekly";
import { DeepDiveSchema, deepDivePrompt, WeeklyReadingSchema, weeklyInput, weeklyPrompt } from "@/lib/llm/transits";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { ClarifierSchema, clarifierPrompt, TarotReadingSchema, tarotInput, tarotPrompt, type TarotReadingContent } from "@/lib/llm/tarot";
import { NumerologyReadingSchema, numerologyPrompt, type numerologyInput, type NumerologyReading } from "@/lib/llm/numerology";
import type { SessionView } from "@/lib/tarot/session";
import { prisma } from "@/lib/db";
import { BaseReportSchema, baseReportInput, baseReportPrompt, type BaseReport } from "@/lib/llm/base-report";
import { CLAUDE_MODEL, claudeEnabled, interpret, InterpretationError } from "@/lib/llm/client";
import { PROMPT_VERSION, SYSTEM_PROMPT } from "@/lib/llm/system-prompt";
import type { LanguageCode, loadPrimaryProfile } from "@/lib/profile";

type Profile = NonNullable<Awaited<ReturnType<typeof loadPrimaryProfile>>>;

export type BaseReportResult =
  | { mode: "ready"; report: BaseReport; language: string; createdAt: Date }
  | { mode: "preview"; system: string; prompt: string }
  | { mode: "error"; message: string; retryable: boolean };

/** The saved base report for this profile, or a newly written one. Written once per profile. */
export async function getOrCreateBaseReport(userId: string, profile: Profile, language: LanguageCode): Promise<BaseReportResult> {
  const saved = await prisma.reading.findFirst({
    where: { profileId: profile.id, section: "ASTROLOGY_BASE", translatedFromId: null },
    orderBy: { createdAt: "desc" },
  });
  if (saved) {
    return { mode: "ready", report: decryptJson<BaseReport>(saved.contentEnc), language: saved.language, createdAt: saved.createdAt };
  }

  const input = baseReportInput(profile.chart, profile.birth, language, new Date());
  const prompt = baseReportPrompt(input);
  if (!claudeEnabled()) return { mode: "preview", system: SYSTEM_PROMPT, prompt };

  try {
    const report = await interpret(BaseReportSchema, prompt);
    const reading = await prisma.reading.create({
      data: {
        userId,
        profileId: profile.id,
        section: "ASTROLOGY_BASE",
        language,
        inputJsonEnc: encryptJson(input),
        contentEnc: encryptJson(report),
        model: CLAUDE_MODEL,
        promptVersion: PROMPT_VERSION,
      },
    });
    return { mode: "ready", report, language, createdAt: reading.createdAt };
  } catch (error) {
    if (error instanceof InterpretationError) return { mode: "error", message: error.message, retryable: error.retryable };
    console.error("base report failed", error);
    return { mode: "error", message: "Something went wrong writing your report.", retryable: true };
  }
}

export type CachedResult<T> =
  | { mode: "ready"; content: T }
  | { mode: "preview"; system: string; prompt: string }
  | { mode: "error"; message: string; retryable: boolean };

/**
 * A reading saved once per profile, section and period (and life area), written
 * by Claude on first request. Without an API key, returns the prompt preview.
 */
async function cachedReading<S extends z.ZodType>(opts: {
  userId: string;
  profileId: string;
  section: Section;
  lifeArea?: LifeArea;
  periodStart: Date;
  periodEnd?: Date;
  language: LanguageCode;
  input: unknown;
  prompt: string;
  schema: S;
}): Promise<CachedResult<z.infer<S>>> {
  const { userId, profileId, section, lifeArea, periodStart, periodEnd, language, input, prompt, schema } = opts;
  const saved = await prisma.reading.findFirst({
    where: { profileId, section, lifeArea: lifeArea ?? null, periodStart, translatedFromId: null },
    orderBy: { createdAt: "desc" },
  });
  if (saved) return { mode: "ready", content: decryptJson<z.infer<S>>(saved.contentEnc) };
  if (!claudeEnabled()) return { mode: "preview", system: SYSTEM_PROMPT, prompt };

  try {
    const content = await interpret(schema, prompt);
    await prisma.reading.create({
      data: {
        userId,
        profileId,
        section,
        lifeArea: lifeArea ?? null,
        periodStart,
        periodEnd: periodEnd ?? null,
        language,
        inputJsonEnc: encryptJson(input),
        contentEnc: encryptJson(content),
        model: CLAUDE_MODEL,
        promptVersion: PROMPT_VERSION,
      },
    });
    return { mode: "ready", content };
  } catch (error) {
    if (error instanceof InterpretationError) return { mode: "error", message: error.message, retryable: error.retryable };
    console.error(`${section} reading failed`, error);
    return { mode: "error", message: "Something went wrong writing your reading.", retryable: true };
  }
}

/** The weekly transit reading, one per profile per Saturday-to-Friday week. */
export function getOrCreateWeeklyReading(userId: string, profileId: string, facts: WeeklyFacts, language: LanguageCode) {
  const input = weeklyInput(facts, language);
  return cachedReading({
    userId,
    profileId,
    section: "WEEKLY_TRANSIT",
    periodStart: new Date(facts.week.start),
    periodEnd: new Date(facts.week.end),
    language,
    input,
    prompt: weeklyPrompt(input),
    schema: WeeklyReadingSchema,
  });
}

/** A life-area deep dive, refreshed monthly. */
export function getOrCreateDeepDive(userId: string, profileId: string, facts: LifeAreaFacts, area: LifeArea, language: LanguageCode, monthStart: Date) {
  return cachedReading({
    userId,
    profileId,
    section: "ASTROLOGY_DEEP_DIVE",
    lifeArea: area,
    periodStart: monthStart,
    language,
    input: facts,
    prompt: deepDivePrompt(facts, language),
    schema: DeepDiveSchema,
  });
}

export interface TodayAffirmation {
  text: string;
  why: string;
  source: "claude" | "template";
  /** Set in preview mode so the page can show what Claude would be sent. */
  prompt?: string;
}

/**
 * Today's affirmation for a profile: one per local day and language, saved so
 * the home screen and WhatsApp send the same words. Preview mode falls back to
 * the English template without saving it.
 */
export async function getOrCreateAffirmation(
  profileId: string,
  facts: DailyFacts,
  firstName: string,
  language: LanguageCode,
): Promise<TodayAffirmation> {
  const date = new Date(`${facts.date}T00:00:00Z`);
  const saved = await prisma.dailyAffirmation.findUnique({ where: { profileId_date_language: { profileId, date, language } } });
  if (saved) return { text: saved.text, why: saved.why, source: "claude" };

  const prompt = affirmationPrompt(facts, firstName, language);
  if (!claudeEnabled()) return { ...templateAffirmation(facts), source: "template", prompt };

  try {
    const { affirmation, why } = await interpret(AffirmationSchema, prompt);
    // Two tabs can race to write today's; keep whichever landed first.
    const row = await prisma.dailyAffirmation.upsert({
      where: { profileId_date_language: { profileId, date, language } },
      create: { profileId, date, language, text: affirmation, why },
      update: {},
    });
    return { text: row.text, why: row.why, source: "claude" };
  } catch (error) {
    console.error("affirmation failed", error);
    return { ...templateAffirmation(facts), source: "template" };
  }
}

export type NumerologyReadingResult =
  | { mode: "ready"; reading: NumerologyReading }
  | { mode: "preview"; system: string; prompt: string }
  | { mode: "error"; message: string; retryable: boolean };

/**
 * Numerology reading for today. Personal day changes daily, so readings are
 * saved per local date and reused for the same name and system.
 */
export async function getOrCreateNumerologyReading(
  userId: string,
  profileId: string,
  input: ReturnType<typeof numerologyInput>,
  language: LanguageCode,
  localDay: Date,
): Promise<NumerologyReadingResult> {
  const prompt = numerologyPrompt(input);
  if (!claudeEnabled()) return { mode: "preview", system: SYSTEM_PROMPT, prompt };

  const key = JSON.stringify(input);
  const sameDay = await prisma.reading.findMany({
    where: { profileId, section: "NUMEROLOGY", periodStart: localDay, translatedFromId: null },
    orderBy: { createdAt: "desc" },
  });
  const saved = sameDay.find((r) => JSON.stringify(decryptJson(r.inputJsonEnc)) === key);
  if (saved) return { mode: "ready", reading: decryptJson<NumerologyReading>(saved.contentEnc) };

  try {
    const reading = await interpret(NumerologyReadingSchema, prompt);
    await prisma.reading.create({
      data: {
        userId,
        profileId,
        section: "NUMEROLOGY",
        periodStart: localDay,
        language,
        inputJsonEnc: encryptJson(input),
        contentEnc: encryptJson(reading),
        model: CLAUDE_MODEL,
        promptVersion: PROMPT_VERSION,
      },
    });
    return { mode: "ready", reading };
  } catch (error) {
    if (error instanceof InterpretationError) return { mode: "error", message: error.message, retryable: error.retryable };
    console.error("numerology reading failed", error);
    return { mode: "error", message: "Something went wrong writing your reading.", retryable: true };
  }
}

export type TarotReadingResult =
  | { mode: "ready"; content: TarotReadingContent }
  | { mode: "preview"; system: string; prompt: string }
  | { mode: "error"; message: string; retryable: boolean };

/**
 * Claude's reading for a completed spread, written once and saved; clarifiers
 * drawn later are interpreted on the next load and appended.
 */
export async function getOrCreateTarotReading(
  userId: string,
  session: TarotSession,
  view: SessionView,
  language: LanguageCode,
): Promise<TarotReadingResult> {
  const input = tarotInput(view, language);
  const prompt = tarotPrompt(input, view.spread);
  if (!claudeEnabled()) return { mode: "preview", system: SYSTEM_PROMPT, prompt };

  try {
    let readingId = session.readingId;
    let content: TarotReadingContent;
    if (readingId) {
      const saved = await prisma.reading.findUniqueOrThrow({ where: { id: readingId } });
      content = decryptJson<TarotReadingContent>(saved.contentEnc);
    } else {
      const reading = await interpret(TarotReadingSchema, prompt);
      content = { ...reading, clarifiers: [] };
      const row = await prisma.reading.create({
        data: {
          userId,
          profileId: session.profileId,
          section: "TAROT",
          language,
          inputJsonEnc: encryptJson(input),
          contentEnc: encryptJson(content),
          model: CLAUDE_MODEL,
          promptVersion: PROMPT_VERSION,
        },
      });
      readingId = row.id;
      await prisma.tarotSession.update({ where: { id: session.id }, data: { readingId } });
    }

    const missing = view.clarifiers.filter((c) => !content.clarifiers.some((x) => x.forPick === c.forPick));
    if (missing.length) {
      for (const c of missing) {
        const { meaning } = await interpret(ClarifierSchema, clarifierPrompt(input, c.forPick, c.cardIndex, c.reversed));
        content.clarifiers.push({ forPick: c.forPick, meaning });
      }
      await prisma.reading.update({ where: { id: readingId }, data: { contentEnc: encryptJson(content) } });
    }
    return { mode: "ready", content };
  } catch (error) {
    if (error instanceof InterpretationError) return { mode: "error", message: error.message, retryable: error.retryable };
    console.error("tarot reading failed", error);
    return { mode: "error", message: "Something went wrong writing your reading.", retryable: true };
  }
}
