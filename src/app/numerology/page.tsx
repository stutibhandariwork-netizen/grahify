import Markdown from "react-markdown";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUserId } from "@/auth";
import { AddNoteLink } from "@/components/add-note-link";
import { ProseSkeleton } from "@/components/astrology/prose";
import { prisma } from "@/lib/db";
import { utcOffsetMinutes } from "@/lib/engine";
import { numerologyInput } from "@/lib/llm/numerology";
import { letterValues, type NameSystem } from "@/lib/numerology/calc";
import { NUMBER_MEANINGS, numerologyProfile, PERSONAL_YEAR } from "@/lib/numerology/meanings";
import { loadPrimaryProfile, type LanguageCode } from "@/lib/profile";
import { getOrCreateNumerologyReading, type NumerologyReadingResult } from "@/lib/readings";

export const metadata = { title: "Numerology · Grahify" };

const SWATCH: Record<string, string> = {
  gold: "#d4a017",
  orange: "#e8812e",
  white: "#f7f4ee",
  silver: "#c0c0c8",
  yellow: "#f2cc2f",
  saffron: "#f4a12a",
  grey: "#8a8a94",
  "electric blue": "#2f6bff",
  green: "#3a9d5d",
  pink: "#f2a6c2",
  "light blue": "#9cc7f2",
  "light green": "#a8dba0",
  "dark blue": "#1f2e6b",
  black: "#151515",
  red: "#cc2f2f",
  coral: "#f07a63",
};

