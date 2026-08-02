"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  runSnippetReview,
  type AcceptedFindingState,
} from "@/app/actions/reviews";
import { updateSnippet } from "@/app/actions/snippets";
import { CodeEditor } from "@/components/CodeEditor";
import { FindingsPanel } from "@/components/FindingsPanel";
import { LanguageCombobox } from "@/components/LanguageCombobox";
import { ReviewStatusBadge } from "@/components/ReviewStatusBadge";
import { formatDateTime } from "@/lib/datetime";
import {
  formatLanguageLabel,
  normalizeLanguageValue,
} from "@/lib/languages";
import type { UpdateSnippetFieldErrors } from "@/lib/snippet-schema";
import type { SnippetDetail, SnippetFinding } from "@/lib/snippets";

type SnippetDetailContentProps = {
  snippet: SnippetDetail;
  /** When true (e.g. after Create and Review), start a review once on mount. */
  autoStartReview?: boolean;
};

/** Survives Strict Mode remounts so Create and Review only kicks off once. */
const autoStartedReviewIds = new Set<string>();

function defaultSelectedFindingId(findings: SnippetFinding[]): string | null {
  return findings[0]?.id ?? null;
}

export function SnippetDetailContent({
  snippet,
  autoStartReview = false,
}: SnippetDetailContentProps) {
  const router = useRouter();
  const initialLanguage = normalizeLanguageValue(snippet.language);

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(snippet.title);
  const [language, setLanguage] = useState(initialLanguage);
  const [code, setCode] = useState(snippet.code);
  const [savedTitle, setSavedTitle] = useState(snippet.title);
  const [savedLanguage, setSavedLanguage] = useState(initialLanguage);
  const [savedCode, setSavedCode] = useState(snippet.code);
  const [contentVersion, setContentVersion] = useState(snippet.contentVersion);
  const [errors, setErrors] = useState<UpdateSnippetFieldErrors>({});
  const [isPending, startTransition] = useTransition();
  const [isReviewPending, startReviewTransition] = useTransition();
  const [isFindingActionPending, setIsFindingActionPending] = useState(false);
  const [reviewActionError, setReviewActionError] = useState<string | null>(
    null,
  );
  // After runSnippetReview returns, props lag until router.refresh(). Keep the
  // latest status so we don't flash the previous FAILED banner / badge.
  const [localReviewStatus, setLocalReviewStatus] = useState<
    "COMPLETED" | "FAILED" | "SUPERSEDED" | null
  >(null);
  const [findings, setFindings] = useState<SnippetFinding[]>(snippet.findings);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(
    () => defaultSelectedFindingId(snippet.findings),
  );
  const [syncedSnippet, setSyncedSnippet] = useState(snippet);

  if (snippet !== syncedSnippet) {
    setSyncedSnippet(snippet);
    const nextLanguage = normalizeLanguageValue(snippet.language);
    setTitle(snippet.title);
    setLanguage(nextLanguage);
    setCode(snippet.code);
    setSavedTitle(snippet.title);
    setSavedLanguage(nextLanguage);
    setSavedCode(snippet.code);
    setContentVersion(snippet.contentVersion);
    setErrors({});
    setIsEditing(false);
    setFindings(snippet.findings);
    setReviewActionError(null);
    setLocalReviewStatus(null);
    setSelectedFindingId((current) => {
      if (current && snippet.findings.some((finding) => finding.id === current)) {
        return current;
      }
      return defaultSelectedFindingId(snippet.findings);
    });
  }

  const isDirty = useMemo(
    () =>
      title.trim() !== savedTitle ||
      language !== savedLanguage ||
      code !== savedCode,
    [title, language, code, savedTitle, savedLanguage, savedCode],
  );

  const selectedFinding = useMemo(
    () => findings.find((finding) => finding.id === selectedFindingId) ?? null,
    [findings, selectedFindingId],
  );

  const highlightRange = useMemo(() => {
    if (
      isEditing ||
      !selectedFinding ||
      selectedFinding.resolution !== "OPEN"
    ) {
      return null;
    }
    return {
      startLine: selectedFinding.startLine,
      endLine: selectedFinding.endLine ?? selectedFinding.startLine,
    };
  }, [isEditing, selectedFinding]);

  const displayReviewStatus = isReviewPending
    ? "IN_PROGRESS"
    : localReviewStatus === "COMPLETED"
      ? "COMPLETED"
      : localReviewStatus === "FAILED"
        ? "FAILED"
        : snippet.reviewStatus;

  function startEditing() {
    if (isFindingActionPending) {
      return;
    }
    setTitle(savedTitle);
    setLanguage(savedLanguage);
    setCode(savedCode);
    setErrors({});
    setIsEditing(true);
  }

  function cancelEditing() {
    setTitle(savedTitle);
    setLanguage(savedLanguage);
    setCode(savedCode);
    setErrors({});
    setIsEditing(false);
  }

  function handleSave() {
    setErrors({});

    startTransition(async () => {
      try {
        const nextTitle = title.trim();
        const reviewOutdated =
          code !== savedCode || language !== savedLanguage;
        const result = await updateSnippet({
          id: snippet.id,
          title: nextTitle,
          language,
          code,
          expectedVersion: contentVersion,
        });

        if (!result.ok) {
          setErrors(result.errors);
          return;
        }

        setTitle(nextTitle);
        setSavedTitle(nextTitle);
        setSavedLanguage(language);
        setSavedCode(code);
        setContentVersion(result.contentVersion);
        setIsEditing(false);
        if (reviewOutdated) {
          setFindings([]);
          setSelectedFindingId(null);
          setReviewActionError(null);
          setLocalReviewStatus(null);
        }
        router.refresh();
      } catch {
        setErrors({
          form: ["Couldn't save the snippet. Please try again."],
        });
      }
    });
  }

  function applyReviewResult(
    result: Awaited<ReturnType<typeof runSnippetReview>>,
  ) {
    if (!result.ok) {
      setReviewActionError(result.error);
      router.refresh();
      return;
    }

    setLocalReviewStatus(result.status);
    setFindings(result.findings);
    setSelectedFindingId(defaultSelectedFindingId(result.findings));

    if (result.status === "FAILED") {
      setReviewActionError(
        result.errorMessage ?? "Review failed. Please try again.",
      );
    } else if (result.status === "SUPERSEDED") {
      setReviewActionError(
        result.errorMessage ??
          "Another review finished first. Refresh to see the latest results.",
      );
    } else {
      setReviewActionError(null);
    }

    router.refresh();
  }

  function handleRunReview() {
    setReviewActionError(null);
    setLocalReviewStatus(null);
    // Mirror runReview: prior findings are deleted as soon as the run starts.
    setFindings([]);
    setSelectedFindingId(null);

    startReviewTransition(async () => {
      try {
        applyReviewResult(await runSnippetReview(snippet.id));
      } catch {
        setReviewActionError("Couldn't run the review. Please try again.");
        router.refresh();
      }
    });
  }

  useEffect(() => {
    if (!autoStartReview || autoStartedReviewIds.has(snippet.id)) {
      return;
    }

    autoStartedReviewIds.add(snippet.id);
    router.replace(`/snippets/${snippet.id}`);

    // New snippets have no findings yet; skip the sync clears used by the
    // manual Run review button so this effect stays lint-clean.
    startReviewTransition(async () => {
      try {
        const result = await runSnippetReview(snippet.id);

        if (!result.ok) {
          setReviewActionError(result.error);
          router.refresh();
          return;
        }

        setLocalReviewStatus(result.status);
        setFindings(result.findings);
        setSelectedFindingId(defaultSelectedFindingId(result.findings));

        if (result.status === "FAILED") {
          setReviewActionError(
            result.errorMessage ?? "Review failed. Please try again.",
          );
        } else if (result.status === "SUPERSEDED") {
          setReviewActionError(
            result.errorMessage ??
              "Another review finished first. Refresh to see the latest results.",
          );
        } else {
          setReviewActionError(null);
        }

        router.refresh();
      } catch {
        setReviewActionError("Couldn't run the review. Please try again.");
        router.refresh();
      }
    });
  }, [autoStartReview, router, snippet.id, startReviewTransition]);

  function handleAccepted(result: AcceptedFindingState) {
    setCode(result.code);
    setSavedCode(result.code);
    setContentVersion(result.contentVersion);
    const canonicalById = new Map(
      result.findings.map((finding) => [finding.id, finding]),
    );
    setFindings((current) =>
      current.map((finding) => {
        const canonical = canonicalById.get(finding.id);
        return canonical ? { ...finding, ...canonical } : finding;
      }),
    );
    router.refresh();
  }

  function handleDismissed(findingId: string) {
    setFindings((current) =>
      current.map((finding) =>
        finding.id === findingId
          ? { ...finding, resolution: "DISMISSED" }
          : finding,
      ),
    );
    router.refresh();
  }

  const failedMessage =
    reviewActionError ??
    // Prefer local status after a re-run so a COMPLETED result is not masked by
    // stale FAILED props while refresh is in flight. Also hide while reviewing.
    (!isReviewPending &&
    localReviewStatus == null &&
    snippet.reviewStatus === "FAILED"
      ? snippet.reviewErrorMessage
      : null);

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
                disabled={isReviewPending || isFindingActionPending}
                className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted disabled:opacity-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleRunReview}
                disabled={isReviewPending || isFindingActionPending}
                className="inline-flex h-8 items-center justify-center rounded-md bg-accent px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isReviewPending ? "Reviewing…" : "Run review"}
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
              disabled={isPending}
              className="h-10 w-full rounded-md border border-border bg-surface px-3 text-xl font-semibold text-foreground outline-none ring-accent/30 placeholder:text-muted focus:border-accent focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
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
              disabled={isPending}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <ReviewStatusBadge status={displayReviewStatus} />
            <span className="text-sm text-muted">
              Created {formatDateTime(snippet.createdAt)}
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
            <ReviewStatusBadge status={displayReviewStatus} />
            <span className="text-sm text-muted">
              Created {formatDateTime(snippet.createdAt)}
            </span>
          </div>
        </div>
      )}

      {failedMessage ? (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {failedMessage}
        </div>
      ) : null}

      {errors.form?.[0] ? (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {errors.form[0]}
        </div>
      ) : null}

      {isReviewPending ? (
        <div className="mb-6 rounded-lg border border-teal-200 bg-accent-soft/60 px-4 py-3 text-sm text-accent">
          Review in progress — analyzing the snippet with the configured model…
        </div>
      ) : null}

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <CodeEditor
            value={isEditing ? code : savedCode}
            language={isEditing ? language : savedLanguage}
            readOnly={!isEditing || isPending}
            height="520px"
            highlightRange={highlightRange}
            onChange={isEditing && !isPending ? setCode : undefined}
          />
          {errors.code?.[0] ? (
            <p className="mt-1.5 text-xs text-rose-600">{errors.code[0]}</p>
          ) : null}
        </div>

        {!isEditing ? (
          <aside className="w-full shrink-0 md:w-[22rem] lg:w-[26rem]">
            <FindingsPanel
              findings={findings}
              reviewStatus={displayReviewStatus}
              selectedFindingId={selectedFindingId}
              onSelectFinding={setSelectedFindingId}
              onAccepted={handleAccepted}
              onDismissed={handleDismissed}
              onActionPendingChange={setIsFindingActionPending}
            />
          </aside>
        ) : null}
      </div>
    </>
  );
}
