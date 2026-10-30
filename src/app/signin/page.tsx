import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth, signIn } from "@/auth";

const ERRORS: Record<string, string> = {
  Verification: "That sign-in link has expired or was already used. Ask for a new one below.",
  invalid: "Please enter a valid email address.",
};

async function startSignIn(formData: FormData) {
  "use server";
  const parsed = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) redirect("/signin?error=invalid");
  (await cookies()).set("grahify_signin_email", parsed.data, { httpOnly: true, sameSite: "lax", maxAge: 15 * 60 });
  await signIn("email", { email: parsed.data, redirectTo: "/onboarding" });
}

export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if ((await auth())?.user) redirect("/");
  const { error } = await searchParams;
  const message = error ? (ERRORS[error] ?? "Something went wrong signing in. Please try again.") : null;

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 pt-10">
      <div>
        <p className="eyebrow">Welcome</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Sign in to Grahify</h1>
        <p className="mt-2 text-muted">We&apos;ll email you a link. No password needed.</p>
      </div>
      {message && <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">{message}</p>}
      <form action={startSignIn} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className="field" placeholder="you@example.com" />
        </div>
        <button className="btn">Email me a sign-in link</button>
      </form>
    </div>
  );
}
