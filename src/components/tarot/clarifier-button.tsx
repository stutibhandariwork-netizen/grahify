"use client";

import { useState } from "react";
import { DeckPicker } from "./deck-picker";

/** "Draw a clarifier" for one card; opens the deck inline. */
export function ClarifierButton({ sessionId, used, forPick, cardName }: { sessionId: string; used: number[]; forPick: number; cardName: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button className="btn-ghost self-start" onClick={() => setOpen(true)}>
        Draw a clarifier card
      </button>
    );
  }
  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-4">
      <DeckPicker sessionId={sessionId} used={used} prompt={`Choose a clarifier for ${cardName}`} clarifyPick={forPick} onDone={() => setOpen(false)} />
      <button className="mt-2 w-full text-center text-sm text-muted underline" onClick={() => setOpen(false)}>
        Cancel
      </button>
    </div>
  );
}
