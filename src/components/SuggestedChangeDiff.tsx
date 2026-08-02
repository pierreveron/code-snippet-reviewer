import { alignReplacementIndent } from "@/lib/review/apply-fix";
import { parseSuggestionPatch } from "@/lib/review/suggestion-patch";
import { diffChars, type DiffSegment } from "@/lib/inline-diff";

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

      const { before: beforeSegs, after: afterSegs } = diffChars(
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

export function SuggestedChangeDiff({ suggestedFix }: SuggestedChangeDiffProps) {
  const rows = buildSuggestionDiff(suggestedFix);

  return (
    <div className="mt-2 overflow-hidden rounded-md border border-border bg-[#f6f8fa]">
      <div className="border-b border-border bg-[#f6f8fa] px-2.5 py-1 text-[11px] font-medium text-slate-600">
        Suggested change
      </div>
      <div
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
    </div>
  );
}
