import Markdown from "react-markdown";
import { Suspense } from "react";
import { ProseSkeleton } from "@/components/astrology/prose";
import type { CachedResult } from "@/lib/readings";

export function Md({ children }: { children: string }) {
  return (
    <div className="prose-grahify">
      <Markdown>{children}</Markdown>
    </div>
  );
}

/**
 * One piece of a Claude reading, streamed in when ready. In preview mode shows
 * `placeholder` (or nothing when it is null).
 */
export function ClaudeText<T>({
  reading,
  pick,
  placeholder = "Claude will write this once an API key is added.",
  label,
}: {
  reading: Promise<CachedResult<T>>;
  pick: (content: T) => string | undefined;
  placeholder?: string | null;
  /** Shown above the text, only when there is text. */
  label?: React.ReactNode;
}) {
  return (
    <Suspense fallback={<ProseSkeleton />}>
      <ClaudeTextBody reading={reading} pick={pick} placeholder={placeholder} label={label} />
    </Suspense>
  );
}

async function ClaudeTextBody<T>({
  reading,
  pick,
  placeholder,
  label,
}: {
  reading: Promise<CachedResult<T>>;
  pick: (content: T) => string | undefined;
  placeholder: string | null;
  label?: React.ReactNode;
}) {
  const r = await reading;
  if (r.mode === "ready") {
    const text = pick(r.content);
    return text ? (
      <div>
        {label}
        <Md>{text}</Md>
      </div>
    ) : null;
  }
  if (r.mode === "error") return <p className="text-sm text-warn">{r.message}{r.retryable ? " Reload to try again." : ""}</p>;
  return placeholder ? <p className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-muted">{placeholder}</p> : null;
}

export function PreviewPanel<T>({ reading }: { reading: Promise<CachedResult<T>> }) {
  return (
    <Suspense>
      <PreviewBody reading={reading} />
    </Suspense>
  );
}

async function PreviewBody<T>({ reading }: { reading: Promise<CachedResult<T>> }) {
  const r = await reading;
  if (r.mode !== "preview") return null;
  return (
    <details className="card bg-surface-2">
      <summary className="cursor-pointer text-sm font-semibold">Preview mode: what Claude would be sent</summary>
      <p className="mt-2 text-sm text-muted">Everything here was calculated by the engine. Claude only interprets it.</p>
      <pre className="mt-3 max-h-96 overflow-auto rounded-xl bg-surface p-3 text-xs whitespace-pre-wrap">{r.prompt}</pre>
    </details>
  );
}

/** Date (and optionally time) in the reader's own time zone. */
export function fmtLocal(iso: string, timeZone: string, withTime = false): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    timeZone,
  }).format(new Date(iso));
}

export function fmtTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(iso));
}

export const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;
