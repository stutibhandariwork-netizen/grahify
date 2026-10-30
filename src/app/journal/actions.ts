"use server";

import { redirect } from "next/navigation";
import { requireUserId } from "@/auth";
import { encryptJson } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { isLinkType, LINK_SECTION, type JournalBody } from "@/lib/journal/core";
import { resolveLink } from "@/lib/journal/server";
import { loadPrimaryProfile } from "@/lib/profile";
import { localDay } from "@/lib/time";

export async function createEntry(formData: FormData) {
  const userId = await requireUserId();
  const text = String(formData.get("text") ?? "").trim().slice(0, 10_000);
  const linkType = String(formData.get("linkType") ?? "");
  const linkId = String(formData.get("linkId") ?? "");
  const prompt = String(formData.get("prompt") ?? "").trim() || null;
  const back = linkType ? `/journal/new?type=${linkType}&id=${encodeURIComponent(linkId)}` : "/journal/new";
  if (!text) redirect(`${back}${back.includes("?") ? "&" : "?"}error=empty`);

  const [profile, user] = await Promise.all([
    loadPrimaryProfile(userId),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } }),
  ]);
  if (!profile) redirect("/onboarding");

  let body: JournalBody = { text };
  let section: keyof typeof LINK_SECTION | null = null;
  if (linkType) {
    if (!isLinkType(linkType)) redirect("/journal");
    const link = await resolveLink(userId, profile, linkType, linkId, user.timezone);
    if (!link) redirect("/journal");
    body = { text, link };
    section = linkType;
  }

  await prisma.journalEntry.create({
    data: {
      userId,
      section: section ? LINK_SECTION[section] : "FREE",
      linkType: section,
      linkId: section ? linkId : null,
      prompt: section ? null : prompt,
      bodyEnc: encryptJson(body),
      entryDate: new Date(`${localDay(new Date(), user.timezone).date}T00:00:00Z`),
    },
  });
  redirect("/journal?saved=1");
}

export async function deleteEntry(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  await prisma.journalEntry.deleteMany({ where: { id, userId } });
  redirect("/journal");
}
