import Link from "next/link";
import Markdown from "react-markdown";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUserId } from "@/auth";
import { AddNoteLink } from "@/components/add-note-link";
import { ProseSkeleton } from "@/components/astrology/prose";
import { ClarifierButton } from "@/components/tarot/clarifier-button";
import { DeckPicker } from "@/components/tarot/deck-picker";
import { FlipCard } from "@/components/tarot/flip-card";
import { prisma } from "@/lib/db";
import type { LanguageCode } from "@/lib/profile";
import { getOrCreateTarotReading, type TarotReadingResult } from "@/lib/readings";
import { cardImage, DECK } from "@/lib/tarot/deck";
import { loadOwnSession, toView, type SessionView } from "@/lib/tarot/session";
import { spreadByKey } from "@/lib/tarot/spreads";

export const metadata = { title: "Tarot reading · Grahify" };

const SUMMARY_TITLE: Record<string, string> = { CARD_OF_DAY: "Today's message", YES_NO: "Why" };

export default async function TarotReadingPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const session = await loadOwnSession(userId, (await params).id);
  if (!session) notFound();
  const view = toView(session);
  const spread = spreadByKey(view.spread);

  let reading: Promise<TarotReadingResult> | null = null;
  if (view.complete) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { language: true } });
    reading = getOrCreateTarotReading(userId, session, view, user.language as LanguageCode);
  }

  return (
    <div className="flex flex-col gap-8 pt-4">
      <header>
        <Link href="/tarot" className="text-sm text-muted">
          ← Tarot
        </Link>
        <p className="eyebrow mt-4">{spread.title}</p>
        {view.question ? (
          <h1 className="mt-2 font-display text-2xl leading-snug font-semibold">“{view.question}”</h1>
        ) : (
          <h1 className="mt-2 font-display text-3xl font-semibold">{spread.title}</h1>
        )}
      </header>

      {/* The spread: one slot per position. */}
      <div className="flex justify-center gap-3">
        {spread.positions.map((p, i) => {
          const c = view.cards[i];
          return (
            <div key={p.name} className="flex flex-col items-center gap-2">
              {c ? (
                <FlipCard
                  seenKey={`${view.id}:${c.deckPosition}`}
                  image={cardImage(DECK[c.cardIndex])}
                  name={DECK[c.cardIndex].name}
                  reversed={c.reversed}
                  size={spread.positions.length > 1 ? "sm" : "md"}
                />
              ) : (
                <div
                  className={`${spread.positions.length > 1 ? "w-20" : "w-36 sm:w-44"} grid aspect-[100/172] place-items-center rounded-[7%] border-2 border-dashed border-line text-xs text-muted`}
                >
                  {i + 1}
                </div>
              )}
              <p className="max-w-24 text-center text-xs font-medium text-muted">{p.name}</p>
            </div>
          );
        })}
      </div>

      {!view.complete && (
        <DeckPicker
          sessionId={view.id}
          used={view.used}
          prompt={
            spread.positions.length > 1
              ? `Choose card ${view.cards.length + 1} of ${view.needed} · ${spread.positions[view.cards.length].name}`
              : "Choose your card"
          }
        />
      )}

      {view.complete && reading && (
        <>
          {view.verdict && (
            <div className="card flex flex-col items-center gap-1 border-accent/60 bg-accent-soft text-center">
              <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">The cards say</p>
              <p className="font-display text-5xl font-semibold">{view.verdict}</p>
              <p className="text-sm text-muted">
                {DECK[view.cards[0].cardIndex].name}, {view.cards[0].reversed ? "reversed" : "upright"}
              </p>
            </div>
          )}

          {view.cards.map((c, i) => (
            <CardDetail key={c.deckPosition} view={view} index={i} reading={reading} />
          ))}

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-semibold">{SUMMARY_TITLE[view.spread] ?? "Together"}</h2>
            <Suspense fallback={<ProseSkeleton />}>
              <Summary reading={reading} view={view} />
            </Suspense>
          </section>

          <AddNoteLink type="tarot" id={view.id} />

          <Suspense>
            <Preview reading={reading} />
          </Suspense>
        </>
      )}

      <p className="text-center text-xs text-muted">
        Deck shuffled with a secure random generator and saved at{" "}
        {new Date(view.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}, before you chose.
      </p>
    </div>
  );
}

