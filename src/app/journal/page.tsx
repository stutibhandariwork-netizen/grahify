import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUserId } from "@/auth";
import { fmtLocal } from "@/components/reading-bits";
import { dailyFacts } from "@/lib/astrology/daily";
import { prisma } from "@/lib/db";
import { filterTimeline, journalPrompt, SECTION_LABEL, type Section } from "@/lib/journal/core";
import { loadTimeline } from "@/lib/journal/server";
import { loadPrimaryProfile } from "@/lib/profile";
import { localDay } from "@/lib/time";
import { deleteEntry } from "./actions";

export const metadata = { title: "Journal · Grahify" };

const SECTIONS = Object.keys(SECTION_LABEL) as Section[];
const month = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; from?: string; to?: string; q?: string; saved?: string }>;
}) {
  const userId = await requireUserId();
  const [profile, user] = await Promise.all([
    loadPrimaryProfile(userId),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } }),
  ]);
  if (!profile) redirect("/onboarding");
  const tz = user.timezone;
  const params = await searchParams;
  const section = SECTIONS.includes(params.section as Section) ? (params.section as Section) : undefined;
  const isDate = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);
  const filter = { section, from: isDate(params.from), to: isDate(params.to), q: params.q?.slice(0, 100) };
  const filtering = !!(filter.section || filter.from || filter.to || filter.q);

  const today = localDay(new Date(), tz);
  const prompt = journalPrompt(dailyFacts(profile.chart, today.start, today.date));
  const all = await loadTimeline(userId, profile, tz);
  const items = filterTimeline(all, filter);

  const groups = new Map<string, typeof items>();
  for (const i of items) {
    const key = month.format(new Date(`${i.date}T12:00:00Z`));
    groups.set(key, [...(groups.get(key) ?? []), i]);
  }

  return (
    <div className="flex flex-col gap-8 pt-4">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Look back</p>
          <h1 className="mt-2 font-display text-4xl font-semibold">Journal</h1>
        </div>
        <Link href="/journal/new" className="btn px-5">
          Write
        </Link>
      </header>

      {params.saved && <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm">Saved to your journal.</p>}

      <Link href="/journal/new" className="card flex flex-col gap-1 border-accent/50 bg-accent-soft hover:opacity-90">
        <span className="eyebrow">Today&apos;s prompt</span>
        <span className="font-display text-lg">{prompt}</span>
      </Link>

      <form method="get" className="card flex flex-col gap-3 p-4">
        <div className="flex gap-2">
          <label htmlFor="q" className="sr-only">
            Search
          </label>
          <input id="q" name="q" defaultValue={filter.q} placeholder="Search readings and notes" className="field" />
          <button className="btn-ghost shrink-0">Search</button>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Section</span>
            <select name="section" defaultValue={section ?? ""} className="field px-2 py-2 text-sm">
              <option value="">All</option>
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {SECTION_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">From</span>
            <input type="date" name="from" defaultValue={filter.from} className="field px-2 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">To</span>
            <input type="date" name="to" defaultValue={filter.to} className="field px-2 py-2 text-sm" />
          </label>
        </div>
        {filtering && (
          <Link href="/journal" className="text-xs text-muted underline">
            Clear filters
          </Link>
        )}
      </form>

      {items.length === 0 ? (
        <p className="text-center text-sm text-muted">
          {filtering ? "Nothing matches these filters." : "Your readings and notes will appear here. Start with today's prompt."}
        </p>
      ) : (
        [...groups].map(([label, group]) => (
          <section key={label} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-muted">{label}</h2>
            <ol className="relative flex flex-col gap-3 border-l border-line pl-4">
              {group.map((i) => (
                <li key={i.key} className="relative">
                  <span aria-hidden className={`absolute top-5 -left-[21px] size-2.5 rounded-full ${i.notes.length ? "bg-accent" : "bg-line"}`} />
                  <article className="card flex flex-col gap-2 p-4">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted">
                      <span className="chip">{SECTION_LABEL[i.section]}</span>
                      <time dateTime={i.date}>{fmtLocal(`${i.date}T12:00:00Z`, "UTC")}</time>
                    </div>
                    {i.href ? (
                      <Link href={i.href} className="font-semibold hover:text-accent">
                        {i.title}
                      </Link>
                    ) : (
                      <p className="font-semibold">{i.title}</p>
                    )}
                    {i.summary && <p className="text-sm text-muted">{i.summary}</p>}
                    {i.notes.map((n) => (
                      <div key={n.id} className="mt-1 rounded-xl border-l-2 border-accent bg-surface-2 px-3 py-2">
                        <p className="text-sm whitespace-pre-wrap">{n.text}</p>
                        <div className="mt-1 flex items-center justify-between text-xs text-muted">
                          <span>Note · {fmtLocal(n.createdAt, tz)}</span>
                          <form action={deleteEntry}>
                            <input type="hidden" name="id" value={n.id} />
                            <button className="underline hover:text-warn" aria-label="Delete this note">
                              Delete
                            </button>
                          </form>
                        </div>
                      </div>
                    ))}
                    {!i.key.startsWith("free:") && (
                      <Link
                        href={`/journal/new?type=${i.key.split(":")[0]}&id=${encodeURIComponent(i.key.slice(i.key.indexOf(":") + 1))}`}
                        className="text-xs font-medium text-accent"
                      >
                        + Add a note
                      </Link>
                    )}
                  </article>
                </li>
              ))}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}
