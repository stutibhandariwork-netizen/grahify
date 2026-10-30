import "server-only";

/**
 * Magic-link delivery. No email provider is chosen yet, so in development the
 * link is logged and kept in memory for the "check your email" page to show.
 * Production refuses to start a sign-in until a provider is configured.
 */

type Outbox = Map<string, { url: string; at: number }>;
const globalForOutbox = globalThis as unknown as { devOutbox?: Outbox };
const devOutbox: Outbox = (globalForOutbox.devOutbox ??= new Map());

export const isDevEmail = process.env.NODE_ENV !== "production" && !process.env.EMAIL_PROVIDER;

export async function sendMagicLink(email: string, url: string): Promise<void> {
  if (isDevEmail) {
    devOutbox.set(email.toLowerCase(), { url, at: Date.now() });
    console.log(`\n[dev] Sign-in link for ${email}:\n${url}\n`);
    return;
  }
  throw new Error("No email provider configured (set EMAIL_PROVIDER). See .env.example.");
}

/** Development only: the latest link sent to this address in the last 15 minutes. */
export function devLatestLink(email: string): string | null {
  if (!isDevEmail) return null;
  const entry = devOutbox.get(email.toLowerCase());
  return entry && Date.now() - entry.at < 15 * 60_000 ? entry.url : null;
}
