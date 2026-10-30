"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { drawCard } from "@/app/tarot/actions";
import { CardBack } from "./card-back";

interface Props {
  sessionId: string;
  used: number[];
  /** Heading above the fan, e.g. "Choose card 2 of 3 · Challenge". */
  prompt: string;
  /** Set when drawing a clarifier for the card at this index. */
  clarifyPick?: number;
  onDone?: () => void;
}

/**
 * The face-down deck: tap a card in the fan (then confirm) or type its number.
 * The order was fixed on the server before this screen loaded.
 */
export function DeckPicker({ sessionId, used, prompt, clarifyPick, onDone }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const taken = new Set(used);
  const positions = Array.from({ length: 78 }, (_, i) => i + 1).filter((p) => !taken.has(p));

  function draw(position: number) {
    setError(null);
    startTransition(async () => {
      const result = await drawCard(sessionId, position, clarifyPick);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSelected(null);
      setTyped("");
      onDone?.();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center font-display text-lg font-semibold">{prompt}</p>

      <div className="-mx-4 overflow-x-auto px-4 pt-6 pb-3 [scrollbar-width:thin]" role="listbox" aria-label="Face-down cards">
        <div className="flex w-max pr-8 pl-2">
          {positions.map((p, i) => {
            const isSel = selected === p;
            return (
              <button
                key={p}
                type="button"
                role="option"
                aria-selected={isSel}
                aria-label={`Card ${p}`}
                onClick={() => setSelected(isSel ? null : p)}
                className={`group relative -ml-7 w-14 shrink-0 first:ml-0 focus-visible:outline-none ${isSel ? "z-10" : ""}`}
                style={{ rotate: `${((i % 9) - 4) * 0.6}deg` }}
              >
                <span className={`block transition-transform duration-200 ${isSel ? "-translate-y-5" : "group-hover:-translate-y-2"}`}>
                  <CardBack
                    className={`w-14 ${isSel ? "drop-shadow-[0_0_10px_rgba(229,180,94,.7)]" : "drop-shadow"} group-focus-visible:drop-shadow-[0_0_8px_rgba(229,180,94,.9)]`}
                  />
                </span>
                <span className={`mt-1 block text-center text-[10px] tabular-nums ${isSel ? "font-bold text-accent" : "text-muted"}`}>{p}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button className="btn w-full max-w-xs" disabled={selected === null || pending} onClick={() => selected && draw(selected)}>
          {pending ? "Turning the card…" : selected ? `Draw card ${selected}` : "Tap a card in the fan"}
        </button>
        <form
          className="flex items-center gap-2 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(typed);
            if (typed) draw(n);
          }}
        >
          <label htmlFor={`num-${clarifyPick ?? "main"}`} className="text-muted">
            or type a number
          </label>
          <input
            id={`num-${clarifyPick ?? "main"}`}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            value={typed}
            onChange={(e) => setTyped(e.target.value.replace(/\D/g, ""))}
            className="field w-16 px-2 py-2 text-center"
            placeholder="1–78"
          />
          <button className="btn-ghost min-h-10 px-4" disabled={!typed || pending}>
            Draw
          </button>
        </form>
        {error && <p className="text-sm text-warn" role="alert">{error}</p>}
      </div>
    </div>
  );
}
