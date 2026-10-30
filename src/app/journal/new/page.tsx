import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUserId } from "@/auth";
import { dailyFacts } from "@/lib/astrology/daily";
import { prisma } from "@/lib/db";
import { isLinkType, journalPrompt, SECTION_LABEL, LINK_SECTION } from "@/lib/journal/core";
import { resolveLink } from "@/lib/journal/server";
import { loadPrimaryProfile } from "@/lib/profile";
import { localDay } from "@/lib/time";
import { createEntry } from "../actions";

export const metadata = { title: "New journal entry · Grahify" };

export default async function NewEntry({ searchParams }: { searchParams: Promise<{ type?: string; id?: string; error?: string }> }) {
  const userId = await requireUserId();
  const [profile, user] = await Promise.all([
    loadPrimaryProfile(userId),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } }),
  ]);
  if (!profile) redirect("/onboarding");
  const { type = "", id = "", error } = await searchParams;

  const link = type && isLinkType(type) ? await resolveLink(userId, profile, type, id, user.timezone) : null;
  if (type && !link) redirect("/journal/new");
  const today = localDay(new Date(), user.timezone);
  const prompt = link ? null : journalPrompt(dailyFacts(profile.chart, today.start, today.date));

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 pt-4">
      <Link href="/journal" className="text-sm text-muted">
        ← Journal
      </Link>
      <h1 className="font-display text-3xl font-semibold">{link ? "Add a note" : "Write"}</h1>

      {link && (
        <div className="card flex flex-col gap-1 bg-surface-2">
          <p className="eyebrow">{SECTION_LABEL[LINK_SECTION[type as keyof typeof LINK_SECTION]]}</p>
          <p className="font-semibold">{link.title}</p>
          <p className="text-sm text-muted">{link.summary}</p>
        </div>
      )}

      <form action={createEntry} className="flex flex-col gap-4">
        {link && (
          <>
            <input type="hidden" name="linkType" value={type} />
            <input type="hidden" name="linkId" value={id} />
          </>
        )}
        {prompt && (
          <div className="rounded-2xl border border-accent/50 bg-accent-soft p-4">
            <p className="eyebrow">Today&apos;s prompt</p>
            <p className="mt-1 font-display text-lg">{prompt}</p>
            <label className="mt-3 flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" name="prompt" value={prompt} defaultChecked className="size-4 accent-[var(--primary)]" />
              I&apos;m answering this prompt
            </label>
          </div>
        )}
        <div>
          <label htmlFor="text" className="label">
            {link ? "How does this sit with you? What happened?" : "Your entry"}
          </label>
          <textarea id="text" name="text" rows={8} required className="field resize-y" placeholder="Write freely. Only you can read this." />
          {error === "empty" && <p className="mt-1.5 text-sm text-warn">Write something first.</p>}
        </div>
        <button className="btn">Save</button>
        <p className="text-center text-xs text-muted">Journal entries are encrypted. They are only shared with Claude if you choose to include them in Ask.</p>
      </form>
    </div>
  );
}
