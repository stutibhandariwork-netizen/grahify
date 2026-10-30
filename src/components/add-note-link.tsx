import Link from "next/link";
import type { LinkType } from "@/lib/journal/core";

/** "Add a note" for any reading: opens the journal with that reading attached. */
export function AddNoteLink({ type, id = "", className = "" }: { type: LinkType; id?: string; className?: string }) {
  return (
    <Link href={`/journal/new?type=${type}&id=${encodeURIComponent(id)}`} className={`btn-ghost self-start ${className}`}>
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" strokeLinejoin="round" />
      </svg>
      Add a note
    </Link>
  );
}
