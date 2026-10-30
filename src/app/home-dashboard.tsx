import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AddNoteLink } from "@/components/add-note-link";
import { GLYPH } from "@/components/astrology/format";
import { fmtLocal, fmtTime, ordinal } from "@/components/reading-bits";
import { CardBack } from "@/components/tarot/card-back";
import { dailyFacts, type DailyFacts } from "@/lib/astrology/daily";
import { prisma } from "@/lib/db";
import { personalCycles } from "@/lib/numerology/calc";
import { PERSONAL_YEAR } from "@/lib/numerology/meanings";
import type { BirthData, LanguageCode } from "@/lib/profile";
import type { NatalChart } from "@/lib/engine";
import { getOrCreateAffirmation } from "@/lib/readings";
import { cardImage, DECK } from "@/lib/tarot/deck";
import { localDay } from "@/lib/time";
import { startReading } from "./tarot/actions";

interface Props {
  profile: { id: string; birth: BirthData; chart: NatalChart };
  timeZone: string;
  language: LanguageCode;
}

/** The signed-in home screen: today's affirmation and the day at a glance. */
export async function HomeDashboard({ profile, timeZone, language }: Props) {
  const today = localDay(new Date(), timeZone);
  const facts = dailyFacts(profile.chart, today.start, today.date);
  const firstName = profile.birth.name.split(" ")[0];
  const greeting = today.hour < 12 ? "Good morning" : today.hour < 17 ? "Good afternoon" : "Good evening";

  const [, m, d] = profile.birth.birthDate.split("-").map(Number);
  const personal = personalCycles(m, d, today.parts);

  const cardOfDay = await prisma.tarotSession.findFirst({
    where: { profileId: profile.id, spread: "CARD_OF_DAY", createdAt: { gte: today.start } },
    orderBy: { createdAt: "desc" },
  });
  const drawn = cardOfDay?.picks[0] ? { card: DECK[cardOfDay.deckOrder[cardOfDay.picks[0] - 1]], reversed: cardOfDay.reversals[cardOfDay.picks[0] - 1] } : null;

  return (
    <div className="flex flex-col gap-6 pt-4">
      <header>
        <p className="text-sm text-muted">{fmtLocal(today.start.toISOString(), timeZone)}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">
          {greeting}, {firstName}
        </h1>
      </header>

      <Suspense fallback={<AffirmationSkeleton />}>
        <AffirmationCard profileId={profile.id} facts={facts} firstName={firstName} language={language} />
      </Suspense>

      <div className="grid grid-cols-2 gap-3">
        <div className="card flex flex-col gap-1 p-4">
          <p className="text-xs font-medium text-muted">Moon today</p>
          <p className="font-display text-xl font-semibold">
            <span className="text-accent">{GLYPH.Moon}</span> {facts.moon.sign}
          </p>
          <p className="text-xs text-muted">
            {ordinal(facts.moon.houseFromMoon)} from your Moon · {facts.moon.nakshatra}
          </p>
          {facts.moon.changes && (
            <p className="text-xs text-muted">
              Into {facts.moon.changes.sign} at {fmtTime(facts.moon.changes.at, timeZone)}
            </p>
          )}
        </div>

        {facts.dasha && (
          <Link href="/astrology" className="card flex flex-col gap-1 p-4 hover:border-accent/60">
            <p className="text-xs font-medium text-muted">Your dasha</p>
            <p className="font-display text-xl font-semibold">
              {facts.dasha.mahadasha.lord}–{facts.dasha.antardasha.lord}
            </p>
            <p className="text-xs text-muted">Pratyantar: {facts.dasha.pratyantar.lord}</p>
          </Link>
        )}

        {drawn ? (
          <Link href={`/tarot/r/${cardOfDay!.id}`} className="card flex items-center gap-3 p-4 hover:border-accent/60">
            <div className="relative aspect-[100/172] w-11 shrink-0 overflow-hidden rounded">
              <Image src={cardImage(drawn.card)} alt="" fill sizes="44px" className={`object-cover ${drawn.reversed ? "rotate-180" : ""}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted">Card of the day</p>
              <p className="text-sm font-semibold">{drawn.card.name}</p>
            </div>
          </Link>
        ) : (
          <form action={startReading} className="card flex items-center gap-3 p-4">
            <input type="hidden" name="spread" value="card-of-the-day" />
            <CardBack className="w-11 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted">Card of the day</p>
              <button className="text-sm font-semibold text-accent underline-offset-2 hover:underline">
                {cardOfDay ? "Choose your card" : "Draw today's card"}
              </button>
            </div>
          </form>
        )}

        <Link href="/numerology" className="card flex flex-col gap-1 p-4 hover:border-accent/60">
          <p className="text-xs font-medium text-muted">Personal day</p>
          <p className="font-display text-3xl font-semibold text-accent">{personal.day}</p>
          <p className="text-xs text-muted">{PERSONAL_YEAR[personal.day].split(":")[0]}</p>
        </Link>
      </div>

      <Link href="/astrology/week" className="card flex items-center justify-between gap-3 border-accent/50 bg-accent-soft hover:opacity-90">
        <div>
          <p className="font-semibold">Your week, planet by planet</p>
          <p className="text-sm text-muted">Where each planet was, where it is, and what to expect</p>
        </div>
        <span aria-hidden className="text-xl text-accent">
          →
        </span>
      </Link>
    </div>
  );
}

async function AffirmationCard({ profileId, facts, firstName, language }: { profileId: string; facts: DailyFacts; firstName: string; language: LanguageCode }) {
  const a = await getOrCreateAffirmation(profileId, facts, firstName, language);
  return (
    <section className="card relative overflow-hidden border-accent/40 p-6" aria-labelledby="affirmation-label">
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-accent/10 blur-2xl" />
      <p id="affirmation-label" className="eyebrow">
        Today&apos;s affirmation
      </p>
      <blockquote className="mt-3 font-display text-2xl leading-snug font-medium sm:text-3xl">“{a.text}”</blockquote>
      <p className="mt-4 text-sm text-muted">{a.why}</p>
      <AddNoteLink type="affirmation" id={facts.date} className="mt-4" />
      {a.source === "template" && (
        <details className="mt-4 text-xs text-muted">
          <summary className="cursor-pointer">Preview mode</summary>
          <p className="mt-2">
            This is a built-in English affirmation. With an API key, Claude writes a new one each day in your language.
          </p>
          {a.prompt && <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-surface-2 p-3 whitespace-pre-wrap">{a.prompt}</pre>}
        </details>
      )}
    </section>
  );
}

function AffirmationSkeleton() {
  return (
    <div className="card flex animate-pulse flex-col gap-3 p-6" aria-label="Writing today's affirmation">
      <div className="h-3 w-32 rounded bg-surface-2" />
      <div className="h-6 w-full rounded bg-surface-2" />
      <div className="h-6 w-3/4 rounded bg-surface-2" />
      <div className="h-3 w-2/3 rounded bg-surface-2" />
    </div>
  );
}
