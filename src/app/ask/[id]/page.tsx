import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserId } from "@/auth";
import { AddNoteLink } from "@/components/add-note-link";
import { AskComposer } from "@/components/ask/composer";
import { GLYPH } from "@/components/astrology/format";
import { Md } from "@/components/reading-bits";
import { decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import type { Graha } from "@/lib/engine";
import { cardImage, DECK } from "@/lib/tarot/deck";
import { deleteThread, type AnswerBasis } from "../actions";

export const metadata = { title: "Ask · Grahify" };

export default async function Thread({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const thread = await prisma.chatThread.findFirst({
    where: { id: (await params).id, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!thread) notFound();

  return (
    <div className="flex flex-col gap-5 pt-4">
      <div className="flex items-center justify-between">
        <Link href="/ask" className="text-sm text-muted">
          ← Ask
        </Link>
        <form action={deleteThread}>
          <input type="hidden" name="id" value={thread.id} />
          <button className="text-xs text-muted underline hover:text-warn">Delete conversation</button>
        </form>
      </div>

      {thread.messages.map((m) =>
        m.role === "user" ? (
          <p key={m.id} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm whitespace-pre-wrap text-primary-ink">
            {decrypt(m.contentEnc)}
          </p>
        ) : (
          <Answer key={m.id} id={m.id} text={decrypt(m.contentEnc)} basis={m.basis as unknown as AnswerBasis} />
        ),
      )}

      <div className="sticky bottom-20 sm:bottom-4">
        <AskComposer threadId={thread.id} />
      </div>
    </div>
  );
}

function Answer({ id, text, basis }: { id: string; text: string; basis: AnswerBasis }) {
  const card = basis.tarot && DECK[basis.tarot.cardIndex];
  return (
    <article className="card flex flex-col gap-4">
      {card && (
        <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-2.5">
          <div className="relative aspect-[100/172] w-10 shrink-0 overflow-hidden rounded">
            <Image src={cardImage(card)} alt="" fill sizes="40px" className={`object-cover ${basis.tarot!.reversed ? "rotate-180" : ""}`} />
          </div>
          <p className="text-sm">
            You drew <strong>{card.name}</strong>
            {basis.tarot!.reversed ? ", reversed" : ""}
          </p>
        </div>
      )}
      <Md>{text}</Md>
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">{basis.preview ? "Would be based on" : "Based on"}</p>
        <div className="flex flex-wrap gap-1.5">
          {basis.planets.map((p) => (
            <span key={p} className="chip border-accent/40 bg-accent-soft text-ink">
              {GLYPH[p as Graha] ?? ""} {p}
            </span>
          ))}
          {basis.periods.map((p) => (
            <span key={p} className="chip">
              {p}
            </span>
          ))}
          {basis.numerology && (
            <span className="chip">
              Numbers: birth {basis.numerology.birth} · life path {basis.numerology.lifePath} · day {basis.numerology.personalDay}
            </span>
          )}
          {basis.journal && <span className="chip">Your recent journal notes</span>}
        </div>
      </div>
      {!basis.preview && <AddNoteLink type="answer" id={id} />}
    </article>
  );
}
