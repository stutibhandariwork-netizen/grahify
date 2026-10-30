import type { LifeArea } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUserId } from "@/auth";
import { AddNoteLink } from "@/components/add-note-link";
import { GLYPH } from "@/components/astrology/format";
import { ClaudeText, fmtLocal, ordinal, PreviewPanel } from "@/components/reading-bits";
import { AREAS, areaByKey, lifeAreaFacts, type LifeAreaFacts } from "@/lib/astrology/life-areas";
import { prisma } from "@/lib/db";
import { utcOffsetMinutes } from "@/lib/engine";
import { loadPrimaryProfile, type LanguageCode } from "@/lib/profile";
import { getOrCreateDeepDive } from "@/lib/readings";

export default async function AreaPage({ params }: { params: Promise<{ key: string }> }) {
  const area = areaByKey((await params).key);
  if (!area) notFound();
  const userId = await requireUserId();
  const [profile, user] = await Promise.all([
    loadPrimaryProfile(userId),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { language: true, timezone: true } }),
  ]);
  if (!profile) redirect("/onboarding");
  const tz = user.timezone;

  const now = new Date();
  const facts = lifeAreaFacts(profile.chart, area, now);
  const local = new Date(now.getTime() + utcOffsetMinutes(tz, now) * 60_000);
  const monthStart = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1));
  const reading = getOrCreateDeepDive(userId, profile.id, facts, area.key.toUpperCase() as LifeArea, user.language as LanguageCode, monthStart);

  return (
    <div className="flex flex-col gap-10 pt-4">
      <header>
        <Link href="/astrology" className="text-sm text-muted">
          ← My chart
        </Link>
        <p className="eyebrow mt-4">Deep dive</p>
        <h1 className="mt-2 font-display text-4xl font-semibold">{area.title}</h1>
        <p className="mt-2 text-muted">{area.blurb}, read from your chart, dashas and the slow planets.</p>
        <nav className="mt-4 flex flex-wrap gap-2">
          {AREAS.filter((a) => a.key !== area.key).map((a) => (
            <Link key={a.key} href={`/astrology/area/${a.key}`} className="chip hover:border-accent/60">
              {a.title}
            </Link>
          ))}
        </nav>
      </header>

      {area.key === "health" && (
        <p className="rounded-2xl border border-line bg-surface-2 p-4 text-sm text-muted">
          Astrology can describe tendencies and rhythms, not medical facts. For any health concern, please see a doctor.
        </p>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-semibold">Your natural pattern</h2>
        <div className="grid gap-3">
          {facts.houses.map((h) => (
            <div key={h.house} className="card flex flex-col gap-1.5 p-4">
              <p className="font-semibold">
                {ordinal(h.house)} house · {h.sign}
                <span className="font-normal text-muted"> · {h.means}</span>
              </p>
              <p className="text-sm">
                Lord <strong>{h.lord.planet}</strong> in the {ordinal(h.lord.house)} ({h.lord.sign})
                {h.lord.dignity ? `, ${h.lord.dignity}` : ""}
                {h.lord.retrograde ? ", retrograde" : ""}
                {h.lord.combust ? ", combust" : ""}
              </p>
              <p className="text-xs text-muted">
                {h.occupants.length ? `In it: ${h.occupants.join(", ")}` : "No planets in it"}
                {h.aspectedBy.length ? ` · aspected by ${h.aspectedBy.join(", ")}` : ""}
              </p>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted">
          Significators:{" "}
          {facts.karakas.map((k, i) => (
            <span key={k.planet}>
              {i > 0 && ", "}
              {GLYPH[k.planet]} {k.planet} in the {ordinal(k.house)} ({k.sign})
            </span>
          ))}
        </p>
        <ClaudeText reading={reading} pick={(c) => c.naturalPattern} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-semibold">What&apos;s been happening</h2>
        <Timeline items={facts.slowTransits.past.slice(-4)} tz={tz} empty="No slow planet passed through these houses in the last 18 months." />
        {facts.dasha?.previousAntardasha && (
          <p className="text-sm text-muted">
            Previous antardasha: {facts.dasha.previousAntardasha.lord}, to {fmtLocal(facts.dasha.previousAntardasha.end, tz)}
            {facts.dasha.previousAntardasha.activatesArea ? " (linked to this area)" : ""}
          </p>
        )}
        <ClaudeText reading={reading} pick={(c) => c.recentPast} placeholder={null} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-semibold">What&apos;s coming</h2>
        {facts.dasha && (
          <div className="card flex flex-col gap-2 p-4 text-sm">
            <p>
              Now: <strong>{facts.dasha.mahadasha.lord}</strong> mahadasha, <strong>{facts.dasha.antardasha.lord}</strong>{" "}
              antardasha to {fmtLocal(facts.dasha.antardasha.end, tz)}
              {facts.dasha.antardasha.activatesArea || facts.dasha.mahadasha.activatesArea ? (
                <span className="chip ml-2 border-accent/50 bg-accent-soft text-ink">active for {area.title.toLowerCase()}</span>
              ) : null}
            </p>
            {facts.dasha.nextAntardashas.map((a) => (
              <p key={a.start} className="text-muted">
                Then {a.lord} antardasha from {fmtLocal(a.start, tz)}
                {a.activatesArea ? <span className="chip ml-2 border-accent/50 bg-accent-soft text-ink">linked to {area.title.toLowerCase()}</span> : null}
              </p>
            ))}
          </div>
        )}
        <Timeline
          items={[...facts.slowTransits.now.filter((s) => s.inAreaHouse || s.aspectsAreaHouse), ...facts.slowTransits.coming]}
          tz={tz}
          empty="No slow planet is in or enters these houses in the next 12 months."
        />
        <ClaudeText reading={reading} pick={(c) => c.comingUp} placeholder={null} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-semibold">What to focus on</h2>
        <ClaudeText reading={reading} pick={(c) => c.focus} placeholder="Claude will suggest what to focus on once an API key is added." />
      </section>

      <AddNoteLink type="area" id={area.key} />
      <PreviewPanel reading={reading} />
    </div>
  );
}

function Timeline({ items, tz, empty }: { items: LifeAreaFacts["slowTransits"]["past"]; tz: string; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ol className="card divide-y divide-line p-0">
      {items.map((s) => (
        <li key={s.planet + s.from} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
          <span>
            <span className="text-accent">{GLYPH[s.planet]}</span> <strong>{s.planet}</strong> in {s.sign}
            <span className="block text-xs text-muted">
              {ordinal(s.houseFromBasis)} house{s.inAreaHouse ? "" : " · aspecting these houses"}
            </span>
          </span>
          <span className="shrink-0 text-right text-xs text-muted tabular-nums">
            {fmtLocal(s.from, tz)}
            <br />– {fmtLocal(s.to, tz)}
          </span>
        </li>
      ))}
    </ol>
  );
}
