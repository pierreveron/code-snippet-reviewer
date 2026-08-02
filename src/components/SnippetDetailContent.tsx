"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { updateSnippetMetadata } from "@/app/actions/snippets";
import { CodeEditor } from "@/components/CodeEditor";
import { LanguageCombobox } from "@/components/LanguageCombobox";
import { ReviewStatusBadge } from "@/components/ReviewStatusBadge";
import {
  formatLanguageLabel,
  normalizeLanguageValue,
} from "@/lib/languages";
import type { UpdateSnippetMetadataFieldErrors } from "@/lib/snippet-schema";
import type { SnippetDetail } from "@/lib/snippets";

type SnippetDetailContentProps = {
  snippet: SnippetDetail;
};

function formatCreatedAt(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function SnippetDetailContent({ snippet }: SnippetDetailContentProps) {
  const router = useRouter();
  const initialLanguage = normalizeLanguageValue(snippet.language);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(snippet.title);
  const [language, setLanguage] = useState(initialLanguage);
  const [savedTitle, setSavedTitle] = useState(snippet.title);
  const [savedLanguage, setSavedLanguage] = useState(initialLanguage);
  const [errors, setErrors] = useState<UpdateSnippetMetadataFieldErrors>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const nextLanguage = normalizeLanguageValue(snippet.language);
    setTitle(snippet.title);
    setLanguage(nextLanguage);
    setSavedTitle(snippet.title);
    setSavedLanguage(nextLanguage);
    setErrors({});
    setIsEditing(false);
  }, [snippet.id, snippet.title, snippet.language]);

  const isDirty = useMemo(
    () => title.trim() !== savedTitle || language !== savedLanguage,
    [title, language, savedTitle, savedLanguage],
  );

  function startEditing() {
    setTitle(savedTitle);
    setLanguage(savedLanguage);
    setErrors({});
    setIsEditing(true);
  }

  function cancelEditing() {
    setTitle(savedTitle);
    setLanguage(savedLanguage);
    setErrors({});
    setIsEditing(false);
  }

  function handleSave() {
    setErrors({});

    startTransition(async () => {
      const nextTitle = title.trim();
      const result = await updateSnippetMetadata({
        id: snippet.id,
        title: nextTitle,
        language,
      });

      if (!result.ok) {
        setErrors(result.errors);
        return;
      }

      setTitle(nextTitle);
      setSavedTitle(nextTitle);
      setSavedLanguage(language);
      setIsEditing(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-6 flex flex-row flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          ← Back to snippets
        </Link>

        <div className="flex shrink-0 flex-row items-center gap-2">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={isPending}
                className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || isPending}
                className="inline-flex h-8 items-center justify-center rounded-md bg-accent px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Saving…" : "Save changes"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
              >
                Edit
              </button>
              <button
                type="button"
                disabled
                title="Coming next"
                className="inline-flex h-8 items-center justify-center rounded-md bg-accent px-3 text-sm font-semibold text-white opacity-50"
              >
                Run review
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="mb-8 space-y-4">
          <div>
            <input
              id="snippet-detail-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              aria-label="Title"
              aria-invalid={Boolean(errors.title?.[0])}
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-xl font-semibold text-foreground outline-none ring-accent/30 placeholder:text-muted focus:border-accent focus:ring-2"
            />
            {errors.title?.[0] ? (
              <p className="mt-1.5 text-xs text-rose-600">{errors.title[0]}</p>
            ) : null}
          </div>

          <div className="max-w-sm">
            <LanguageCombobox
              value={language}
              onChange={setLanguage}
              error={errors.language?.[0]}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <ReviewStatusBadge status={snippet.reviewStatus} />
            <span className="text-sm text-muted">
              Created {formatCreatedAt(snippet.createdAt)}
            </span>
          </div>
        </div>
      ) : (
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {savedTitle}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-medium text-slate-700">
              {formatLanguageLabel(savedLanguage)}
            </span>
            <ReviewStatusBadge status={snippet.reviewStatus} />
            <span className="text-sm text-muted">
              Created {formatCreatedAt(snippet.createdAt)}
            </span>
          </div>
        </div>
      )}

      <CodeEditor
        value={snippet.code}
        language={isEditing ? language : savedLanguage}
        readOnly
        height="520px"
      />
    </>
  );
}
