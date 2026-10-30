import "server-only";
import { decryptJson } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { currentDasha, type NatalChart } from "@/lib/engine";

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "or", label: "ଓଡ଼ିଆ (Odia)" },
] as const;
export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const WHATSAPP_OPT_IN_TEXT =
  "Send me my weekly reading on WhatsApp. I can reply STOP at any time to unsubscribe.";

/** Decrypted shape of Profile.birthDataEnc. */
export interface BirthData {
  name: string;
  birthDate: string; // YYYY-MM-DD, local
  birthTime: string | null; // HH:mm, local; null when unknown
  timeKnown: boolean;
  place: { id: number; label: string; latitude: number; longitude: number; timeZone: string };
  utc: string;
  /** Set when the local time was skipped or repeated by a clock change. */
  timeNote: string | null;
}

export async function loadPrimaryProfile(userId: string) {
  const profile = await prisma.profile.findFirst({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
  if (!profile) return null;
  const stored = decryptJson<NatalChart>(profile.chartEnc);
  return {
    id: profile.id,
    engineVersion: profile.engineVersion,
    birth: decryptJson<BirthData>(profile.birthDataEnc),
    // The stored chart's "current" dasha is as of when it was saved; refresh it for today.
    chart: { ...stored, currentDasha: currentDasha(stored.dasha, new Date()) },
  };
}
