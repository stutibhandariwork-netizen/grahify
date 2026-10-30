import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserId } from "@/auth";
import { spreadBySlug } from "@/lib/tarot/spreads";
import { startReading } from "../../actions";

const PLACEHOLDERS: Record<string, string> = {
  YES_NO: "Should I take the job offer in Pune?",
  LOVE: "What should I understand about my relationship?",
  CAREER: "Where is my career heading this year?",
  MONEY: "How can I feel more secure with money?",
  THREE_CARD: "What do I need to know right now?",
};

export default async function NewReading({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUserId();
  const spread = spreadBySlug((await params).slug);
  if (!spread) notFound();
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 pt-6">
      <Link href="/tarot" className="text-sm text-muted">
        ← Tarot
      </Link>
      <div>
        <p className="eyebrow">{spread.positions.length === 1 ? "One card" : `${spread.positions.length} cards`}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">{spread.title}</h1>
        <p className="mt-2 text-muted">{spread.blurb}</p>
      </div>

      <ol className="flex flex-wrap gap-2">
        {spread.positions.map((p, i) => (
          <li key={p.name} className="chip">
            {i + 1}. {p.name}
          </li>
        ))}
      </ol>

      <form action={startReading} className="flex flex-col gap-4">
        <input type="hidden" name="spread" value={spread.slug} />
        {spread.question !== "none" && (
          <div>
            <label htmlFor="question" className="label">
              {spread.question === "required" ? "Your yes/no question" : "Your question (optional)"}
            </label>
            <textarea
              id="question"
              name="question"
              rows={3}
              maxLength={300}
              required={spread.question === "required"}
              className="field resize-none"
              placeholder={PLACEHOLDERS[spread.key]}
            />
            {spread.key === "YES_NO" && <p className="hint">Ask something that can be answered yes or no.</p>}
            {error === "question" && <p className="mt-1.5 text-sm text-warn">Please type your question first.</p>}
          </div>
        )}
        <p className="text-sm text-muted">Take a breath and hold your question in mind. When you&apos;re ready, shuffle.</p>
        <button className="btn">Shuffle the deck</button>
      </form>
    </div>
  );
}