function CardDetail({ view, index, reading }: { view: SessionView; index: number; reading: Promise<TarotReadingResult> }) {
  const c = view.cards[index];
  const card = DECK[c.cardIndex];
  const side = c.reversed ? card.reversed : card.upright;
  const clarifier = view.clarifiers.find((x) => x.forPick === index);
  return (
    <section className="card flex flex-col gap-4">
      <div className="flex gap-4">
        <FlipCard seenKey={`${view.id}:${c.deckPosition}:detail`} image={cardImage(card)} name={card.name} reversed={c.reversed} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-accent uppercase">{c.positionName}</p>
          <h2 className="font-display text-xl font-semibold">{card.name}</h2>
          <span className={`chip mt-1 ${c.reversed ? "text-warn" : "text-good"}`}>{c.reversed ? "Reversed" : "Upright"}</span>
          <p className="mt-2 text-xs text-muted">{side.keywords.join(" · ")}</p>
        </div>
      </div>
      <p className="text-sm text-muted">
        <span className="font-semibold text-ink">On the card: </span>
        {card.scene}
      </p>
      <Suspense fallback={<ProseSkeleton />}>
        <CardMeaning reading={reading} index={index} fallback={side.meaning} />
      </Suspense>

      {clarifier ? (
        <div className="flex gap-3 rounded-2xl bg-surface-2 p-3">
          <FlipCard
            seenKey={`${view.id}:${clarifier.deckPosition}`}
            image={cardImage(DECK[clarifier.cardIndex])}
            name={DECK[clarifier.cardIndex].name}
            reversed={clarifier.reversed}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wide text-accent uppercase">Clarifier</p>
            <p className="font-semibold">
              {DECK[clarifier.cardIndex].name}
              {clarifier.reversed ? " (reversed)" : ""}
            </p>
            <Suspense fallback={<ProseSkeleton />}>
              <ClarifierMeaning
                reading={reading}
                forPick={index}
                fallback={(clarifier.reversed ? DECK[clarifier.cardIndex].reversed : DECK[clarifier.cardIndex].upright).meaning}
              />
            </Suspense>
          </div>
        </div>
      ) : (
        <ClarifierButton sessionId={view.id} used={view.used} forPick={index} cardName={card.name} />
      )}
    </section>
  );
}

function Md({ children }: { children: string }) {
  return (
    <div className="prose-grahify">
      <Markdown>{children}</Markdown>
    </div>
  );
}

function PreviewNote({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[15px] leading-relaxed">{text}</p>
      <p className="text-xs text-muted">Traditional meaning. Claude will tailor this to the position and your question once an API key is added.</p>
    </div>
  );
}

async function CardMeaning({ reading, index, fallback }: { reading: Promise<TarotReadingResult>; index: number; fallback: string }) {
  const r = await reading;
  if (r.mode === "ready") return <Md>{r.content.cards[index]?.meaning ?? fallback}</Md>;
  if (r.mode === "error") return <p className="text-sm text-warn">{r.message}</p>;
  return <PreviewNote text={fallback} />;
}

async function ClarifierMeaning({ reading, forPick, fallback }: { reading: Promise<TarotReadingResult>; forPick: number; fallback: string }) {
  const r = await reading;
  const text = r.mode === "ready" ? r.content.clarifiers.find((c) => c.forPick === forPick)?.meaning : null;
  return text ? <Md>{text}</Md> : <p className="text-sm">{fallback}</p>;
}

async function Summary({ reading, view }: { reading: Promise<TarotReadingResult>; view: SessionView }) {
  const r = await reading;
  if (r.mode === "ready") return <Md>{r.content.summary}</Md>;
  if (r.mode === "error") return <p className="text-sm text-warn">{r.message}</p>;
  const first = DECK[view.cards[0].cardIndex];
  const text =
    view.spread === "YES_NO"
      ? `${first.name} leans ${first.nature === "maybe" ? "neither way" : first.nature}${view.cards[0].reversed ? ", and reversed it softens to a maybe" : ""}.`
      : view.spread === "CARD_OF_DAY"
        ? "Claude will write today's message once an API key is added."
        : "Claude will write how the cards read together once an API key is added.";
  return <p className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-muted">{text}</p>;
}

async function Preview({ reading }: { reading: Promise<TarotReadingResult> }) {
  const r = await reading;
  if (r.mode !== "preview") return null;
  return (
    <details className="card bg-surface-2">
      <summary className="cursor-pointer text-sm font-semibold">Preview mode: what Claude would be sent</summary>
      <pre className="mt-3 max-h-96 overflow-auto rounded-xl bg-surface p-3 text-xs whitespace-pre-wrap">{r.prompt}</pre>
    </details>
  );
}
