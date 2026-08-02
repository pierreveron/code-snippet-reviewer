"use client";

import {
  useEffect,
  useId,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import { createSnippet } from "@/app/actions/snippets";
import { CodeEditor } from "@/components/CodeEditor";
import { LanguageCombobox } from "@/components/LanguageCombobox";
import type { CreateSnippetFieldErrors } from "@/lib/snippet-schema";

type CreateSnippetModalProps = {
  open: boolean;
  onClose: () => void;
};

const initialErrors: CreateSnippetFieldErrors = {};

export function CreateSnippetModal({ open, onClose }: CreateSnippetModalProps) {
  const titleId = useId();
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("typescript");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<CreateSnippetFieldErrors>(initialErrors);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
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
  }, [open, onClose, isPending]);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setLanguage("typescript");
      setCode("");
      setErrors(initialErrors);
    }
  }, [open]);

  if (!open) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors(initialErrors);

    startTransition(async () => {
      try {
        const result = await createSnippet({ title, language, code });
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
        className="relative z-10 flex max-h-[min(90vh,840px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <h2
              id={titleId}
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              New snippet
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Add a title, language, and code. You’ll jump to the detail page
              after saving.
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
          className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        >
          <div className="space-y-4 px-5 py-5 sm:px-6">
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

          <div className="flex items-center justify-end gap-3 border-t border-border bg-surface-muted/50 px-5 py-4 sm:px-6">
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
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
