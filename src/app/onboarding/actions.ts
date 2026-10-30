"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUserId } from "@/auth";
import { blindIndex, encrypt, encryptJson } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { computeNatalChart, ENGINE_VERSION, resolveLocalTime } from "@/lib/engine";
import { getPlace, placeLabel } from "@/lib/places";
import { LANGUAGES, WHATSAPP_OPT_IN_TEXT, type BirthData } from "@/lib/profile";

export interface ProfileFormState {
  errors?: Partial<Record<"name" | "birthDate" | "birthTime" | "place" | "language" | "whatsapp" | "form", string>>;
  /** Asked when the birth time happened twice (clocks went back). */
  timeChoice?: { options: { value: string; label: string }[] };
  /** Shown when the birth time was skipped (clocks went forward); submitting again accepts it. */
  timeSkipped?: string;
  /** What was submitted, so React's post-action form reset restores it. */
  values?: Record<string, string>;
}

const schema = z.object({
  name: z.string().trim().min(1, "Please enter a name.").max(80),
  birthDate: z.iso.date("Please enter your date of birth."),
  timeUnknown: z.literal("on").optional(),
  birthTime: z.string().optional(),
  placeId: z.coerce.number({ error: "Choose your birthplace from the list." }).int().nonnegative(),
  language: z.enum(LANGUAGES.map((l) => l.code) as [string, ...string[]]),
  whatsapp: z.string().trim().optional(),
  whatsappOptIn: z.literal("on").optional(),
  occurrence: z.enum(["0", "1"]).optional(),
  acceptSkipped: z.literal("1").optional(),
});

/** Accepts +<country><number>, or a 10-digit Indian mobile. Returns E.164 or null. */
function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/[\s()-]/g, "");
  if (/^\+[1-9]\d{7,14}$/.test(digits)) return digits;
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  return null;
}

export async function saveProfile(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const raw = Object.fromEntries(
    [...formData.entries()].filter((e): e is [string, string] => typeof e[1] === "string" && e[1] !== ""),
  );
  const state = await validateAndSave(raw);
  return { ...state, values: raw };
}

async function validateAndSave(raw: Record<string, string>): Promise<ProfileFormState> {
  const userId = await requireUserId();
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const errors: ProfileFormState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] === "placeId" ? "place" : (issue.path[0] as keyof NonNullable<ProfileFormState["errors"]>);
      errors[key] ??= issue.message;
    }
    return { errors };
  }
  const input = parsed.data;
  const timeKnown = !input.timeUnknown;

  if (timeKnown && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.birthTime ?? "")) {
    return { errors: { birthTime: "Enter your birth time, or tick “I don’t know my exact time”." } };
  }
  const year = Number(input.birthDate.slice(0, 4));
  if (year < 1800 || new Date(`${input.birthDate}T00:00:00Z`) > new Date()) {
    return { errors: { birthDate: "Please check the date of birth." } };
  }

  const place = getPlace(input.placeId);
  if (!place) return { errors: { place: "Choose your birthplace from the list." } };

  // Unknown time: use local noon, which keeps the Moon within ±12 hours of the truth.
  const resolved = resolveLocalTime(input.birthDate, timeKnown ? input.birthTime! : "12:00", place.timeZone);
  let utc = resolved.utc;
  let timeNote: string | null = null;
  if (timeKnown && resolved.kind === "ambiguous") {
    if (!input.occurrence) {
      return {
        timeChoice: {
          options: resolved.candidates.map((c, i) => ({
            value: String(i),
            label: `${i === 0 ? "The first" : "The second"} ${input.birthTime} (${c.toISOString().slice(11, 16)} UTC)`,
          })),
        },
      };
    }
    utc = resolved.candidates[Number(input.occurrence)];
    timeNote = `Clocks went back that night; using the ${input.occurrence === "0" ? "first" : "second"} ${input.birthTime}.`;
  }
  if (timeKnown && resolved.kind === "nonexistent") {
    if (!input.acceptSkipped) {
      return {
        timeSkipped: `In ${place.name}, clocks jumped forward that night, so ${input.birthTime} never happened on the clock. Please check the time on the birth record. If it's correct, continue and we'll read it as ${resolved.utc.toISOString().slice(11, 16)} UTC.`,
      };
    }
    timeNote = "Clocks jumped forward that night; the recorded time was read with the earlier offset.";
  }

  let phone: string | null = null;
  if (input.whatsapp) {
    phone = normalisePhone(input.whatsapp);
    if (!phone) return { errors: { whatsapp: "Enter a mobile number with country code, e.g. +91 98765 43210." } };
    if (!input.whatsappOptIn) phone = null; // never store a number without consent
  }

  const chart = computeNatalChart({ utc, latitude: place.latitude, longitude: place.longitude, timeKnown });
  const birth: BirthData = {
    name: input.name,
    birthDate: input.birthDate,
    birthTime: timeKnown ? input.birthTime! : null,
    timeKnown,
    place: { id: place.id, label: placeLabel(place), latitude: place.latitude, longitude: place.longitude, timeZone: place.timeZone },
    utc: utc.toISOString(),
    timeNote,
  };

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { language: input.language, timezone: place.timeZone } });
    await tx.profile.deleteMany({ where: { userId, isPrimary: true } });
    await tx.profile.create({
      data: {
        userId,
        isPrimary: true,
        birthDataEnc: encryptJson(birth),
        chartEnc: encryptJson(chart),
        engineVersion: ENGINE_VERSION,
        moonSign: chart.planets.Moon.sign,
        lagnaSign: chart.lagna?.sign ?? null,
      },
    });
    if (phone) {
      const now = new Date();
      await tx.whatsAppSubscription.upsert({
        where: { userId },
        create: {
          userId,
          phoneEnc: encrypt(phone),
          phoneHash: blindIndex(phone),
          optedInAt: now,
          optInSource: "signup",
          optInText: WHATSAPP_OPT_IN_TEXT,
        },
        update: {
          phoneEnc: encrypt(phone),
          phoneHash: blindIndex(phone),
          optedInAt: now,
          optedOutAt: null,
          optInSource: "signup",
          optInText: WHATSAPP_OPT_IN_TEXT,
        },
      });
    }
  });

  redirect("/astrology");
}
