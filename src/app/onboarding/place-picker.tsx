"use client";

import { useEffect, useId, useRef, useState } from "react";

interface PlaceOption {
  id: number;
  label: string;
  timeZone: string;
}

/** Birthplace combobox backed by /api/places. Submits the chosen place id as `placeId`. */
export function PlacePicker({ error, initial }: { error?: string; initial?: PlaceOption }) {
  const listId = useId();
  const [query, setQuery] = useState(initial?.label ?? "");
  const [options, setOptions] = useState<PlaceOption[]>([]);
  const [selected, setSelected] = useState<PlaceOption | null>(initial ?? null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (selected && query === selected.label) return;
    clearTimeout(timer.current);
    if (query.trim().length < 2) {
      setOptions([]);
      return;
    }
    const controller = new AbortController();
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const data: PlaceOption[] = await res.json();
        setOptions(data);
        setActive(0);
        setOpen(true);
      } catch {
        // aborted or offline: keep the previous list
      }
    }, 180);
    return () => {
      clearTimeout(timer.current);
      controller.abort();
    };
  }, [query, selected]);

  function choose(o: PlaceOption) {
    setSelected(o);
    setQuery(o.label);
    setOpen(false);
  }

  return (
    <div className="relative">
      <label htmlFor={`${listId}-input`} className="label">
        Birthplace
      </label>
      <input
        id={`${listId}-input`}
        className="field"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
        aria-invalid={!!error}
        autoComplete="off"
        placeholder="Start typing a town or city"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelected(null);
        }}
        onFocus={() => options.length > 0 && !selected && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          // Enter never submits the form from here: it picks a suggestion or does nothing.
          if (e.key === "Enter" && (!open || options.length === 0)) {
            e.preventDefault();
            return;
          }
          if (!open || options.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, options.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            choose(options[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      <input type="hidden" name="placeId" value={selected?.id ?? ""} />
      {open && options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-line bg-surface p-1 shadow-lg"
        >
          {options.map((o, i) => (
            <li
              key={o.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`cursor-pointer rounded-lg px-3 py-2.5 text-sm ${i === active ? "bg-surface-2" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(o)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
      {selected ? (
        <p className="hint">Time zone: {selected.timeZone}, with historical changes applied.</p>
      ) : (
        <p className="hint">Hindi and Odia spellings work too, e.g. कटक or କଟକ.</p>
      )}
      {error && !selected && <p className="mt-1.5 text-sm text-warn">{error}</p>}
    </div>
  );
}
