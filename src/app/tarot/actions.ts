"use server";

import { redirect } from "next/navigation";
import { requireUserId } from "@/auth";
import { prisma } from "@/lib/db";
import { checkClarifier, checkPick, shuffleDeck, type PickError } from "@/lib/tarot/shuffle";
import { drawState, toView, type SessionView } from "@/lib/tarot/session";
import { spreadByKey, spreadBySlug } from "@/lib/tarot/spreads";
import { startOfLocalDay } from "@/lib/time";

const MESSAGES: Record<PickError, string> = {
  out_of_range: "Choose a number from 1 to 78.",
  already_drawn: "That card has already been drawn. Choose another.",
  spread_complete: "All the cards for this spread are drawn.",
  not_complete: "Finish the spread before drawing a clarifier.",
  bad_target: "That card already has a clarifier.",
};

export async function startReading(formData: FormData) {
  const userId = await requireUserId();
  const spread = spreadBySlug(String(formData.get("spread") ?? ""));
  if (!spread) redirect("/tarot");
  const question = String(formData.get("question") ?? "").trim().slice(0, 300) || null;
  if (spread.question === "required" && !question) redirect(`/tarot/new/${spread.slug}?error=question`);

  const [profile, user] = await Promise.all([
    prisma.profile.findFirst({ where: { userId }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }], select: { id: true } }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } }),
  ]);
  if (!profile) redirect("/onboarding");

  // One card of the day per local day.
  if (spread.key === "CARD_OF_DAY") {
    const today = await prisma.tarotSession.findFirst({
      where: { profileId: profile.id, spread: "CARD_OF_DAY", createdAt: { gte: startOfLocalDay(new Date(), user.timezone) } },
      select: { id: true },
    });
    if (today) redirect(`/tarot/r/${today.id}`);
  }

  // The shuffled order is saved before any card is chosen, so picks can't influence it.
  const { order, reversals } = shuffleDeck();
  const session = await prisma.tarotSession.create({
    data: {
      profileId: profile.id,
      spread: spread.key,
      question: spread.question === "none" ? null : question,
      deckOrder: order,
      reversals,
    },
  });
  redirect(`/tarot/r/${session.id}`);
}

type DrawResult = { ok: true; view: SessionView } | { ok: false; error: string };

/** Draws the card at a face-down position (1-78), either for the spread or as a clarifier. */
export async function drawCard(sessionId: string, position: number, clarifyPick?: number): Promise<DrawResult> {
  const userId = await requireUserId();
  return prisma.$transaction(async (tx) => {
    // Lock the row so two quick taps can't both claim the next slot.
    await tx.$queryRaw`SELECT id FROM "TarotSession" WHERE id = ${sessionId} FOR UPDATE`;
    const s = await tx.tarotSession.findUnique({ where: { id: sessionId }, include: { profile: { select: { userId: true } } } });
    if (!s || s.profile.userId !== userId) return { ok: false, error: "Reading not found." };

    const state = drawState(s);
    const needed = spreadByKey(s.spread).positions.length;
    if (clarifyPick === undefined) {
      const err = checkPick(state, position, needed);
      if (err) return { ok: false, error: MESSAGES[err] };
      const updated = await tx.tarotSession.update({ where: { id: s.id }, data: { picks: { push: position } } });
      return { ok: true, view: toView(updated) };
    }
    const err = checkClarifier(state, clarifyPick, position, needed);
    if (err) return { ok: false, error: MESSAGES[err] };
    const updated = await tx.tarotSession.update({
      where: { id: s.id },
      data: { clarifiers: [...state.clarifiers, { forPick: clarifyPick, position }] },
    });
    return { ok: true, view: toView(updated) };
  });
}
