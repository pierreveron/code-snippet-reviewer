"use client";

import { useState, useTransition } from "react";

import { acceptFinding, dismissFinding } from "@/app/actions/reviews";
import { SuggestedChangeDiff } from "@/components/SuggestedChangeDiff";
import type {
  FindingCategory,
  FindingSeverity,
} from "@/generated/prisma/enums";
import type { SnippetFinding } from "@/lib/snippets";

type FindingItemProps = {
  finding: SnippetFinding;
  selected: boolean;
  onSelect: () => void;
  onAccepted: (findingId: string, code: string) => void;
  onDismissed: (findingId: string) => void;
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

export function FindingItem({
  finding,
  selected,
  onSelect,
  onAccepted,
  onDismissed,
}: FindingItemProps) {
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const isResolved = finding.resolution !== "OPEN";
  const hasSuggestion = Boolean(finding.suggestedFix);

  function handleAccept() {
    setActionError(null);
    startTransition(async () => {
      const result = await acceptFinding(finding.id);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      onAccepted(finding.id, result.code);
    });
  }

  function handleDismiss() {
    setActionError(null);
    startTransition(async () => {
      const result = await dismissFinding(finding.id);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      onDismissed(finding.id);
    });
  }

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
        className={[
          "w-full rounded-lg border px-3 py-3 text-left transition-colors",
          selected
            ? "border-accent bg-accent-soft/50 ring-1 ring-accent/30"
            : "border-border bg-surface hover:bg-surface-muted",
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
            {finding.severity.toLowerCase()}
          </span>
          <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
            {categoryLabels[finding.category]}
          </span>
          {isResolved ? (
            <span className="text-[11px] font-medium text-muted">
              {finding.resolution === "ACCEPTED" ? "Applied" : "Dismissed"}
            </span>
          ) : null}
        </div>

        <p className="mt-2 text-sm leading-relaxed text-foreground">
          {finding.description}
        </p>

        {finding.suggestedFix ? (
          <SuggestedChangeDiff suggestedFix={finding.suggestedFix} />
        ) : null}

        {actionError ? (
          <p className="mt-2 text-xs text-rose-600">{actionError}</p>
        ) : null}

        {finding.resolution === "OPEN" ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {hasSuggestion ? (
              <button
                type="button"
                disabled={isPending}
                onClick={(event) => {
                  event.stopPropagation();
                  handleAccept();
                }}
                className="inline-flex h-7 items-center rounded-md bg-accent px-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? "Applying…" : "Apply suggestion"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={isPending}
              onClick={(event) => {
                event.stopPropagation();
                handleDismiss();
              }}
              className="inline-flex h-7 items-center rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted disabled:opacity-50"
            >
              Dismiss
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
