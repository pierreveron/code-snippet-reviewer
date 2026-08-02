"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

export type FilterSelectOption = {
  value: string;
  label: string;
};

type FilterSelectProps = {
  label: string;
  value: string;
  options: FilterSelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
  "aria-label"?: string;
};

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4 text-muted"
    >
      <path
        d="M6 8 10 12l4-4"
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

export function FilterSelect({
  label,
  value,
  options,
  placeholder,
  onChange,
  "aria-label": ariaLabel,
}: FilterSelectProps) {
  const listboxId = useId();
  const labelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [activeIndex, setActiveIndex] = useState(
    selectedIndex >= 0 ? selectedIndex : 0,
  );

  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const displayLabel = selected?.label ?? placeholder;

  useEffect(() => {
    if (!open) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function selectOption(option: FilterSelectOption) {
    onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (
      !open &&
      (event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "Enter" ||
        event.key === " ")
    ) {
      event.preventDefault();
      setOpen(true);
      return;
    }

    if (!open) return;

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
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) selectOption(option);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(options.length - 1, 0));
    }
  }

  return (
    <div ref={containerRef} className="relative min-w-40 flex-1 sm:max-w-56">
      <span
        id={labelId}
        className="mb-1.5 block text-xs font-medium text-muted"
      >
        {label}
      </span>
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-labelledby={labelId}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onButtonKeyDown}
        className={[
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border bg-surface py-2 pr-2.5 pl-3 text-left text-sm outline-none ring-accent/30 transition-colors",
          open
            ? "border-accent ring-2"
            : "border-border hover:border-border-strong focus-visible:border-accent focus-visible:ring-2",
          selected ? "text-foreground" : "text-muted",
        ].join(" ")}
      >
        <span className="truncate">{displayLabel}</span>
        <span
          className={[
            "shrink-0 transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
        >
          <ChevronDownIcon />
        </span>
      </button>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={labelId}
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-surface shadow-(--shadow)"
        >
          {options.map((option, index) => {
            const isActive = index === activeIndex;
            const isSelected = option.value === value;
            const isFirst = index === 0;
            const isLast = index === options.length - 1;

            return (
              <li
                key={option.value || "__all__"}
                role="option"
                aria-selected={isSelected}
              >
                <button
                  type="button"
                  className={[
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                    isFirst ? "rounded-t-[7px]" : "",
                    isLast ? "rounded-b-[7px]" : "",
                    isActive
                      ? "bg-accent-soft text-accent"
                      : "text-foreground hover:bg-surface-muted",
                    isSelected ? "font-medium" : "font-normal",
                  ].join(" ")}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectOption(option)}
                >
                  <span className="flex w-4 shrink-0 justify-center">
                    {isSelected ? <CheckIcon /> : null}
                  </span>
                  <span className="truncate">{option.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
