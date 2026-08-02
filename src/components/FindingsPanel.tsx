"use client";

import { FindingItem } from "@/components/FindingItem";
import type { SnippetFinding } from "@/lib/snippets";

type FindingsPanelProps = {
  findings: SnippetFinding[];
  selectedFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
  onAccepted: (findingId: string, code: string) => void;
  onDismissed: (findingId: string) => void;
};

export function FindingsPanel({
  findings,
  selectedFindingId,
  onSelectFinding,
  onAccepted,
  onDismissed,
}: FindingsPanelProps) {
  if (findings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-muted/60 px-4 py-8 text-center">
        <p className="text-sm font-medium text-foreground">No findings yet</p>
        <p className="mt-1 text-sm text-muted">
          Run a review to analyze this snippet.
        </p>
      </div>
    );
  }

  const openCount = findings.filter((f) => f.resolution === "OPEN").length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Findings</h2>
        <p className="text-xs text-muted">
          {openCount} open · {findings.length} total
        </p>
      </div>
      <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {findings.map((finding) => (
          <FindingItem
            key={finding.id}
            finding={finding}
            selected={finding.id === selectedFindingId}
            onSelect={() => onSelectFinding(finding.id)}
            onAccepted={onAccepted}
            onDismissed={onDismissed}
          />
        ))}
      </ul>
    </div>
  );
}
