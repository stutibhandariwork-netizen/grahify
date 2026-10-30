import { redirect } from "next/navigation";
import { requireUserId } from "@/auth";
import { prisma } from "@/lib/db";
import { LANGUAGES, WHATSAPP_OPT_IN_TEXT } from "@/lib/profile";
import { ProfileForm } from "./profile-form";

export default async function Onboarding() {
  const userId = await requireUserId();
  const existing = await prisma.profile.findFirst({ where: { userId }, select: { id: true } });
  if (existing) redirect("/astrology");

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div>
        <p className="eyebrow">Step 1 of 1</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Your birth details</h1>
        <p className="mt-2 text-muted">
          The exact time and place matter: your rising sign changes about every two hours.
        </p>
      </div>
      <ProfileForm languages={LANGUAGES} optInText={WHATSAPP_OPT_IN_TEXT} />
    </div>
  );
}
