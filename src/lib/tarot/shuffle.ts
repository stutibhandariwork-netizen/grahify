import { randomInt } from "node:crypto";

export const DECK_SIZE = 78;
export const REVERSAL_PERCENT = 30;

/**
 * Fisher-Yates shuffle with a cryptographically secure RNG; each card has a
 * 30% chance of being reversed. Done once per reading, saved before any pick.
 */
export function shuffleDeck(rand: (max: number) => number = randomInt): { order: number[]; reversals: boolean[] } {
  const order = Array.from({ length: DECK_SIZE }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  const reversals = order.map(() => rand(100) < REVERSAL_PERCENT);
  return { order, reversals };
}

export interface DrawState {
  deckOrder: number[];
  reversals: boolean[];
  picks: number[]; // 1-based positions in the face-down deck
  clarifiers: { forPick: number; position: number }[];
}

/** The card at a 1-based position of the shuffled deck. */
export function cardAt(state: Pick<DrawState, "deckOrder" | "reversals">, position: number) {
  return { cardIndex: state.deckOrder[position - 1], reversed: state.reversals[position - 1] };
}

export function usedPositions(state: Pick<DrawState, "picks" | "clarifiers">): Set<number> {
  return new Set([...state.picks, ...state.clarifiers.map((c) => c.position)]);
}

export type PickError = "out_of_range" | "already_drawn" | "spread_complete" | "not_complete" | "bad_target";

/** Validates a main pick. Returns an error code, or null if the pick is allowed. */
export function checkPick(state: DrawState, position: number, needed: number): PickError | null {
  if (!Number.isInteger(position) || position < 1 || position > DECK_SIZE) return "out_of_range";
  if (state.picks.length >= needed) return "spread_complete";
  if (usedPositions(state).has(position)) return "already_drawn";
  return null;
}

/** Validates a clarifier pick for the card at `forPick` (0-based index into picks). */
export function checkClarifier(state: DrawState, forPick: number, position: number, needed: number): PickError | null {
  if (state.picks.length < needed) return "not_complete";
  if (!Number.isInteger(forPick) || forPick < 0 || forPick >= state.picks.length) return "bad_target";
  if (state.clarifiers.some((c) => c.forPick === forPick)) return "bad_target";
  if (!Number.isInteger(position) || position < 1 || position > DECK_SIZE) return "out_of_range";
  if (usedPositions(state).has(position)) return "already_drawn";
  return null;
}
