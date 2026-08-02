"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { createSnippet } from "@/app/actions/snippets";
import { CodeEditor } from "@/components/CodeEditor";
import { LanguageCombobox } from "@/components/LanguageCombobox";
import type { CreateSnippetFieldErrors } from "@/lib/snippet-schema";

type CreateSnippetModalProps = {
  open: boolean;
  onClose: () => void;
};

type CreateMode = "create-and-review" | "create";

const CREATE_MODES = ["create-and-review", "create"] as const;

const initialErrors: CreateSnippetFieldErrors = {};

const createModeLabels: Record<CreateMode, string> = {
  "create-and-review": "Create and Review",
  create: "Create",
};

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      className="h-3.5 w-3.5"
    >
      <path
        d="M4 6.25 8 10.25l4-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CreateSnippetModal({ open, onClose }: CreateSnippetModalProps) {
  const titleId = useId();
  const menuId = useId();
  const splitButtonRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("typescript");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<CreateSnippetFieldErrors>(initialErrors);
  const [createMode, setCreateMode] = useState<CreateMode>("create-and-review");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMenuIndex, setActiveMenuIndex] = useState(0);
  const [isPending, startTransition] = useTransition();

  function closeMenu(options?: { restoreFocus?: boolean }) {
    setMenuOpen(false);
    if (options?.restoreFocus) {
      menuTriggerRef.current?.focus();
    }
  }

  function openMenu() {
    const currentIndex = CREATE_MODES.indexOf(createMode);
    setActiveMenuIndex(currentIndex >= 0 ? currentIndex : 0);
    setMenuOpen(true);
  }

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        if (menuOpen) {
          event.preventDefault();
          closeMenu({ restoreFocus: true });
          return;
        }
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, isPending, menuOpen]);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setLanguage("typescript");
      setCode("");
      setErrors(initialErrors);
      setCreateMode("create-and-review");
      setMenuOpen(false);
      setActiveMenuIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (
        splitButtonRef.current &&
        !splitButtonRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    // Focus once on open for keyboard use. Avoid depending on activeMenuIndex:
    // re-focusing on hover steals the mouse click before it can fire.
    menuItemRefs.current[activeMenuIndex]?.focus();
  }, [menuOpen]); // eslint-disable-line react-hooks/exhaustive-deps -- open-only

  if (!open) return null;

  function focusMenuItem(index: number) {
    setActiveMenuIndex(index);
    // Focus after paint so tabIndex={0} is on the target item.
    requestAnimationFrame(() => {
      menuItemRefs.current[index]?.focus();
    });
  }

  function submit(mode: CreateMode) {
    setCreateMode(mode);
    setMenuOpen(false);
    setErrors(initialErrors);

    startTransition(async () => {
      try {
        const result = await createSnippet({
          title,
          language,
          code,
          startReview: mode === "create-and-review",
        });
        if (result?.ok === false) {
          setErrors(result.errors);
        }
      } catch (error) {
        // Successful saves redirect via a thrown NEXT_REDIRECT — rethrow it.
        if (
          typeof error === "object" &&
          error !== null &&
          "digest" in error &&
          typeof error.digest === "string" &&
          error.digest.startsWith("NEXT_REDIRECT")
        ) {
          throw error;
        }

        setErrors({
          form: ["Couldn't save the snippet. Please try again."],
        });
      }
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(createMode);
  }

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusMenuItem((activeMenuIndex + 1) % CREATE_MODES.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusMenuItem(
        (activeMenuIndex - 1 + CREATE_MODES.length) % CREATE_MODES.length,
      );
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusMenuItem(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      focusMenuItem(CREATE_MODES.length - 1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const mode = CREATE_MODES[activeMenuIndex];
      if (mode) {
        setCreateMode(mode);
        closeMenu({ restoreFocus: true });
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
    }
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (
      event.key === "ArrowDown" ||
      event.key === "ArrowUp" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      if (!menuOpen) {
        openMenu();
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-900/40"
        disabled={isPending}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={[
          "relative z-10 flex max-h-[min(90vh,840px)] w-full max-w-3xl flex-col rounded-2xl border border-border bg-surface shadow-[var(--shadow)]",
          // Allow the create-options menu to paint below the footer.
          menuOpen ? "overflow-visible" : "overflow-hidden",
        ].join(" ")}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <h2
              id={titleId}
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              New snippet
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Add a title, language, and code. Create and Review starts analysis
              right away.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg px-2 py-1 text-sm text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            Close
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
            <div>
              <label
                htmlFor="snippet-title"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Title
              </label>
              <input
                id="snippet-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Retry with backoff"
                aria-invalid={Boolean(errors.title?.[0])}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none ring-accent/30 placeholder:text-muted focus:border-accent focus:ring-2"
              />
              {errors.title?.[0] ? (
                <p className="mt-1.5 text-xs text-rose-600">{errors.title[0]}</p>
              ) : null}
            </div>

            <LanguageCombobox
              value={language}
              onChange={setLanguage}
              error={errors.language?.[0]}
            />

            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">Code</p>
              <CodeEditor
                value={code}
                language={language}
                onChange={setCode}
                height="280px"
              />
              {errors.code?.[0] ? (
                <p className="mt-1.5 text-xs text-rose-600">{errors.code[0]}</p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3 rounded-b-2xl border-t border-border bg-surface-muted/50 px-5 py-4 sm:px-6">
            {errors.form?.[0] ? (
              <p role="alert" className="text-sm text-rose-600">
                {errors.form[0]}
              </p>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
            >
              Cancel
            </button>
            <div ref={splitButtonRef} className="relative">
              <div className="inline-flex overflow-hidden rounded-lg bg-accent shadow-sm">
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex h-10 items-center justify-center px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {isPending ? "Creating…" : createModeLabels[createMode]}
                </button>
                <button
                  ref={menuTriggerRef}
                  type="button"
                  disabled={isPending}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-controls={menuId}
                  aria-label="More create options"
                  onClick={() => {
                    if (menuOpen) {
                      closeMenu();
                    } else {
                      openMenu();
                    }
                  }}
                  onKeyDown={handleTriggerKeyDown}
                  className="inline-flex h-10 w-9 items-center justify-center border-l border-white/25 text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  <ChevronDownIcon />
                </button>
              </div>
              {menuOpen ? (
                <div
                  id={menuId}
                  role="menu"
                  aria-label="Create options"
                  onKeyDown={handleMenuKeyDown}
                  className="absolute top-full right-0 z-20 mt-1.5 min-w-50 overflow-hidden rounded-lg border border-border bg-surface shadow-(--shadow)"
                >
                  {CREATE_MODES.map((mode, index) => {
                    const isActive = index === activeMenuIndex;
                    const isFirst = index === 0;
                    const isLast = index === CREATE_MODES.length - 1;
                    return (
                      <button
                        key={mode}
                        ref={(element) => {
                          menuItemRefs.current[index] = element;
                        }}
                        type="button"
                        role="menuitem"
                        tabIndex={isActive ? 0 : -1}
                        disabled={isPending}
                        onPointerDown={(event) => {
                          // Select only — create runs when the main button is clicked.
                          if (event.button !== 0) return;
                          event.preventDefault();
                          setCreateMode(mode);
                          setActiveMenuIndex(index);
                          closeMenu({ restoreFocus: true });
                        }}
                        onMouseEnter={() => setActiveMenuIndex(index)}
                        className={[
                          "flex w-full items-center px-3 py-2 text-left text-sm font-normal outline-none",
                          isFirst ? "rounded-t-[7px]" : "",
                          isLast ? "rounded-b-[7px]" : "",
                          isActive
                            ? "bg-accent-soft text-accent"
                            : "text-foreground",
                        ].join(" ")}
                      >
                        {createModeLabels[mode]}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
