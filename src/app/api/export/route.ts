import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { decrypt, decryptJson } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { DECK } from "@/lib/tarot/deck";

export const runtime = "nodejs";

/** Everything stored about the signed-in user, decrypted, as one JSON download. */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      profiles: { include: { tarotSessions: true, affirmations: true } },
      readings: true,
      journal: true,
      threads: { include: { messages: { orderBy: { createdAt: "asc" } } } },
      whatsapp: { include: { logs: true } },
    },
  });

  const data = {
    exportedAt: new Date().toISOString(),
    account: { email: user.email, language: user.language, timezone: user.timezone, createdAt: user.createdAt },
    profiles: user.profiles.map((p) => ({
      createdAt: p.createdAt,
      birthDetails: decryptJson(p.birthDataEnc),
      chart: decryptJson(p.chartEnc),
      engineVersion: p.engineVersion,
      tarot: p.tarotSessions.map((s) => ({
        spread: s.spread,
        question: s.question,
        createdAt: s.createdAt,
        cards: s.picks.map((pos) => ({ position: pos, card: DECK[s.deckOrder[pos - 1]].name, reversed: s.reversals[pos - 1] })),
        clarifiers: s.clarifiers,
      })),
      affirmations: p.affirmations.map((a) => ({ date: a.date, language: a.language, text: a.text, why: a.why })),
    })),
    readings: user.readings.map((r) => ({
      section: r.section,
      lifeArea: r.lifeArea,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      language: r.language,
      createdAt: r.createdAt,
      model: r.model,
      input: decryptJson(r.inputJsonEnc),
      content: decryptJson(r.contentEnc),
    })),
    journal: user.journal.map((j) => ({
      date: j.entryDate,
      section: j.section,
      prompt: j.prompt,
      attachedTo: j.linkType ? { type: j.linkType, id: j.linkId } : null,
      ...decryptJson<object>(j.bodyEnc),
      createdAt: j.createdAt,
    })),
    askConversations: user.threads.map((t) => ({
      createdAt: t.createdAt,
      messages: t.messages.map((m) => ({ role: m.role, text: decrypt(m.contentEnc), basis: m.basis, at: m.createdAt })),
    })),
    whatsapp: user.whatsapp && {
      phone: decrypt(user.whatsapp.phoneEnc),
      optedInAt: user.whatsapp.optedInAt,
      optInSource: user.whatsapp.optInSource,
      optInText: user.whatsapp.optInText,
      optedOutAt: user.whatsapp.optedOutAt,
      weekly: user.whatsapp.weekly,
      daily: user.whatsapp.daily,
      dailyTime: user.whatsapp.dailyTime,
      messages: user.whatsapp.logs.map((l) => ({ template: l.template, language: l.language, status: l.status, at: l.createdAt })),
    },
  };

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="grahify-data-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
