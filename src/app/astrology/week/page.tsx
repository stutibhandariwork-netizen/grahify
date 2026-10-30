import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUserId } from "@/auth";
import { AddNoteLink } from "@/components/add-note-link";
import { GLYPH } from "@/components/astrology/format";
import { ClaudeText, fmtLocal, ordinal, PreviewPanel } from "@/components/reading-bits";
import { weekStart, weeklyFacts, type PlanetWeek, type SignStay } from "@/lib/astrology/weekly";
import { prisma } from "@/lib/db";
import { utcOffsetMinutes, type TransitEvent } from "@/lib/engine";
import { loadPrimaryProfile, type LanguageCode } from "@/lib/profile";
import { getOrCreateWeeklyReading } from "@/lib/readings";

export const metadata = { title: "This week · Grahify" };

const EVENT: Record<TransitEvent["type"], (e: TransitEvent) => string> = {
  ingress: (e) => `Enters ${e.toSignName}`,
  station_retrograde: () => "Turns retrograde",
  station_direct: () => "Turns direct",
  combust_start: () => "Becomes combust (too close to the Sun)",
  combust_end: () => "Leaves combustion",
  nakshatra_change: (e) => `Enters ${e.nakshatra}`,
};

export default async function WeekPage() {
  const userId = await requireUserId();
  const [profile, user] = await Promise.all([
    loadPrimaryProfile(userId),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { language: true, timezone: true } }),
  ]);
  if (!profile) redirect("/onboarding");
  const tz = user.timezone;

  const start = weekStart(new Date(), (d) => utcOffsetMinutes(tz, d));
  const end = new Date(start.getTime() + 7 * 86_400_000);
  const facts = weeklyFacts(profile.chart, start, end);
  const reading = getOrCreateWeeklyReading(userId, profile.id, facts, user.language as LanguageCode);
  const hasLagna = facts.reference.lagnaSign !== null;
  const lastDay = new Date(end.getTime() - 1);

  const houses = (s: Pick<SignStay, "houseFromMoon" | "houseFromLagna">) =>
    `${ordinal(s.houseFromMoon)} from Moon${hasLagna && s.houseFromLagna ? ` · ${ordinal(s.houseFromLagna)} from lagna` : ""}`;

  return (
    <div className="flex flex-col gap-8 pt-4">
      <header>
        <Link href="/astrology" className="text-sm text-muted">
          ← My chart
        </Link>
        <p className="eyebrow mt-4">Weekly transits</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">
          {fmtLocal(start.toISOString(), tz).replace(/ \d{4}$/, "")} – {fmtLocal(lastDay.toISOString(), tz)}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Houses counted from your Moon in {facts.reference.moonSign}
          {hasLagna ? ` and your ${facts.reference.lagnaSign} lagna` : ""}.
        </p>
      </header>

      <section className="card border-accent/50 bg-accent-soft">
        <p className="eyebrow">The week in brief</p>
        <div className="mt-2">
          <ClaudeText reading={reading} pick={(c) => c.summary} placeholder="Claude will sum up your week once an API key is added." />
        </div>
      </section>

      {facts.dasha.atStart && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-semibold">Your dasha</h2>
          <div className="card grid grid-cols-3 gap-2 text-center text-sm">
            {(["mahadasha", "antardasha", "pratyantar"] as const).map((level) => {
              const p = facts.dasha.atStart![level];
              return (
                <div key={level}>
                  <p className="text-xs text-muted capitalize">{level}</p>
                  <p className="font-display text-lg font-semibold">
                    <span className="text-accent">{GLYPH[p.lord]}</span> {p.lord}
                  </p>
                  <p className="text-xs text-muted">to {fmtLocal(p.end, tz)}</p>
                </div>
              );
            })}
          </div>
          {facts.dasha.changes.map((c) => (
            <p key={c.level} className="rounded-xl bg-accent-soft px-4 py-2 text-sm">
              {fmtLocal(c.date, tz)}: {c.level} changes from {c.from} to <strong>{c.to}</strong>.
            </p>
          ))}
          <ClaudeText reading={reading} pick={(c) => c.dasha} placeholder={null} />
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-semibold">Planet by planet</h2>
        {facts.planets.map((p, i) => (
          <PlanetCard key={p.graha} p={p} tz={tz} houses={houses}>
            <div className="flex flex-col gap-3">
              <ClaudeText
                reading={reading}
                pick={(c) => c.planets[i]?.whatHappened}
                placeholder={null}
                label={<p className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">While it was there</p>}
              />
              <ClaudeText
                reading={reading}
                pick={(c) => c.planets[i]?.expect}
                placeholder={null}
                label={<p className="mb-1 text-xs font-semibold tracking-wide text-accent uppercase">Now expect</p>}
              />
            </div>
          </PlanetCard>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-semibold">
          <span className="text-accent">{GLYPH.Moon}</span> The Moon this week
        </h2>
        <ol className="card divide-y divide-line p-0">
          {facts.moon.map((m) => (
            <li key={m.from} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span className="font-medium">{m.sign}</span>
              <span className="text-xs text-muted">{houses(m)}</span>
              <span className="shrink-0 text-xs text-muted tabular-nums">
                {fmtLocal(m.from, tz, true).replace(/ \d{4},/, ",")}
              </span>
            </li>
          ))}
        </ol>
        <ClaudeText reading={reading} pick={(c) => c.moon} placeholder={null} />
      </section>

      <AddNoteLink type="weekly" id={facts.week.start} />
      <PreviewPanel reading={reading} />
    </div>
  );
}

function Stay({ s }: { s: SignStay }) {
  return (
    <>
      {s.dignity && <span className={`chip ${s.dignity === "debilitated" ? "text-warn" : "text-good"}`}>{s.dignity}</span>}
      {s.overNatal.length > 0 && <span className="chip">on your natal {s.overNatal.join(", ")}</span>}
    </>
  );
}

function PlanetCard({
  p,
  tz,
  houses,
  children,
}: {
  p: PlanetWeek;
  tz: string;
  houses: (s: Pick<SignStay, "houseFromMoon" | "houseFromLagna">) => string;
  children: React.ReactNode;
}) {
  return (
    <article className="card flex flex-col gap-4">
      <h3 className="flex items-center gap-2 font-display text-xl font-semibold">
        <span className="text-accent">{GLYPH[p.graha]}</span> {p.graha}
        {p.now.retrograde && p.graha !== "Rahu" && p.graha !== "Ketu" && <span className="chip">retrograde</span>}
        {p.now.combust && <span className="chip text-warn">combust</span>}
      </h3>

      <dl className="grid gap-3 text-sm">
        <div className="grid grid-cols-[4.5rem_1fr] gap-2">
          <dt className="text-xs font-semibold text-muted uppercase">Before</dt>
          <dd className="flex flex-col gap-1">
            <span>
              <strong>{p.before.signName}</strong> · {houses(p.before)}
            </span>
            <span className="text-xs text-muted">
              {fmtLocal(p.before.from, tz)} – {fmtLocal(p.before.to, tz)}
            </span>
            <span className="flex flex-wrap gap-1">
              <Stay s={p.before} />
            </span>
          </dd>
        </div>
        <div className="grid grid-cols-[4.5rem_1fr] gap-2">
          {/* A sign change later this week shows as where it is moving to. */}
          <dt className="text-xs font-semibold text-accent uppercase">{p.now.since > new Date().toISOString() ? "Moving to" : "Now"}</dt>
          <dd className="flex flex-col gap-1">
            <span>
              <strong>{p.now.signName}</strong> {p.now.degree}° · {houses(p.now)}
            </span>
            <span className="text-xs text-muted">
              {p.now.since > new Date().toISOString() ? "From" : "Since"} {fmtLocal(p.now.since, tz)} · {p.now.nakshatra}
            </span>
            <span className="flex flex-wrap gap-1">
              <Stay s={p.now} />
              {p.now.aspectsNatal.length > 0 && <span className="chip">aspects natal {p.now.aspectsNatal.join(", ")}</span>}
            </span>
          </dd>
        </div>
        {p.thisWeek.length > 0 && (
          <div className="grid grid-cols-[4.5rem_1fr] gap-2">
            <dt className="text-xs font-semibold text-muted uppercase">This week</dt>
            <dd>
              <ul className="flex flex-col gap-0.5">
                {p.thisWeek.map((e) => (
                  <li key={e.date + e.type}>
                    <span className="text-muted">{fmtLocal(e.date, tz, true)}:</span> {EVENT[e.type](e)}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
        {p.next && (
          <div className="grid grid-cols-[4.5rem_1fr] gap-2">
            <dt className="text-xs font-semibold text-muted uppercase">Next</dt>
            <dd>
              {p.next.signName} on {fmtLocal(p.next.date, tz)} <span className="text-xs text-muted">({houses(p.next)})</span>
            </dd>
          </div>
        )}
      </dl>
      {children}
    </article>
  );
}
