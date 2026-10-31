import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUserId } from "@/auth";
import { ProfileForm } from "@/app/onboarding/profile-form";
import { prisma } from "@/lib/db";
import { LANGUAGES, loadPrimaryProfile, WHATSAPP_OPT_IN_TEXT } from "@/lib/profile";

export const metadata = { title: "Edit birth details · Grahify" };

export default async function EditProfile() {
  const userId = await requireUserId();
  const [profile, user] = await Promise.all([
    loadPrimaryProfile(userId),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { language: true } }),
  ]);
  if (!profile) redirect("/onboarding");
  const b = profile.birth;

  return (
    <div className="flex flex-col gap-6 pt-4">
      <Link href="/settings" className="text-sm text-muted">
        ← Settings
      </Link>
      <div>
        <h1 className="font-display text-3xl font-semibold">Edit birth details</h1>
        <p className="mt-2 text-sm text-muted">
          Saving recalculates your chart. Readings based on the old chart (your report, weekly readings, deep dives,
          numerology and affirmations) are cleared so they can be rewritten. Tarot readings and your journal are kept.
        </p>
      </div>
      <ProfileForm
        languages={LANGUAGES}
        optInText={WHATSAPP_OPT_IN_TEXT}
        showWhatsApp={false}
        submitLabel="Save and recalculate"
        initial={{
          name: b.name,
          birthDate: b.birthDate,
          ...(b.birthTime ? { birthTime: b.birthTime } : { timeUnknown: "on" }),
          language: user.language,
        }}
        initialPlace={{ id: b.place.id, label: b.place.label, timeZone: b.place.timeZone }}
      />
    </div>
  );
}
