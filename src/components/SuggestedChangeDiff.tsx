"use client";

import { useId, useState } from "react";

import { alignReplacementIndent } from "@/lib/review/apply-fix";
import { parseSuggestionPatch } from "@/lib/review/suggestion-patch";
import { diffLinePair, type DiffSegment } from "@/lib/inline-diff";

type DiffRow = {
  type: "remove" | "add";
  segments: DiffSegment[];
};

function wholeLineSegments(text: string, changed: boolean): DiffSegment[] {
  if (!text) {
    return [{ text: " ", changed: false }];
  }
  return [{ text, changed }];
}

/**
 * Build a GitHub-style suggestion hunk from a stored +/- patch in suggestedFix.
 * The red side comes from the model's `-` lines, not from live snippet code.
 */
export function buildSuggestionDiff(suggestedFix: string): DiffRow[] {
  const { before, after } = parseSuggestionPatch(suggestedFix);
  const oldLines = before;
  const aligned =
    oldLines.length > 0
      ? alignReplacementIndent(oldLines, after.join("\n"))
      : after.join("\n");
  const newLines =
    aligned.length === 0 ? [] : aligned.replace(/\n$/, "").split("\n");
  const rows: DiffRow[] = [];

  if (oldLines.length === newLines.length && oldLines.length > 0) {
    for (let index = 0; index < oldLines.length; index += 1) {
      const beforeLine = oldLines[index] ?? "";
      const afterLine = newLines[index] ?? "";

      if (beforeLine === afterLine) {
        rows.push({
          type: "remove",
          segments: wholeLineSegments(beforeLine, false),
        });
        rows.push({
          type: "add",
          segments: wholeLineSegments(afterLine, false),
        });
        continue;
      }

      const { before: beforeSegs, after: afterSegs } = diffLinePair(
        beforeLine,
        afterLine,
      );
      rows.push({
        type: "remove",
        segments: beforeSegs.length
          ? beforeSegs
          : wholeLineSegments(" ", false),
      });
      rows.push({
        type: "add",
        segments: afterSegs.length ? afterSegs : wholeLineSegments(" ", false),
      });
    }
    return rows;
  }

  for (const text of oldLines) {
    rows.push({ type: "remove", segments: wholeLineSegments(text, true) });
  }
  for (const text of newLines) {
    rows.push({ type: "add", segments: wholeLineSegments(text, true) });
  }
  return rows;
}

type SuggestedChangeDiffProps = {
  suggestedFix: string;
  defaultOpen?: boolean;
};

function DiffSegments({
  segments,
  variant,
}: {
  segments: DiffSegment[];
  variant: "remove" | "add";
}) {
  const changedClass =
    variant === "remove"
      ? "rounded-[2px] bg-[#ffcecb]"
      : "rounded-[2px] bg-[#abf2bc]";

  return (
    <span className="min-w-0 flex-1 pr-2.5">
      {segments.map((segment, index) => (
        <span
          key={`${index}-${segment.changed}-${segment.text.slice(0, 8)}`}
          className={segment.changed ? changedClass : undefined}
        >
          {segment.text || " "}
        </span>
      ))}
    </span>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={[
        "h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform",
        open ? "rotate-90" : "",
      ].join(" ")}
    >
      <path
        fill="currentColor"
        d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z"
      />
    </svg>
  );
}

export function SuggestedChangeDiff({
  suggestedFix,
  defaultOpen = true,
}: SuggestedChangeDiffProps) {
  const [open, setOpen] = useState(defaultOpen);
  const rows = buildSuggestionDiff(suggestedFix);
  const panelId = useId();

  return (
    <div className="mt-2 overflow-hidden rounded-md border border-border bg-[#f6f8fa]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className={[
          "flex w-full items-center gap-1.5 bg-[#f6f8fa] px-2.5 py-1.5 text-left text-[11px] font-medium text-slate-600",
          "outline-none transition-colors hover:bg-slate-100/80 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40",
          open ? "border-b border-border" : "",
        ].join(" ")}
      >
        <ChevronIcon open={open} />
        Suggested change
      </button>

      {open ? (
        <div
          id={panelId}
          className="overflow-x-auto font-mono text-[11px] leading-[18px]"
          role="table"
          aria-label="Suggested change diff"
        >
          {rows.map((row, index) => {
            const isRemove = row.type === "remove";
            return (
              <div
                key={`${row.type}-${index}`}
                role="row"
                className={[
                  "flex whitespace-pre",
                  isRemove
                    ? "bg-[#ffebe9] text-[#82071e]"
                    : "bg-[#dafbe1] text-[#116329]",
                ].join(" ")}
              >
                <span
                  className={[
                    "w-5 shrink-0 select-none text-center",
                    isRemove ? "text-[#cf222e]" : "text-[#1a7f37]",
                  ].join(" ")}
                  aria-hidden
                >
                  {isRemove ? "-" : "+"}
                </span>
                <DiffSegments segments={row.segments} variant={row.type} />
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
