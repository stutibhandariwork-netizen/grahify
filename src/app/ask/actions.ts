"use server";

import { redirect } from "next/navigation";
import { requireUserId } from "@/auth";
import { askTimeContext } from "@/lib/astrology/ask-context";
import { decrypt, decryptJson, encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import type { JournalBody } from "@/lib/journal/core";
import { answerSchema, askMessages, askPrompt, type AskExtras } from "@/lib/llm/ask";
import { baseReportInput } from "@/lib/llm/base-report";
import { claudeEnabled, interpret, InterpretationError } from "@/lib/llm/client";
import { numerologyProfile } from "@/lib/numerology/meanings";
import { loadPrimaryProfile, type LanguageCode } from "@/lib/profile";
import { shuffleDeck } from "@/lib/tarot/shuffle";
import { localDay } from "@/lib/time";

export interface AnswerBasis {
  planets: string[];
  periods: string[];
  tarot?: { cardIndex: number; reversed: boolean };
  numerology?: { birth: number; lifePath: number; personalDay: number };
  journal?: boolean;
  preview?: boolean;
}

export type AskResult = { ok: true; threadId: string } | { ok: false; error: string };

export async function askQuestion(input: {
  threadId: string | null;
  question: string;
  tarot: boolean;
  numerology: boolean;
  journal: boolean;
}): Promise<AskResult> {
  const userId = await requireUserId();
  const question = input.question.trim().slice(0, 1000);
  if (!question) return { ok: false, error: "Type a question first." };

  const [profile, user] = await Promise.all([
    loadPrimaryProfile(userId),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { language: true, timezone: true } }),
  ]);
  if (!profile) return { ok: false, error: "Add your birth details first." };
  const language = user.language as LanguageCode;

  const thread = input.threadId ? await prisma.chatThread.findFirst({ where: { id: input.threadId, userId } }) : null;
  if (input.threadId && !thread) return { ok: false, error: "Conversation not found." };
  const history = thread
    ? (await prisma.chatMessage.findMany({ where: { threadId: thread.id }, orderBy: { createdAt: "asc" } })).map((m) => ({
        role: m.role as "user" | "assistant",
        text: decrypt(m.contentEnc),
      }))
    : [];

  // Context: natal chart, today's sky, and whatever extras they chose.
  const now = new Date();
  const time = askTimeContext(profile.chart, now);
  // The natal part of the base-report input, without its "base_report" request header.
  const natal = (({ request, ...rest }) => (void request, rest))(baseReportInput(profile.chart, profile.birth, language, now));
  const extras: AskExtras = {};
  if (input.tarot) {
    const { order, reversals } = shuffleDeck();
    extras.tarot = { cardIndex: order[0], reversed: reversals[0] };
  }
  if (input.numerology) {
    const [y, m, d] = profile.birth.birthDate.split("-").map(Number);
    extras.numerology = numerologyProfile({ year: y, month: m, day: d }, profile.birth.name, "chaldean", localDay(now, user.timezone).parts);
  }
  if (input.journal) {
    const entries = await prisma.journalEntry.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 });
    extras.journal = entries.map((e) => ({ date: e.entryDate.toISOString().slice(0, 10), text: decryptJson<JournalBody>(e.bodyEnc).text.slice(0, 600) }));
  }

  const label = (id: string) => time.basisOptions.find((o) => o.id === id)?.label ?? id;
  const basisExtras = {
    ...(extras.tarot ? { tarot: extras.tarot } : {}),
    ...(extras.numerology
      ? { numerology: { birth: extras.numerology.birth.value, lifePath: extras.numerology.lifePath.value, personalDay: extras.numerology.personal.day } }
      : {}),
    ...(input.journal ? { journal: true } : {}),
  };

  let answer: string;
  let basis: AnswerBasis;
  if (!claudeEnabled()) {
    const planets = time.dasha ? [...new Set([time.dasha.mahadasha.lord, time.dasha.antardasha.lord, time.dasha.pratyantar.lord])] : [];
    answer =
      "**Preview mode.** Claude isn't connected yet, so there's no written answer. With an API key, Claude would answer from your birth chart, " +
      "the periods and transits listed below, and anything else you chose to include.";
    basis = { planets, periods: time.basisOptions.map((o) => o.label), ...basisExtras, preview: true };
  } else {
    try {
      const prompt = askPrompt(question, natal, time, extras, language);
      const result = await interpret(answerSchema(time.basisOptions), askMessages(history, prompt));
      answer = result.answer;
      basis = { planets: result.basisPlanets, periods: result.basisPeriods.map(label), ...basisExtras };
    } catch (error) {
      if (error instanceof InterpretationError) return { ok: false, error: error.message };
      console.error("ask failed", error);
      return { ok: false, error: "Something went wrong. Please try again." };
    }
  }

  // Saved only once the answer exists, so a failure leaves the conversation as it was.
  const threadId = await prisma.$transaction(async (tx) => {
    const t = thread ?? (await tx.chatThread.create({ data: { userId } }));
    await tx.chatMessage.create({ data: { threadId: t.id, role: "user", contentEnc: encrypt(question), basis: { tarot: input.tarot, numerology: input.numerology, journal: input.journal } } });
    // A millisecond later, so ordering by time keeps question before answer.
    await tx.chatMessage.create({ data: { threadId: t.id, role: "assistant", contentEnc: encrypt(answer), basis: { ...basis }, createdAt: new Date(Date.now() + 1) } });
    return t.id;
  });
  return { ok: true, threadId };
}

export async function deleteThread(formData: FormData) {
  const userId = await requireUserId();
  await prisma.chatThread.deleteMany({ where: { id: String(formData.get("id") ?? ""), userId } });
  redirect("/ask");
}
