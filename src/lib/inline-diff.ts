import { diffWordsWithSpace, type Change } from "diff";

export type DiffSegment = {
  text: string;
  changed: boolean;
};

function pushSegment(
  target: DiffSegment[],
  text: string,
  changed: boolean,
): void {
  if (!text) {
    return;
  }
  const last = target[target.length - 1];
  if (last && last.changed === changed) {
    last.text += text;
    return;
  }
  target.push({ text, changed });
}

function partsToSides(parts: Change[]): {
  before: DiffSegment[];
  after: DiffSegment[];
} {
  const before: DiffSegment[] = [];
  const after: DiffSegment[] = [];

  for (const part of parts) {
    if (part.added) {
      pushSegment(after, part.value, true);
    } else if (part.removed) {
      pushSegment(before, part.value, true);
    } else {
      pushSegment(before, part.value, false);
      pushSegment(after, part.value, false);
    }
  }

  return { before, after };
}

/**
 * Word-level intra-line diff via the `diff` package (jsdiff).
 * Keeps identifiers like `console.log` intact instead of char-splitting them.
 */
export function diffLinePair(
  before: string,
  after: string,
): { before: DiffSegment[]; after: DiffSegment[] } {
  if (before === after) {
    return {
      before: before ? [{ text: before, changed: false }] : [],
      after: after ? [{ text: after, changed: false }] : [],
    };
  }
  if (!before) {
    return {
      before: [],
      after: after ? [{ text: after, changed: true }] : [],
    };
  }
  if (!after) {
    return {
      before: [{ text: before, changed: true }],
      after: [],
    };
  }

  return partsToSides(diffWordsWithSpace(before, after));
}
