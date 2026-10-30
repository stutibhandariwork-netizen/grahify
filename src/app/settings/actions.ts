"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUserId } from "@/auth";
import { blindIndex, encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { LANGUAGES, WHATSAPP_OPT_IN_TEXT } from "@/lib/profile";

const isTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export async function savePreferences(formData: FormData) {
  const userId = await requireUserId();
  const language = String(formData.get("language") ?? "");
  const timezone = String(formData.get("timezone") ?? "");
  if (!LANGUAGES.some((l) => l.code === language) || !isTimeZone(timezone)) redirect("/settings?error=prefs");
  await prisma.user.update({ where: { id: userId }, data: { language, timezone } });
  redirect("/settings?saved=prefs");
}

/** Accepts +<country><number>, or a 10-digit Indian mobile. */
function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/[\s()-]/g, "");
  if (/^\+[1-9]\d{7,14}$/.test(digits)) return digits;
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  return null;
}

/** Opt in (or update number and choices). The consent wording and time are stored with the opt-in. */
export async function saveWhatsApp(formData: FormData) {
  const userId = await requireUserId();
  const consent = formData.get("consent") === "on";
  const weekly = formData.get("weekly") === "on";
  const daily = formData.get("daily") === "on";
  const dailyTime = String(formData.get("dailyTime") ?? "");
  const rawPhone = String(formData.get("phone") ?? "").trim();
  const existing = await prisma.whatsAppSubscription.findUnique({ where: { userId } });
  const active = existing && !existing.optedOutAt;

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(dailyTime) && daily) redirect("/settings?error=time#whatsapp");

  // Changing preferences on an active subscription needs no new number or consent.
  if (active && !rawPhone) {
    await prisma.whatsAppSubscription.update({ where: { userId }, data: { weekly, daily, dailyTime: daily ? dailyTime : null } });
    redirect("/settings?saved=whatsapp#whatsapp");
  }

  const phone = normalisePhone(rawPhone);
  if (!phone) redirect("/settings?error=phone#whatsapp");
  if (!consent) redirect("/settings?error=consent#whatsapp");
  const data = {
    phoneEnc: encrypt(phone),
    phoneHash: blindIndex(phone),
    optedInAt: new Date(),
    optedOutAt: null,
    optInSource: "settings",
    optInText: WHATSAPP_OPT_IN_TEXT,
    weekly,
    daily,
    dailyTime: daily ? dailyTime : null,
  };
  await prisma.whatsAppSubscription.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  redirect("/settings?saved=whatsapp#whatsapp");
}

/** Opt out: keeps the record of the original opt-in, stamped with when it ended. */
export async function optOutWhatsApp() {
  const userId = await requireUserId();
  await prisma.whatsAppSubscription.updateMany({ where: { userId, optedOutAt: null }, data: { optedOutAt: new Date() } });
  redirect("/settings?saved=optout#whatsapp");
}

/** Permanently deletes the account and everything in it. */
export async function deleteAccount(formData: FormData) {
  const userId = await requireUserId();
  if (String(formData.get("confirm") ?? "").trim() !== "DELETE") redirect("/settings?error=confirm#delete");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier: user.email } }),
    // Profiles, readings, tarot, journal, chats, WhatsApp, sessions and accounts cascade from the user.
    prisma.user.delete({ where: { id: userId } }),
  ]);
  // The session row is already gone, so just drop the cookie rather than asking Auth.js to sign out.
  const jar = await cookies();
  for (const name of ["authjs.session-token", "__Secure-authjs.session-token", "grahify_signin_email"]) jar.delete(name);
  redirect("/?deleted=1");
}
