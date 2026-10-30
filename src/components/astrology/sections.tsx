import { GRAHAS, SIGNS, type NatalChart, type PlanetPosition, type SaturnCycle } from "@/lib/engine";
import { ageAt, dms, fmtDate, fmtMonth, GLYPH, SANSKRIT } from "./format";

export function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-1 font-display text-2xl font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

const sign = (s: number) => `${SIGNS[s].en}`;

export function CoreSigns({ chart }: { chart: NatalChart }) {
  const { Moon, Sun } = chart.planets;
  const cards = [
    {
      label: "Moon sign · Rashi",
      value: sign(Moon.sign),
      sub: `${SIGNS[Moon.sign].sa} · ${Moon.nakshatra.name} nakshatra, pada ${Moon.nakshatra.pada}`,
      note: "Your mind and feelings",
    },
    {
      label: "Rising sign · Lagna",
      value: chart.lagna ? sign(chart.lagna.sign) : "Unknown",
      sub: chart.lagna ? `${SIGNS[chart.lagna.sign].sa} · ${dms(chart.lagna.degree)}` : "Needs an exact birth time",
      note: "Your body and how you meet the world",
    },
    { label: "Sun sign", value: sign(Sun.sign), sub: `${SIGNS[Sun.sign].sa} · ${Sun.nakshatra.name}`, note: "Your will and purpose" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="card flex flex-col gap-1 p-4">
          <p className="text-xs font-medium text-muted">{c.label}</p>
          <p className="font-display text-2xl font-semibold">{c.value}</p>
          <p className="text-xs text-muted">{c.sub}</p>
          <p className="mt-1 text-xs text-accent">{c.note}</p>
        </div>
      ))}
    </div>
  );
}

export function BorderlineNote({ chart }: { chart: NatalChart }) {
  const b = chart.lagna?.borderline;
  if (!chart.lagna || !b) return null;
  const mins = Math.abs(b.minutesToChange);
  return (
    <div className="rounded-2xl border border-accent/60 bg-accent-soft p-4 text-sm">
      <p className="font-semibold">Your lagna sits right on a sign boundary</p>
      <p className="mt-1 text-muted">
        It is {dms(chart.lagna.degree)} {SIGNS[chart.lagna.sign].en}. Had you been born about {mins} minute{mins === 1 ? "" : "s"}{" "}
        {b.minutesToChange < 0 ? "earlier" : "later"}, it would be {b.alternateSignName}. If you aren&apos;t sure of the exact
        minute, read both. The houses each planet falls in under {b.alternateSignName} rising are shown in the table below.
      </p>
    </div>
  );
}

function Badges({ p }: { p: PlanetPosition }) {
  const items: [string, string][] = [];
  if (p.dignity === "exalted") items.push(["Exalted", "text-good"]);
  if (p.dignity === "own") items.push(["Own sign", "text-good"]);
  if (p.dignity === "debilitated") items.push(["Debilitated", "text-warn"]);
  if (p.retrograde && p.graha !== "Rahu" && p.graha !== "Ketu") items.push(["Retrograde", ""]);
  if (p.combust) items.push(["Combust", "text-warn"]);
  return (
    <>
      {items.map(([t, c]) => (
        <span key={t} className={`chip ${c}`}>
          {t}
        </span>
      ))}
    </>
  );
}

