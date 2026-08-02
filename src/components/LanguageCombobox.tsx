"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { LANGUAGES, type LanguageOption } from "@/lib/languages";

type LanguageComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

function filterLanguages(query: string): LanguageOption[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return LANGUAGES;
  return LANGUAGES.filter(
    (language) =>
      language.label.toLowerCase().includes(normalized) ||
      language.value.toLowerCase().includes(normalized),
  );
}

export function LanguageCombobox({
  value,
  onChange,
  error,
}: LanguageComboboxProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = LANGUAGES.find((language) => language.value === value);
  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const options = useMemo(() => filterLanguages(query), [query]);

  useEffect(() => {
    setQuery(selected?.label ?? "");
  }, [selected?.label]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery(selected?.label ?? "");
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [selected?.label]);

  function selectLanguage(language: LanguageOption) {
    onChange(language.value);
    setQuery(language.label);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={`${listboxId}-input`}
        className="mb-1.5 block text-sm font-medium text-foreground"
      >
        Language
      </label>
      <input
        id={`${listboxId}-input`}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-invalid={Boolean(error)}
        autoComplete="off"
        placeholder="Search languages…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
            setOpen(true);
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((index) =>
              options.length === 0 ? 0 : (index + 1) % options.length,
            );
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) =>
              options.length === 0
                ? 0
                : (index - 1 + options.length) % options.length,
            );
          } else if (event.key === "Enter") {
            event.preventDefault();
            const option = options[activeIndex];
            if (option) selectLanguage(option);
          } else if (event.key === "Escape") {
            setOpen(false);
            setQuery(selected?.label ?? "");
          }
        }}
        className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none ring-accent/30 placeholder:text-muted focus:border-accent focus:ring-2"
      />
      {error ? <p className="mt-1.5 text-xs text-rose-600">{error}</p> : null}

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-surface py-1 shadow-[var(--shadow)]"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">No matches</li>
          ) : (
            options.map((language, index) => {
              const isActive = index === activeIndex;
              const isSelected = language.value === value;

              return (
                <li key={language.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    className={`flex w-full items-center px-3 py-2 text-left text-sm ${
                      isActive ? "bg-accent-soft text-accent" : "text-foreground"
                    } ${isSelected ? "font-semibold" : "font-normal"}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectLanguage(language)}
                  >
                    {language.label}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
