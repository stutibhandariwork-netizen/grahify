"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { askQuestion } from "@/app/ask/actions";

const SUGGESTIONS = [
  "Is this a good month to change jobs?",
  "What should I focus on in love this year?",
  "Why has work felt so heavy lately?",
];

/** Question box with options. Shows the question and a waiting state while the answer is written. */
export function AskComposer({ threadId, showSuggestions = false }: { threadId: string | null; showSuggestions?: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [opts, setOpts] = useState({ tarot: false, numerology: false, journal: false });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(question: string) {
    if (!question.trim() || pending) return;
    setError(null);
    setPendingQuestion(question);
    startTransition(async () => {
      const r = await askQuestion({ threadId, question, ...opts });
      if (!r.ok) {
        setError(r.error);
        setPendingQuestion(null);
        return;
      }
      setText("");
      setPendingQuestion(null);
      if (threadId) router.refresh();
      else router.push(`/ask/${r.threadId}`);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {pendingQuestion && (
        <>
          <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-ink">{pendingQuestion}</p>
          <div className="card flex items-center gap-3 p-4 text-sm text-muted" role="status">
            <span className="flex gap-1" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </span>
            Reading your chart…
          </div>
        </>
      )}

      {showSuggestions && !pendingQuestion && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="chip hover:border-accent/60" onClick={() => setText(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="card flex flex-col gap-3 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
      >
        <label htmlFor="question" className="sr-only">
          Your question
        </label>
        <textarea
          id="question"
          rows={2}
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(text);
            }
          }}
          placeholder={threadId ? "Ask a follow-up…" : "Ask anything about your life, timing or a decision…"}
          className="field resize-none border-0 bg-transparent px-1 py-1 focus:ring-0"
        />
        <div className="flex items-end justify-between gap-2">
          <fieldset className="flex flex-wrap gap-1.5">
            <legend className="sr-only">Include</legend>
            {(
              [
                ["tarot", "Pull a tarot card"],
                ["numerology", "My numbers"],
                ["journal", "My journal notes"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="chip cursor-pointer select-none has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-ink">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={opts[key]}
                  onChange={(e) => setOpts((o) => ({ ...o, [key]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
          </fieldset>
          <button className="btn shrink-0 px-5" disabled={!text.trim() || pending}>
            Ask
          </button>
        </div>
      </form>
      {error && (
        <p className="text-sm text-warn" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
