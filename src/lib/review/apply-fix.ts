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

/** Rebase replacement indentation while preserving every source line. */
export function alignReplacementLines(
  originalLines: string[],
  replacementLines: string[],
): string[] {
  if (replacementLines.length === 0 || originalLines.length === 0) {
    return replacementLines;
  }

  const originalIndent = leadingWhitespace(
    originalLines.find((line) => line.trim().length > 0) ?? "",
  );

  const firstNonEmpty = replacementLines.find((line) => line.trim().length > 0);
  if (!firstNonEmpty) {
    return replacementLines;
  }

  const baseReplacementIndent = leadingWhitespace(firstNonEmpty);
  if (baseReplacementIndent === originalIndent) {
    return replacementLines;
  }

  const baseLen = baseReplacementIndent.length;

  return replacementLines.map((line) => {
    if (line.length === 0) {
      return line;
    }

    const lineIndent = leadingWhitespace(line);
    const content = line.slice(lineIndent.length);
    const relativeIndentLength = lineIndent.length - baseLen;
    const rebasedIndent =
      relativeIndentLength >= 0
        ? `${originalIndent}${lineIndent.slice(baseLen)}`
        : originalIndent.slice(
            0,
            Math.max(0, originalIndent.length + relativeIndentLength),
          );

    return `${rebasedIndent}${content}`;
  });
}

/**
 * Replace inclusive 1-based lines [startLine, endLine] with replacement text.
 * Replacement may contain multiple lines (or be empty to delete the range).
 */
export function applyLineReplacement(
  code: string,
  startLine: number,
  endLine: number,
  replacementLines: string[],
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
  const aligned = alignReplacementLines(originalLines, replacementLines);

  const next = [
    ...lines.slice(0, startIndex),
    ...aligned,
    ...lines.slice(endIndex + 1),
  ];

  return next.join("\n");
}

export function lineDeltaForReplacement(
  startLine: number,
  endLine: number,
  replacementLines: string[],
): number {
  const oldCount = endLine - startLine + 1;
  return replacementLines.length - oldCount;
}

export type LocatedLineRange = {
  startLine: number;
  endLine: number;
};

/**
 * Prefer the finding's current range, then relocate an exact frozen `before`
 * block only when it occurs once in the current snippet.
 */
export function locateExactLineRange(
  code: string,
  expectedLines: string[],
  preferredStartLine: number,
): LocatedLineRange | null {
  if (expectedLines.length === 0) {
    return null;
  }

  const lines = code.split("\n");
  const matchesAt = (startIndex: number) =>
    expectedLines.every(
      (expected, offset) => lines[startIndex + offset] === expected,
    );
  const preferredStartIndex = preferredStartLine - 1;

  if (
    preferredStartIndex >= 0 &&
    preferredStartIndex + expectedLines.length <= lines.length &&
    matchesAt(preferredStartIndex)
  ) {
    return {
      startLine: preferredStartLine,
      endLine: preferredStartLine + expectedLines.length - 1,
    };
  }

  let uniqueStartIndex: number | null = null;
  for (
    let startIndex = 0;
    startIndex + expectedLines.length <= lines.length;
    startIndex += 1
  ) {
    if (!matchesAt(startIndex)) {
      continue;
    }
    if (uniqueStartIndex !== null) {
      return null;
    }
    uniqueStartIndex = startIndex;
  }

  if (uniqueStartIndex === null) {
    return null;
  }

  const startLine = uniqueStartIndex + 1;
  return {
    startLine,
    endLine: startLine + expectedLines.length - 1,
  };
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
