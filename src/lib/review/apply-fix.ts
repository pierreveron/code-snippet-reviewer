function leadingWhitespace(line: string): string {
  const match = /^[ \t]*/.exec(line);
  return match?.[0] ?? "";
}

/** Exact text of inclusive 1-based lines [startLine, endLine] from `code`. */
export function extractLineRange(
  code: string,
  startLine: number,
  endLine: number | null,
): string {
  const lines = code.split("\n");
  const start = Math.max(1, startLine);
  const end = Math.max(start, endLine ?? startLine);
  return lines.slice(start - 1, end).join("\n");
}

/**
 * Rebase replacement indent onto the original block's first non-empty line.
 *
 * Models often under-indent (`return x`) or over-indent (`   console.log`)
 * relative to the targeted lines. Preserve relative indentation inside the
 * replacement, but make the first non-empty line match the original indent.
 */
export function alignReplacementIndent(
  originalLines: string[],
  replacement: string,
): string {
  if (replacement.length === 0 || originalLines.length === 0) {
    return replacement;
  }

  const hadTrailingNewline = replacement.endsWith("\n");
  const replacementLines = replacement.replace(/\n$/, "").split("\n");
  const originalIndent = leadingWhitespace(
    originalLines.find((line) => line.trim().length > 0) ?? "",
  );

  const firstNonEmpty = replacementLines.find((line) => line.trim().length > 0);
  if (!firstNonEmpty) {
    return replacement;
  }

  const baseReplacementIndent = leadingWhitespace(firstNonEmpty);
  if (baseReplacementIndent === originalIndent) {
    return replacement;
  }

  const baseLen = baseReplacementIndent.length;

  const aligned = replacementLines.map((line) => {
    if (line.length === 0) {
      return line;
    }

    const lineIndent = leadingWhitespace(line);
    const content = line.slice(lineIndent.length);
    const relativeIndent =
      lineIndent.length >= baseLen ? lineIndent.slice(baseLen) : "";

    return `${originalIndent}${relativeIndent}${content}`;
  });

  const joined = aligned.join("\n");
  return hadTrailingNewline ? `${joined}\n` : joined;
}

/**
 * Replace inclusive 1-based lines [startLine, endLine] with replacement text.
 * Replacement may contain multiple lines (or be empty to delete the range).
 */
export function applyLineReplacement(
  code: string,
  startLine: number,
  endLine: number,
  replacement: string,
): string {
  const lines = code.split("\n");
  const startIndex = startLine - 1;
  const endIndex = endLine - 1;

  if (startIndex < 0 || endIndex >= lines.length || startIndex > endIndex) {
    throw new Error(
      `Invalid line range ${startLine}-${endLine} for ${lines.length}-line snippet`,
    );
  }

  const originalLines = lines.slice(startIndex, endIndex + 1);
  const aligned = alignReplacementIndent(originalLines, replacement);

  const replacementLines =
    aligned.length === 0 ? [] : aligned.replace(/\n$/, "").split("\n");

  const next = [
    ...lines.slice(0, startIndex),
    ...replacementLines,
    ...lines.slice(endIndex + 1),
  ];

  return next.join("\n");
}

export function lineDeltaForReplacement(
  startLine: number,
  endLine: number,
  replacement: string,
): number {
  const oldCount = endLine - startLine + 1;
  const newCount =
    replacement.length === 0
      ? 0
      : replacement.replace(/\n$/, "").split("\n").length;
  return newCount - oldCount;
}

/**
 * Shift finding line numbers that sit entirely after an applied range.
 * Overlapping / nested findings are left unchanged (may be stale).
 */
export function shiftFindingLinesAfterApply<
  T extends { startLine: number; endLine: number | null },
>(
  findings: T[],
  appliedStart: number,
  appliedEnd: number,
  delta: number,
): T[] {
  if (delta === 0) {
    return findings;
  }

  return findings.map((finding) => {
    if (finding.startLine <= appliedEnd) {
      return finding;
    }

    const endLine = finding.endLine == null ? null : finding.endLine + delta;

    return {
      ...finding,
      startLine: finding.startLine + delta,
      endLine,
    };
  });
}
