"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";

import { FindingItem, findingOptionId } from "@/components/FindingItem";
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
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!selectedFindingId || !listRef.current) {
      return;
    }

    const option = listRef.current.querySelector<HTMLElement>(
      `#${CSS.escape(findingOptionId(selectedFindingId))}`,
    );
    option?.scrollIntoView({ block: "nearest" });
  }, [selectedFindingId]);

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
  const selectedIndex = findings.findIndex(
    (finding) => finding.id === selectedFindingId,
  );
  const activeDescendant =
    selectedFindingId != null
      ? findingOptionId(selectedFindingId)
      : undefined;

  function moveSelection(nextIndex: number) {
    const finding = findings[nextIndex];
    if (!finding) {
      return;
    }
    onSelectFinding(finding.id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (findings.length === 0) {
      return;
    }

    const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;

    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        event.preventDefault();
        moveSelection(Math.min(currentIndex + 1, findings.length - 1));
        break;
      case "ArrowUp":
      case "ArrowLeft":
        event.preventDefault();
        moveSelection(Math.max(currentIndex - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        moveSelection(0);
        break;
      case "End":
        event.preventDefault();
        moveSelection(findings.length - 1);
        break;
      default:
        break;
    }
  }

  function handleSelectFinding(findingId: string) {
    onSelectFinding(findingId);
    listRef.current?.focus();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id="findings-heading" className="text-sm font-semibold text-foreground">
          Findings
        </h2>
        <p className="text-xs text-muted">
          {openCount} open · {findings.length} total
        </p>
      </div>
      <ul
        ref={listRef}
        role="listbox"
        aria-labelledby="findings-heading"
        aria-activedescendant={activeDescendant}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1 outline-none"
      >
        {findings.map((finding) => (
          <FindingItem
            key={finding.id}
            finding={finding}
            selected={finding.id === selectedFindingId}
            onSelect={() => handleSelectFinding(finding.id)}
            onAccepted={onAccepted}
            onDismissed={onDismissed}
          />
        ))}
      </ul>
    </div>
  );
}
