import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { loadPrimaryProfile, type LanguageCode } from "@/lib/profile";
import { HomeDashboard } from "./home-dashboard";

export default async function Home() {
  const session = await auth();
  if (session?.user?.id) {
    const [profile, user] = await Promise.all([
      loadPrimaryProfile(session.user.id),
      prisma.user.findUniqueOrThrow({ where: { id: session.user.id }, select: { timezone: true, language: true } }),
    ]);
    if (!profile) redirect("/onboarding");
    return <HomeDashboard profile={profile} timeZone={user.timezone} language={user.language as LanguageCode} />;
  }

  return (
    <div className="flex flex-col gap-10 pt-10">
      <section className="flex flex-col gap-5">
        <p className="eyebrow">Astrology · Tarot · Numerology</p>
        <h1 className="font-display text-4xl leading-[1.1] font-semibold tracking-tight sm:text-5xl">
          Your chart, read the way a good astrologer would.
        </h1>
        <p className="text-lg text-muted">
          Grahify calculates your Vedic chart precisely, from planet positions and dashas to transits, then explains
          what it means for you in plain words.
        </p>
        <div>
          <Link href="/signin" className="btn">
            Begin with your birth details
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["Calculated, not guessed", "Every planet, house and dasha comes from astronomical code, never from a chatbot."],
          ["Your time, your place", "Birthplaces worldwide, with the correct historical time zone."],
          ["Private by design", "Birth details and readings are encrypted. Export or delete them any time."],
        ].map(([title, body]) => (
          <div key={title} className="card">
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
