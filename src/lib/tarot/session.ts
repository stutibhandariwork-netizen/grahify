import "server-only";
import type { TarotSession } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DECK } from "./deck";
import { cardAt, usedPositions, type DrawState } from "./shuffle";
import { spreadByKey, yesNoVerdict, type SpreadKey, type Verdict } from "./spreads";

export interface DrawnCard {
  deckPosition: number; // 1-78, the face-down slot the person chose
  cardIndex: number;
  reversed: boolean;
}

/** What the client may see: only revealed cards, never the deck order. */
export interface SessionView {
  id: string;
  spread: SpreadKey;
  question: string | null;
  createdAt: string;
  cards: (DrawnCard & { positionName: string })[];
  clarifiers: (DrawnCard & { forPick: number })[];
  needed: number;
  complete: boolean;
  /** Face-down slots already taken, so the fan can hide them. */
  used: number[];
  verdict: Verdict | null;
}

export function drawState(s: TarotSession): DrawState {
  return {
    deckOrder: s.deckOrder,
    reversals: s.reversals,
    picks: s.picks,
    clarifiers: (s.clarifiers as { forPick: number; position: number }[]) ?? [],
  };
}

export function toView(s: TarotSession): SessionView {
  const spread = spreadByKey(s.spread);
  const state = drawState(s);
  const cards = state.picks.map((position, i) => ({
    deckPosition: position,
    ...cardAt(state, position),
    positionName: spread.positions[i].name,
  }));
  const needed = spread.positions.length;
  return {
    id: s.id,
    spread: s.spread,
    question: s.question,
    createdAt: s.createdAt.toISOString(),
    cards,
    clarifiers: state.clarifiers.map((c) => ({ deckPosition: c.position, ...cardAt(state, c.position), forPick: c.forPick })),
    needed,
    complete: cards.length >= needed,
    used: [...usedPositions(state)],
    verdict: s.spread === "YES_NO" && cards[0] ? yesNoVerdict(DECK[cards[0].cardIndex], cards[0].reversed) : null,
  };
}

/** The session if it belongs to this user, else null. */
export async function loadOwnSession(userId: string, id: string) {
  const s = await prisma.tarotSession.findUnique({ where: { id }, include: { profile: { select: { userId: true } } } });
  return s && s.profile.userId === userId ? s : null;
}