export default async function NumerologyPage({ searchParams }: { searchParams: Promise<{ system?: string; name?: string }> }) {
  const userId = await requireUserId();
  const [profile, user] = await Promise.all([
    loadPrimaryProfile(userId),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { language: true, timezone: true } }),
  ]);
  if (!profile) redirect("/onboarding");

  const params = await searchParams;
  const system: NameSystem = params.system === "pythagorean" ? "pythagorean" : "chaldean";
  const name = (params.name ?? profile.birth.name).trim().slice(0, 80) || profile.birth.name;

  const now = new Date();
  const local = new Date(now.getTime() + utcOffsetMinutes(user.timezone, now) * 60_000);
  const today = { year: local.getUTCFullYear(), month: local.getUTCMonth() + 1, day: local.getUTCDate() };
  const [y, m, d] = profile.birth.birthDate.split("-").map(Number);
  const p = numerologyProfile({ year: y, month: m, day: d }, name, system, today);

  const input = numerologyInput(p, profile.birth.name.split(" ")[0], user.language as LanguageCode);
  const reading = getOrCreateNumerologyReading(
    userId,
    profile.id,
    input,
    user.language as LanguageCode,
    new Date(Date.UTC(today.year, today.month - 1, today.day)),
  );

  const core = [
    { label: "Birth number", aka: "Mulank · psychic number", n: p.birth.value, from: `Day ${p.birth.compound}` },
    { label: "Life path", aka: "Bhagyank", n: p.lifePath.value, from: `${d}/${m}/${y} → ${p.lifePath.compound}` },
    ...(p.name ? [{ label: "Name number", aka: `Namank · ${system}`, n: p.name.value, from: `“${name}” → ${p.name.compound}` }] : []),
  ];

  return (
    <div className="flex flex-col gap-10 pt-4">
      <header>
        <p className="eyebrow">Your numbers</p>
        <h1 className="mt-2 font-display text-4xl font-semibold">Numerology</h1>
        <p className="mt-2 text-muted">From your date of birth and your name.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        {core.map((c) => {
          const meaning = NUMBER_MEANINGS[c.n];
          return (
            <div key={c.label} className="card flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{c.label}</p>
                  <p className="text-xs text-muted">{c.aka}</p>
                </div>
                <p className="font-display text-5xl leading-none font-semibold text-accent">{c.n}</p>
              </div>
              <p className="font-display text-lg font-semibold">{meaning.title}</p>
              <p className="text-sm">{meaning.gifts}</p>
              <p className="text-xs text-muted">Watch for: {meaning.watch}</p>
              <p className="mt-auto pt-1 text-xs text-muted">
                {c.from}
                {meaning.planet ? ` · ruled by ${meaning.planet}` : ""}
              </p>
            </div>
          );
        })}
      </section>

      <Prose reading={reading} field="core" />

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-semibold">Your name</h2>
        <form className="card flex flex-col gap-4" method="get">
          <div>
            <label htmlFor="name" className="label">
              Name to calculate
            </label>
            <input id="name" name="name" defaultValue={name} className="field" />
            <p className="hint">Try the spelling you use day to day. Only English letters are counted.</p>
          </div>
          <fieldset className="grid grid-cols-2 gap-1 rounded-full border border-line bg-surface-2 p-1 text-sm">
            <legend className="sr-only">System</legend>
            {(["chaldean", "pythagorean"] as const).map((s) => (
              <label
                key={s}
                className="cursor-pointer rounded-full px-3 py-2 text-center font-medium text-muted has-[:checked]:bg-surface has-[:checked]:text-ink has-[:checked]:shadow-sm"
              >
                <input type="radio" name="system" value={s} defaultChecked={s === system} className="sr-only" />
                {s === "chaldean" ? "Chaldean" : "Pythagorean"}
              </label>
            ))}
          </fieldset>
          <button className="btn-ghost">Recalculate</button>
        </form>

        {p.name ? (
          <div className="flex flex-wrap gap-1.5" aria-label="Letter values">
            {letterValues(name, system).map((l, i) => (
              <span key={i} className="flex w-8 flex-col items-center rounded-lg border border-line bg-surface py-1">
                <span className="text-sm font-semibold">{l.letter}</span>
                <span className="text-xs text-accent tabular-nums">{l.value}</span>
              </span>
            ))}
            <span className="ml-1 self-center text-sm text-muted">
              = {p.name.compound} → <strong className="text-ink">{p.name.value}</strong>
            </span>
          </div>
        ) : (
          <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
            Name numbers use English letters. Type your name in English above to calculate it.
          </p>
        )}
        <p className="text-xs text-muted">
          {system === "chaldean"
            ? "Chaldean (common in India) values letters 1–8 by sound; 9 is held sacred and not used."
            : "Pythagorean values A–Z as 1–9 in order and keeps master numbers 11, 22 and 33."}
        </p>
        {p.name && <Prose reading={reading} field="name" />}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-semibold">Right now</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["Personal year", p.personal.year, String(today.year)],
            ["Personal month", p.personal.month, local.toLocaleString("en-IN", { month: "long", timeZone: "UTC" })],
            ["Personal day", p.personal.day, "Today"],
          ].map(([label, n, when]) => (
            <div key={label as string} className="card flex flex-col items-center gap-1 p-3 text-center">
              <p className="font-display text-4xl font-semibold text-accent">{n}</p>
              <p className="text-xs font-semibold">{label}</p>
              <p className="text-xs text-muted">{when}</p>
            </div>
          ))}
        </div>
        <p className="text-sm">
          <strong>This year: </strong>
          {PERSONAL_YEAR[p.personal.year]}
        </p>
        <Prose reading={reading} field="cycles" />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-semibold">Lucky for you</h2>
        <div className="card grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="font-display text-3xl font-semibold text-accent">{p.lucky.number}</p>
            <p className="text-xs text-muted">Number</p>
            <p className="mt-1 text-xs">also {p.lucky.supportive.join(", ")}</p>
          </div>
          <div>
            <p className="font-display text-xl font-semibold">{p.lucky.day}</p>
            <p className="text-xs text-muted">Day</p>
          </div>
          <div>
            <div className="flex justify-center gap-1.5">
              {p.lucky.colours.map((c) => (
                <span key={c} className="size-7 rounded-full border border-line" style={{ background: SWATCH[c] }} title={c} />
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">{p.lucky.colours.join(", ")}</p>
          </div>
        </div>
        <p className="text-xs text-muted">
          Traditional associations of your birth number&apos;s planet, {p.lucky.planet}.
        </p>
      </section>

      <AddNoteLink type="numerology" id={p.personal.on} />
      <Suspense>
        <Preview reading={reading} />
      </Suspense>
    </div>
  );
}

function Prose({ reading, field }: { reading: Promise<NumerologyReadingResult>; field: "core" | "name" | "cycles" }) {
  return (
    <Suspense fallback={<ProseSkeleton />}>
      <ProseBody reading={reading} field={field} />
    </Suspense>
  );
}

async function ProseBody({ reading, field }: { reading: Promise<NumerologyReadingResult>; field: "core" | "name" | "cycles" }) {
  const r = await reading;
  if (r.mode === "ready") {
    return r.reading[field] ? (
      <div className="prose-grahify">
        <Markdown>{r.reading[field]}</Markdown>
      </div>
    ) : null;
  }
  if (r.mode === "error") return <p className="text-sm text-warn">{r.message}</p>;
  return (
    <p className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-muted">
      Claude will write a personal reading of these numbers once an API key is added.
    </p>
  );
}

async function Preview({ reading }: { reading: Promise<NumerologyReadingResult> }) {
  const r = await reading;
  if (r.mode !== "preview") return null;
  return (
    <details className="card bg-surface-2">
      <summary className="cursor-pointer text-sm font-semibold">Preview mode: what Claude would be sent</summary>
      <pre className="mt-3 max-h-96 overflow-auto rounded-xl bg-surface p-3 text-xs whitespace-pre-wrap">{r.prompt}</pre>
    </details>
  );
}
