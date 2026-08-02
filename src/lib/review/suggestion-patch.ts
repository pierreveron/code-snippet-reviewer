export type SuggestionPatch = {
  before: string[];
  after: string[];
};

/**
 * Parse a GitHub-style suggestion hunk stored in `suggestedFix`.
 *
 * Expected form (no @@ header). The character after `-`/`+` is the first
 * character of the source line (including its indentation):
 *   -  return a - b;
 *   +  return a + b;
 *
 * Also accepts a plain replacement (no +/- prefixes) as after-only.
 */
export function parseSuggestionPatch(patch: string): SuggestionPatch {
  const normalized = patch.replace(/^\n+/, "").replace(/\s+$/, "");
  if (!normalized) {
    return { before: [], after: [] };
  }

  const lines = normalized.split("\n");
  const hasDiffMarkers = lines.some(
    (line) => line.startsWith("-") || line.startsWith("+"),
  );

  if (!hasDiffMarkers) {
    return { before: [], after: lines };
  }

  const before: string[] = [];
  const after: string[] = [];

  for (const line of lines) {
    if (line.startsWith("-")) {
      before.push(line.slice(1));
      continue;
    }
    if (line.startsWith("+")) {
      after.push(line.slice(1));
      continue;
    }
  }

  return { before, after };
}

export function formatSuggestionPatch(patch: SuggestionPatch): string {
  return [
    ...patch.before.map((line) => `-${line}`),
    ...patch.after.map((line) => `+${line}`),
  ].join("\n");
}

export function replacementFromPatch(patch: string): string {
  return parseSuggestionPatch(patch).after.join("\n");
}

export function originalFromPatch(patch: string): string {
  return parseSuggestionPatch(patch).before.join("\n");
}
