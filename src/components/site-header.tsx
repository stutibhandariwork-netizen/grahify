import Link from "next/link";
import { auth, signOut } from "@/auth";
import { TopNav } from "./nav";

export async function SiteHeader() {
  const session = await auth();
  return (
    <header className="sticky top-0 z-10 border-b border-line/70 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-2 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-display text-xl font-semibold tracking-tight">
          <Logo />
          Grahify
        </Link>
        {session?.user ? (
          <div className="flex items-center">
            <TopNav />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2" aria-label="Sign out" title="Sign out">
                <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          </div>
        ) : (
          <Link href="/signin" className="rounded-full px-3 py-2 text-sm font-medium hover:bg-surface-2">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="size-7 text-accent" aria-hidden>
      <circle cx="16" cy="16" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <ellipse cx="16" cy="16" rx="15" ry="5.5" fill="none" stroke="currentColor" strokeWidth="1.2" transform="rotate(-20 16 16)" opacity=".7" />
      <circle cx="16" cy="16" r="3" fill="currentColor" />
    </svg>
  );
}
