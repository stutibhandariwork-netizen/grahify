import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUserId } from "@/auth";
import { AskComposer } from "@/components/ask/composer";
import { fmtLocal } from "@/components/reading-bits";
import { decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/db";

export const metadata = { title: "Ask · Grahify" };

export default async function AskHome() {
  const userId = await requireUserId();
  const [profile, user, threads] = await Promise.all([
    prisma.profile.findFirst({ where: { userId }, select: { id: true } }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } }),
    prisma.chatThread.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { messages: { orderBy: { createdAt: "asc" }, take: 1 }, _count: { select: { messages: true } } },
    }),
  ]);
  if (!profile) redirect("/onboarding");

  return (
    <div className="flex flex-col gap-8 pt-4">
      <header>
        <p className="eyebrow">Your chart, your question</p>
        <h1 className="mt-2 font-display text-4xl font-semibold">Ask</h1>
        <p className="mt-2 text-muted">
          Answers come only from your own chart, current transits and dasha, plus a tarot card, your numbers or your notes
          if you include them.
        </p>
      </header>

      <AskComposer threadId={null} showSuggestions />

      {threads.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-semibold">Earlier questions</h2>
          <ul className="card divide-y divide-line p-0">
            {threads.map((t) => (
              <li key={t.id}>
                <Link href={`/ask/${t.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2">
                  <span className="min-w-0 truncate">{t.messages[0] ? decrypt(t.messages[0].contentEnc) : "Conversation"}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {fmtLocal(t.createdAt.toISOString(), user.timezone)}
                    {t._count.messages > 2 ? ` · ${t._count.messages / 2} questions` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
