import Markdown from "react-markdown";
import type { BaseReport } from "@/lib/llm/base-report";
import type { BaseReportResult } from "@/lib/readings";

/** One section of Claude's report. Awaits the shared report promise inside a Suspense boundary. */
export async function Prose({ report, field }: { report: Promise<BaseReportResult>; field: keyof BaseReport }) {
  const r = await report;
  if (r.mode === "ready") {
    return (
      <div className="prose-grahify">
        <Markdown>{r.report[field]}</Markdown>
      </div>
    );
  }
  if (r.mode === "error") {
    return <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">{r.message}{r.retryable ? " Reload the page to try again." : ""}</p>;
  }
  return (
    <p className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-muted">
      Claude will write this part in your language once an API key is added. See the preview at the bottom.
    </p>
  );
}

export function ProseSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-2" aria-label="Writing your reading">
      <div className="h-3 w-full rounded bg-surface-2" />
      <div className="h-3 w-11/12 rounded bg-surface-2" />
      <div className="h-3 w-4/5 rounded bg-surface-2" />
    </div>
  );
}

export async function PromptPreview({ report }: { report: Promise<BaseReportResult> }) {
  const r = await report;
  if (r.mode !== "preview") return null;
  return (
    <details className="card bg-surface-2">
      <summary className="cursor-pointer text-sm font-semibold">Preview mode: what Claude would be sent</summary>
      <p className="mt-2 text-sm text-muted">
        No ANTHROPIC_API_KEY is set, so nothing was sent. Everything below comes from the calculation engine; Claude only
        interprets it.
      </p>
      <h3 className="mt-4 text-xs font-semibold tracking-wide text-muted uppercase">System prompt (shared, cached)</h3>
      <pre className="mt-1 max-h-80 overflow-auto rounded-xl bg-surface p-3 text-xs whitespace-pre-wrap">{r.system}</pre>
      <h3 className="mt-4 text-xs font-semibold tracking-wide text-muted uppercase">Request</h3>
      <pre className="mt-1 max-h-96 overflow-auto rounded-xl bg-surface p-3 text-xs whitespace-pre-wrap">{r.prompt}</pre>
    </details>
  );
}
