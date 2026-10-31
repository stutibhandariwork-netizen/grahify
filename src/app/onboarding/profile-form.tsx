"use client";

import { useActionState, useState } from "react";
import { saveProfile, type ProfileFormState } from "./actions";
import { PlacePicker } from "./place-picker";

interface Props {
  languages: readonly { code: string; label: string }[];
  optInText: string;
  /** Existing values when editing (form field name → value). */
  initial?: Record<string, string>;
  initialPlace?: { id: number; label: string; timeZone: string };
  /** WhatsApp is managed on the settings page once a profile exists. */
  showWhatsApp?: boolean;
  submitLabel?: string;
}

export function ProfileForm({ languages, optInText, initial, initialPlace, showWhatsApp = true, submitLabel = "Calculate my chart" }: Props) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(saveProfile, {});
  const [timeUnknown, setTimeUnknown] = useState(initial?.timeUnknown === "on");
  const [phone, setPhone] = useState("");
  const e = state.errors ?? {};
  const v = state.values ?? initial ?? {};

  return (
    <form action={action} className="flex flex-col gap-6">
      {e.form && <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">{e.form}</p>}

      <div>
        <label htmlFor="name" className="label">
          Name
        </label>
        <input id="name" name="name" className="field" autoComplete="given-name" required defaultValue={v.name} aria-invalid={!!e.name} />
        {e.name && <p className="mt-1.5 text-sm text-warn">{e.name}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="birthDate" className="label">
            Date of birth
          </label>
          <input id="birthDate" name="birthDate" type="date" className="field" required min="1800-01-01" defaultValue={v.birthDate} aria-invalid={!!e.birthDate} />
        </div>
        <div>
          <label htmlFor="birthTime" className="label">
            Birth time
          </label>
          <input
            id="birthTime"
            name="birthTime"
            type="time"
            className="field disabled:opacity-40"
            disabled={timeUnknown}
            required={!timeUnknown}
            defaultValue={v.birthTime}
            aria-invalid={!!e.birthTime}
          />
        </div>
        {(e.birthDate || e.birthTime) && <p className="col-span-2 text-sm text-warn">{e.birthDate ?? e.birthTime}</p>}
        <label className="col-span-2 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="timeUnknown"
            className="mt-0.5 size-5 accent-[var(--primary)]"
            checked={timeUnknown}
            onChange={(ev) => setTimeUnknown(ev.target.checked)}
          />
          <span>
            I don&apos;t know my exact time
            <span className="block text-xs text-muted">
              We&apos;ll read your chart from the Moon sign. Your rising sign (lagna) needs the exact time.
            </span>
          </span>
        </label>
      </div>

      <PlacePicker error={e.place} initial={initialPlace} />

      {state.timeChoice && (
        <fieldset className="rounded-2xl border border-accent bg-accent-soft p-4">
          <legend className="px-1 text-sm font-semibold">That time happened twice</legend>
          <p className="mb-3 text-sm text-muted">
            Clocks went back an hour that night. Which one was it? Check the birth record if you can.
          </p>
          {state.timeChoice.options.map((o) => (
            <label key={o.value} className="flex items-center gap-3 py-1.5 text-sm">
              <input type="radio" name="occurrence" value={o.value} required className="size-4" />
              {o.label}
            </label>
          ))}
        </fieldset>
      )}
      {state.timeSkipped && (
        <div className="rounded-2xl border border-accent bg-accent-soft p-4 text-sm">
          <p>{state.timeSkipped}</p>
          <input type="hidden" name="acceptSkipped" value="1" />
        </div>
      )}

      <div>
        <label htmlFor="language" className="label">
          Language for your readings
        </label>
        <select id="language" name="language" className="field" defaultValue={v.language ?? "en"}>
          {languages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {showWhatsApp && (
      <div className="card flex flex-col gap-3 bg-surface-2">
        <div>
          <label htmlFor="whatsapp" className="label">
            WhatsApp number <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="whatsapp"
            name="whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className="field"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(ev) => setPhone(ev.target.value)}
            aria-invalid={!!e.whatsapp}
          />
          {e.whatsapp && <p className="mt-1.5 text-sm text-warn">{e.whatsapp}</p>}
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="whatsappOptIn"
            className="mt-0.5 size-5 accent-[var(--primary)]"
            disabled={!phone.trim()}
            defaultChecked={v.whatsappOptIn === "on"}
          />
          <span>{optInText}</span>
        </label>
        <p className="text-xs text-muted">We only keep your number if you tick the box. You can change this in settings.</p>
      </div>
      )}

      <button className="btn" disabled={pending}>
        {pending ? "Calculating your chart…" : submitLabel}
      </button>
      <p className="text-center text-xs text-muted">Your birth details are encrypted and never shared.</p>
    </form>
  );
}
