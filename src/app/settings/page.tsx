import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUserId } from "@/auth";
import { fmtLocal } from "@/components/reading-bits";
import { decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { LANGUAGES, loadPrimaryProfile, WHATSAPP_OPT_IN_TEXT } from "@/lib/profile";
import { deleteAccount, optOutWhatsApp, savePreferences, saveWhatsApp } from "./actions";

export const metadata = { title: "Settings · Grahify" };

const NOTICES: Record<string, string> = {
  "saved:prefs": "Preferences saved.",
  "saved:whatsapp": "WhatsApp settings saved.",
  "saved:optout": "You won't get any more WhatsApp messages.",
  "saved:profile": "Birth details updated and your chart recalculated.",
  "error:prefs": "Please choose a language and time zone from the lists.",
  "error:phone": "Enter a mobile number with country code, e.g. +91 98765 43210.",
  "error:consent": "Tick the box to confirm you want WhatsApp messages.",
  "error:time": "Choose a time for the daily message.",
  "error:confirm": "Type DELETE in capitals to confirm.",
};

export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const userId = await requireUserId();
  const [profile, user] = await Promise.all([
    loadPrimaryProfile(userId),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { whatsapp: true } }),
  ]);
  if (!profile) redirect("/onboarding");
  const { saved, error } = await searchParams;
  const notice = saved ? NOTICES[`saved:${saved}`] : error ? NOTICES[`error:${error}`] : null;

  const wa = user.whatsapp;
  const waActive = wa && !wa.optedOutAt;
  const phone = wa ? decrypt(wa.phoneEnc) : null;
  // The runtime's list uses some older names (Asia/Calcutta); make sure the saved zone is always there to be selected.
  const zones = [...new Set([user.timezone, ...Intl.supportedValuesOf("timeZone")])].sort();
  const b = profile.birth;

  return (
    <div className="flex flex-col gap-10 pt-4">
      <header>
        <p className="eyebrow">Your account</p>
        <h1 className="mt-2 font-display text-4xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-muted">Signed in as {user.email}</p>
      </header>

      {notice && <p className={`rounded-xl px-4 py-3 text-sm ${error ? "bg-warn-soft text-warn" : "bg-accent-soft"}`}>{notice}</p>}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-semibold">Birth details</h2>
        <div className="card flex items-start justify-between gap-4">
          <div className="text-sm">
            <p className="font-semibold">{b.name}</p>
            <p className="text-muted">
              {fmtLocal(`${b.birthDate}T12:00:00Z`, "UTC")} · {b.birthTime ?? "time unknown"}
            </p>
            <p className="text-muted">{b.place.label}</p>
          </div>
          <Link href="/settings/profile" className="btn-ghost shrink-0">
            Edit
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-semibold">Preferences</h2>
        <form action={savePreferences} className="card flex flex-col gap-4">
          <div>
            <label htmlFor="language" className="label">
              Language for readings
            </label>
            <select id="language" name="language" defaultValue={user.language} className="field">
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <p className="hint">New readings are written in this language. Earlier ones stay as they were.</p>
          </div>
          <div>
            <label htmlFor="timezone" className="label">
              Where you live (time zone)
            </label>
            <select id="timezone" name="timezone" defaultValue={user.timezone} className="field">
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <p className="hint">Used for your day, your week and message times, not for your birth chart.</p>
          </div>
          <button className="btn self-start">Save</button>
        </form>
      </section>

      <section id="whatsapp" className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-semibold">WhatsApp</h2>
        <form action={saveWhatsApp} className="card flex flex-col gap-4">
          {waActive ? (
            <p className="text-sm">
              On for <strong>•••• {phone!.slice(-4)}</strong> since {fmtLocal(wa.optedInAt.toISOString(), user.timezone)}.
            </p>
          ) : (
            <p className="text-sm text-muted">
              {wa?.optedOutAt ? `Turned off on ${fmtLocal(wa.optedOutAt.toISOString(), user.timezone)}.` : "Not set up."} Get your weekly
              reading, and optionally a daily affirmation, on WhatsApp.
            </p>
          )}
          <div>
            <label htmlFor="phone" className="label">
              {waActive ? "Change number (optional)" : "WhatsApp number"}
            </label>
            <input id="phone" name="phone" type="tel" inputMode="tel" placeholder="+91 98765 43210" className="field" />
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" name="weekly" defaultChecked={wa?.weekly ?? true} className="size-5 accent-[var(--primary)]" />
            Weekly reading, Saturday morning
          </label>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-3">
              <input type="checkbox" name="daily" defaultChecked={wa?.daily ?? false} className="size-5 accent-[var(--primary)]" />
              Daily affirmation at
            </label>
            <label htmlFor="dailyTime" className="sr-only">
              Time
            </label>
            <input id="dailyTime" name="dailyTime" type="time" defaultValue={wa?.dailyTime ?? "07:30"} className="field w-32 px-3 py-2" />
          </div>
          <label className="flex items-start gap-3 rounded-xl bg-surface-2 p-3 text-sm">
            <input type="checkbox" name="consent" className="mt-0.5 size-5 accent-[var(--primary)]" />
            <span>
              {WHATSAPP_OPT_IN_TEXT}
              {waActive && <span className="block text-xs text-muted">Only needed when changing your number.</span>}
            </span>
          </label>
          <p className="text-xs text-muted">Sending isn&apos;t switched on yet; your choices are saved for when it is.</p>
          <button className="btn self-start">{waActive ? "Save" : "Turn on"}</button>
        </form>
        {waActive && (
          <form action={optOutWhatsApp}>
            <button className="text-sm text-muted underline hover:text-warn">Turn off WhatsApp messages</button>
          </form>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-semibold">Your data</h2>
        <div className="card flex flex-col gap-3 text-sm">
          <p>
            Your birth details, readings, journal and conversations are encrypted. They are never shared with third parties.
            Claude only sees the data a reading needs.
          </p>
          <a href="/api/export" className="btn-ghost self-start">
            Download all my data (JSON)
          </a>
        </div>
      </section>

      <section id="delete" className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-semibold text-warn">Delete account</h2>
        <form action={deleteAccount} className="card flex flex-col gap-3 border-warn/40 text-sm">
          <p>
            This permanently deletes your account, birth details, charts, readings, tarot, journal, conversations and WhatsApp
            settings. It can&apos;t be undone. Download your data first if you want a copy.
          </p>
          <label htmlFor="confirm" className="label">
            Type DELETE to confirm
          </label>
          <input id="confirm" name="confirm" autoComplete="off" className="field" />
          <button className="inline-flex min-h-11 items-center justify-center self-start rounded-full bg-warn px-6 text-sm font-semibold text-white">
            Delete everything
          </button>
        </form>
      </section>
    </div>
  );
}
