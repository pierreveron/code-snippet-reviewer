"use client";

import { SuggestedChangeDiff } from "@/components/SuggestedChangeDiff";
import type {
  FindingCategory,
  FindingSeverity,
} from "@/generated/prisma/enums";
import { decodeSuggestionPatch } from "@/lib/review/suggestion-patch";
import type { SnippetFinding } from "@/lib/snippets";

type FindingItemProps = {
  finding: SnippetFinding;
  selected: boolean;
  onSelect: () => void;
  actionsDisabled: boolean;
  pendingAction: "accept" | "dismiss" | null;
  actionError: string | null;
  onAccept: () => void;
  onDismiss: () => void;
};

const severityStyles: Record<FindingSeverity, string> = {
  CRITICAL: "bg-rose-50 text-rose-800 ring-rose-200/80",
  WARNING: "bg-amber-50 text-amber-900 ring-amber-200/80",
  INFO: "bg-sky-50 text-sky-900 ring-sky-200/80",
};

const categoryLabels: Record<FindingCategory, string> = {
  BUG: "Bug",
  SECURITY: "Security",
  PERFORMANCE: "Performance",
  STYLE: "Style",
  OTHER: "Other",
};

function lineLabel(startLine: number, endLine: number | null): string {
  if (endLine != null && endLine !== startLine) {
    return `L${startLine}–${endLine}`;
  }
  return `L${startLine}`;
}

function optionId(findingId: string): string {
  return `finding-option-${findingId}`;
}

export function FindingItem({
  finding,
  selected,
  onSelect,
  actionsDisabled,
  pendingAction,
  actionError,
  onAccept,
  onDismiss,
}: FindingItemProps) {
  const isResolved = finding.resolution !== "OPEN";
  const hasSuggestion = finding.suggestionPatch
    ? decodeSuggestionPatch(finding.suggestionPatch) !== null
    : false;

  return (
    <li
      id={optionId(finding.id)}
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className="cursor-pointer"
    >
      <article
        className={[
          "w-full overflow-hidden rounded-lg border px-3 py-3 text-left transition-colors",
          selected
            ? "border-accent bg-accent-soft/50 ring-1 ring-inset ring-accent/30"
            : "border-border bg-surface",
          isResolved ? "opacity-70" : "",
        ].join(" ")}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-medium text-muted">
            {lineLabel(finding.startLine, finding.endLine)}
          </span>
          <span
            className={[
              "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
              severityStyles[finding.severity],
            ].join(" ")}
          >
            {finding.severity.charAt(0) +
              finding.severity.slice(1).toLowerCase()}
          </span>
          <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
            {categoryLabels[finding.category]}
          </span>
          {isResolved ? (
            <span className="text-[11px] font-medium text-muted">
              {finding.resolution === "ACCEPTED"
                ? "Applied"
                : finding.resolution === "STALE"
                  ? "Needs re-review"
                  : "Dismissed"}
            </span>
          ) : null}
        </div>

        <p className="mt-2 text-sm leading-relaxed text-foreground">
          {finding.description}
        </p>

        {finding.suggestionPatch && hasSuggestion ? (
          <SuggestedChangeDiff
            suggestionPatch={finding.suggestionPatch}
            defaultOpen={finding.resolution === "OPEN"}
          />
        ) : null}

        {actionError ? (
          <p className="mt-2 text-xs text-rose-600">{actionError}</p>
        ) : null}

        {finding.resolution === "OPEN" ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {hasSuggestion ? (
              <button
                type="button"
                disabled={actionsDisabled}
                onClick={(event) => {
                  event.stopPropagation();
                  onAccept();
                }}
                className="inline-flex h-7 items-center rounded-md bg-accent px-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {pendingAction === "accept"
                  ? "Applying…"
                  : "Apply suggestion"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={actionsDisabled}
              onClick={(event) => {
                event.stopPropagation();
                onDismiss();
              }}
              className="inline-flex h-7 items-center rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted disabled:opacity-50"
            >
              {pendingAction === "dismiss" ? "Dismissing…" : "Dismiss"}
            </button>
          </div>
        ) : null}
      </article>
    </li>
  );
}

export { optionId as findingOptionId };
