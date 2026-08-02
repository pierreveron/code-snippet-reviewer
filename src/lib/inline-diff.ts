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

/**
 * Character-level LCS diff for a single line pair (GitHub-style intra-line).
 */
export function diffChars(
  before: string,
  after: string,
): { before: DiffSegment[]; after: DiffSegment[] } {
  const n = before.length;
  const m = after.length;

  if (n === 0 && m === 0) {
    return { before: [], after: [] };
  }
  if (n === 0) {
    return {
      before: [],
      after: m ? [{ text: after, changed: true }] : [],
    };
  }
  if (m === 0) {
    return {
      before: [{ text: before, changed: true }],
      after: [],
    };
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array<number>(m + 1).fill(0),
  );

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i]![j] =
        before[i] === after[j]
          ? (dp[i + 1]![j + 1] ?? 0) + 1
          : Math.max(dp[i + 1]![j] ?? 0, dp[i]![j + 1] ?? 0);
    }
  }

  const beforeSegs: DiffSegment[] = [];
  const afterSegs: DiffSegment[] = [];
  let i = 0;
  let j = 0;

  while (i < n && j < m) {
    if (before[i] === after[j]) {
      pushSegment(beforeSegs, before[i]!, false);
      pushSegment(afterSegs, after[j]!, false);
      i += 1;
      j += 1;
    } else if ((dp[i + 1]![j] ?? 0) >= (dp[i]![j + 1] ?? 0)) {
      pushSegment(beforeSegs, before[i]!, true);
      i += 1;
    } else {
      pushSegment(afterSegs, after[j]!, true);
      j += 1;
    }
  }

  while (i < n) {
    pushSegment(beforeSegs, before[i]!, true);
    i += 1;
  }
  while (j < m) {
    pushSegment(afterSegs, after[j]!, true);
    j += 1;
  }

  return { before: beforeSegs, after: afterSegs };
}
