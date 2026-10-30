import Link from "next/link";
import { cookies } from "next/headers";
import { devLatestLink } from "@/lib/email";

export default async function CheckEmail() {
  const email = (await cookies()).get("grahify_signin_email")?.value ?? null;
  const devLink = email ? devLatestLink(email) : null;

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-5 pt-10">
      <p className="eyebrow">Almost there</p>
      <h1 className="font-display text-3xl font-semibold">Check your email</h1>
      <p className="text-muted">
        We sent a sign-in link{email ? <> to <strong className="text-ink">{email}</strong></> : null}. It works once and
        expires in 15 minutes.
      </p>
      {devLink && (
        <div className="rounded-2xl border border-dashed border-accent bg-accent-soft p-4">
          <p className="text-sm font-semibold">Development mode</p>
          <p className="mt-1 text-sm text-muted">No email service is set up yet, so here is the link that would be emailed.</p>
          <a href={devLink} className="btn mt-3 w-full">
            Open sign-in link
          </a>
        </div>
      )}
      <Link href="/signin" className="text-sm text-muted underline">
        Use a different email
      </Link>
    </div>
  );
}