export function Placements({ chart }: { chart: NatalChart }) {
  const alt = chart.lagna?.borderline;
  return (
    <div className="card overflow-hidden p-0">
      <ul className="divide-y divide-line">
        {GRAHAS.map((g) => {
          const p = chart.planets[g];
          return (
            <li key={g} className="flex gap-3 px-4 py-3">
              <span className="w-6 pt-0.5 text-center font-display text-xl text-accent" aria-hidden>
                {GLYPH[g]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="font-semibold">
                    {g} {SANSKRIT[g] !== g && <span className="font-normal text-muted">· {SANSKRIT[g]}</span>}
                  </p>
                  <p className="text-sm tabular-nums">
                    {SIGNS[p.sign].en} {dms(p.degree)}
                  </p>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                  <span>
                    House {p.house}
                    {alt ? ` (${alt.alternateHouses[g]} if ${alt.alternateSignName})` : ""}
                  </span>
                  <span aria-hidden>·</span>
                  <span>
                    {p.nakshatra.name} {p.nakshatra.pada}
                  </span>
                  <Badges p={p} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-line px-4 py-2.5 text-xs text-muted">
        Sidereal (Lahiri {dms(chart.ayanamsa.degrees)}), whole-sign houses
        {chart.houseBasis === "moon" ? " counted from the Moon" : ""}, mean nodes.
      </p>
    </div>
  );
}

export function Yogas({ chart }: { chart: NatalChart }) {
  const present = chart.yogas.filter((y) => y.present);
  if (present.length === 0) return <p className="text-sm text-muted">None of the classic yogas we check for are present.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {present.map((y) => (
        <span key={y.key} className="chip border-accent/40 bg-accent-soft text-ink">
          {y.name}
          {y.cancelled ? " (cancelled)" : ""}
        </span>
      ))}
    </div>
  );
}

export function DashaTimeline({ chart }: { chart: NatalChart }) {
  const birth = chart.input.utc;
  const now = chart.currentDasha?.asOf ?? new Date().toISOString();
  const current = chart.currentDasha;
  const mds = chart.dasha.mahadashas.filter((m) => m.end > birth && ageAt(birth, m.start) < 100);

  return (
    <ol className="relative flex flex-col gap-2 border-l border-line pl-5">
      {mds.map((m) => {
        const isNow = current?.mahadasha.start === m.start;
        const isPast = m.end <= now;
        const start = m.start < birth ? birth : m.start;
        const progress = isNow
          ? (new Date(now).getTime() - new Date(m.start).getTime()) / (new Date(m.end).getTime() - new Date(m.start).getTime())
          : 0;
        return (
          <li key={m.start} className="relative">
            <span
              className={`absolute top-3 -left-[27px] size-3 rounded-full border-2 ${isNow ? "border-accent bg-accent" : isPast ? "border-line bg-line" : "border-line bg-bg"}`}
              aria-hidden
            />
            <div className={`rounded-xl px-3 py-2.5 ${isNow ? "border border-accent/60 bg-accent-soft" : ""}`}>
              <div className="flex items-baseline justify-between gap-3">
                <p className={`font-semibold ${isPast ? "text-muted" : ""}`}>
                  <span className="mr-1.5 text-accent" aria-hidden>
                    {GLYPH[m.lord]}
                  </span>
                  {m.lord} mahadasha
                  {isNow && <span className="ml-2 chip border-accent bg-surface text-accent">Now</span>}
                </p>
                <p className="shrink-0 text-xs text-muted tabular-nums">
                  {fmtMonth(start)} – {fmtMonth(m.end)}
                </p>
              </div>
              <p className="text-xs text-muted">
                Age {ageAt(birth, start)}–{ageAt(birth, m.end)} · {m.years} years
                {m.start < birth ? " (balance at birth)" : ""}
              </p>
              {isNow && current && (
                <>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface" aria-label={`${Math.round(progress * 100)}% complete`}>
                    <div className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
                  </div>
                  <p className="mt-2 text-sm">
                    Antardasha: <strong>{current.antardasha.lord}</strong> until {fmtDate(current.antardasha.end)}
                    <br />
                    Pratyantar: <strong>{current.pratyantar.lord}</strong> until {fmtDate(current.pratyantar.end)}
                  </p>
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer text-muted">All antardashas in this period</summary>
                    <ul className="mt-2 grid gap-1">
                      {m.antardashas.map((a) => (
                        <li
                          key={a.start}
                          className={`flex justify-between gap-3 rounded-lg px-2 py-1 ${a.start === current.antardasha.start ? "bg-surface font-semibold" : ""}`}
                        >
                          <span>
                            {m.lord}–{a.lord}
                          </span>
                          <span className="text-xs text-muted tabular-nums">
                            {fmtMonth(a.start)} – {fmtMonth(a.end)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const PHASE_ORDER = ["rising", "peak", "setting"] as const;

/** Joins pieces of one cycle that Saturn's retrograde split by less than a year, keeping the pauses. */
function groupCycles(cycles: SaturnCycle[]) {
  const YEAR = 365.25 * 86_400_000;
  const groups: { kind: SaturnCycle["kind"]; start: string; end: string; segments: SaturnCycle["segments"]; pauses: [string, string][] }[] = [];
  for (const c of cycles) {
    const last = groups.at(-1);
    if (last && last.kind === c.kind && new Date(c.start).getTime() - new Date(last.end).getTime() < YEAR) {
      last.pauses.push([last.end, c.start]);
      last.end = c.end;
      last.segments = [...last.segments, ...c.segments];
    } else {
      groups.push({ ...c, pauses: [] });
    }
  }
  return groups;
}

export function SaturnCycles({ chart }: { chart: NatalChart }) {
  const birth = chart.input.utc;
  const now = chart.currentDasha?.asOf ?? new Date().toISOString();
  const cycles = groupCycles(chart.saturnCycles).filter((c) => ageAt(birth, c.start) < 90);
  const ages = (a: number, b: number) => (a === b ? `age ${a}` : `age ${a}–${b}`);
  return (
    <ul className="grid gap-2">
      {cycles.map((c) => {
        const isNow = c.start <= now && now < c.end;
        const phases = PHASE_ORDER.filter((p) => c.segments.some((s) => s.phase === p));
        const label = c.kind === "sade_sati" ? "Sade Sati" : "Ashtama Shani";
        return (
          <li key={c.start} className={`card flex items-center justify-between gap-3 p-3.5 ${isNow ? "border-accent/60 bg-accent-soft" : ""} ${c.end < now ? "opacity-60" : ""}`}>
            <div>
              <p className="font-semibold">
                {label}
                {isNow && <span className="ml-2 chip border-accent bg-surface text-accent">Now</span>}
              </p>
              <p className="text-xs text-muted">
                {c.kind === "sade_sati" ? `Saturn around your Moon (${phases.join(" → ")})` : "Saturn 8th from your Moon"}
              </p>
              {c.pauses.map(([from, to]) => (
                <p key={from} className="text-xs text-muted">
                  Paused {fmtMonth(from)} – {fmtMonth(to)} while Saturn moved back
                </p>
              ))}
            </div>
            <p className="shrink-0 text-right text-xs text-muted tabular-nums">
              {fmtMonth(c.start)} – {fmtMonth(c.end)}
              <br />
              {ages(ageAt(birth, c.start), ageAt(birth, c.end))}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
