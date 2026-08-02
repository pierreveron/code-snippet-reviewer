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

function DoubleChevronIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4 text-muted"
    >
      <path
        d="M6 8.25 10 4.5l4 3.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 11.75 10 15.5l4-3.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4 shrink-0 text-accent"
    >
      <path
        d="M4.5 10.5 8 14l7.5-8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LanguageCombobox({
  value,
  onChange,
  error,
}: LanguageComboboxProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = LANGUAGES.find((language) => language.value === value);
  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const options = useMemo(
    () => (isFiltering ? filterLanguages(query) : LANGUAGES),
    [isFiltering, query],
  );

  useEffect(() => {
    if (!isFiltering) {
      setQuery(selected?.label ?? "");
    }
  }, [selected?.label, isFiltering]);

  useEffect(() => {
    if (!open) return;

    if (isFiltering) {
      setActiveIndex(0);
      return;
    }

    const selectedIndex = LANGUAGES.findIndex(
      (language) => language.value === value,
    );
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, isFiltering, query, value]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setIsFiltering(false);
        setQuery(selected?.label ?? "");
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [selected?.label]);

  function closeList() {
    setOpen(false);
    setIsFiltering(false);
    setQuery(selected?.label ?? "");
  }

  function openList() {
    setOpen(true);
    setIsFiltering(false);
    setQuery(selected?.label ?? "");
  }

  function selectLanguage(language: LanguageOption) {
    onChange(language.value);
    setQuery(language.label);
    setIsFiltering(false);
    setOpen(false);
    inputRef.current?.blur();
  }

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={`${listboxId}-input`}
        className="mb-1.5 block text-sm font-medium text-foreground"
      >
        Language
      </label>
      <div className="relative">
        <input
          ref={inputRef}
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
          onFocus={() => {
            openList();
            requestAnimationFrame(() => {
              inputRef.current?.select();
            });
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsFiltering(true);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
              openList();
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
              closeList();
            }
          }}
          className="h-10 w-full rounded-lg border border-border bg-surface py-2 pr-10 pl-3 text-sm text-foreground outline-none ring-accent/30 placeholder:text-muted focus:border-accent focus:ring-2"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={open ? "Close language list" : "Open language list"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center"
          onMouseDown={(event) => {
            event.preventDefault();
            if (open) {
              closeList();
              inputRef.current?.blur();
            } else {
              openList();
              inputRef.current?.focus();
            }
          }}
        >
          <DoubleChevronIcon />
        </button>
      </div>
      {error ? <p className="mt-1.5 text-xs text-rose-600">{error}</p> : null}

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-surface shadow-(--shadow)"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">No matches</li>
          ) : (
            options.map((language, index) => {
              const isActive = index === activeIndex;
              const isSelected = language.value === value;
              const isFirst = index === 0;
              const isLast = index === options.length - 1;

              return (
                <li key={language.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    className={[
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-normal",
                      isFirst ? "rounded-t-[7px]" : "",
                      isLast ? "rounded-b-[7px]" : "",
                      isActive ? "bg-accent-soft text-accent" : "text-foreground",
                    ].join(" ")}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectLanguage(language)}
                  >
                    <span className="flex w-4 shrink-0 justify-center">
                      {isSelected ? <CheckIcon /> : null}
                    </span>
                    <span>{language.label}</span>
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
