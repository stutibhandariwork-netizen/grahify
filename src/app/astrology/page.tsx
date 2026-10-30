import Link from "next/link";
import { redirect } from "next/navigation";
import { AREAS } from "@/lib/astrology/life-areas";
import { Suspense } from "react";
import { requireUserId } from "@/auth";
import { AddNoteLink } from "@/components/add-note-link";
import { ChartTabs } from "@/components/astrology/chart-tabs";
import { fmtDate } from "@/components/astrology/format";
import { PromptPreview, Prose, ProseSkeleton } from "@/components/astrology/prose";
import {
  BorderlineNote,
  CoreSigns,
  DashaTimeline,
  Placements,
  SaturnCycles,
  Section,
  Yogas,
} from "@/components/astrology/sections";
import { prisma } from "@/lib/db";
import { northIndianChartSvg } from "@/lib/engine";
import type { BaseReport } from "@/lib/llm/base-report";
import { loadPrimaryProfile, type LanguageCode } from "@/lib/profile";
import { getOrCreateBaseReport, type BaseReportResult } from "@/lib/readings";

export const metadata = { title: "My chart · Grahify" };

export default async function AstrologyPage() {
  const userId = await requireUserId();
  const [profile, user] = await Promise.all([
    loadPrimaryProfile(userId),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { language: true } }),
  ]);
  if (!profile) redirect("/onboarding");
  const { chart, birth } = profile;

  // Started once, awaited by each prose section so the calculated parts render immediately.
  const report = getOrCreateBaseReport(userId, profile, user.language as LanguageCode);

  const d1 = northIndianChartSvg(chart, { title: "Birth chart (D1)" });
  const d9 = northIndianChartSvg(chart, {
    ascendantSign: chart.navamsa.lagnaSign ?? chart.navamsa.planets.Moon,
    planetSigns: chart.navamsa.planets,
    title: "Navamsa chart (D9)",
  });

  return (
    <div className="flex flex-col gap-12 pt-4">
      <header>
        <p className="eyebrow">Your birth chart</p>
        <h1 className="mt-2 font-display text-4xl font-semibold">{birth.name}</h1>
        <p className="mt-2 text-sm text-muted">
          {fmtDate(`${birth.birthDate}T00:00:00Z`)}
          {birth.birthTime ? ` · ${birth.birthTime}` : " · time unknown"} · {birth.place.label}
        </p>
        {birth.timeNote && <p className="mt-1 text-xs text-muted">{birth.timeNote}</p>}
        <nav className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Readings">
          <Link href="/astrology/week" className="card col-span-2 flex flex-col gap-0.5 border-accent/50 bg-accent-soft p-3.5 sm:col-span-1">
            <span className="font-semibold">This week</span>
            <span className="text-xs text-muted">Planet by planet</span>
          </Link>
          {AREAS.map((a) => (
            <Link key={a.key} href={`/astrology/area/${a.key}`} className="card flex flex-col gap-0.5 p-3.5 hover:border-accent/60">
              <span className="font-semibold">{a.title}</span>
              <span className="text-xs text-muted">{a.blurb}</span>
            </Link>
          ))}
        </nav>
      </header>

      <Section eyebrow="The three pillars" title="Core signs">
        <CoreSigns chart={chart} />
        <BorderlineNote chart={chart} />
        {!chart.lagna && (
          <p className="rounded-2xl border border-line bg-surface-2 p-4 text-sm text-muted">
            Without an exact birth time, houses are counted from your Moon sign (Chandra lagna). If you find your time
            later, update your profile for a full chart.
          </p>
        )}
        <Narrative report={report} field="coreSigns" />
      </Section>

      <Section eyebrow="The map" title="Your chart">
        <div className="card">
          <ChartTabs d1={d1} d9={d9} />
        </div>
      </Section>

      <Section eyebrow="Nine grahas" title="Planet placements">
        <Placements chart={chart} />
        <Narrative report={report} field="placements" />
      </Section>

      <Section eyebrow="Combinations" title="Key patterns">
        <Yogas chart={chart} />
        <Narrative report={report} field="patterns" />
      </Section>

      <Section eyebrow="Vimshottari dasha" title="The chapters of your life">
        <DashaTimeline chart={chart} />
        <Narrative report={report} field="dashaTimeline" />
      </Section>

      <Section eyebrow="Saturn's rhythm" title="Big life cycles">
        <SaturnCycles chart={chart} />
        <Narrative report={report} field="lifeCycles" />
      </Section>

      <Section eyebrow="Today" title="Where you are right now">
        <Narrative report={report} field="rightNow" />
        <AddNoteLink type="chart" />
      </Section>

      <Suspense>
        <PromptPreview report={report} />
      </Suspense>
    </div>
  );
}

function Narrative({ report, field }: { report: Promise<BaseReportResult>; field: keyof BaseReport }) {
  return (
    <Suspense fallback={<ProseSkeleton />}>
      <Prose report={report} field={field} />
    </Suspense>
  );
}
