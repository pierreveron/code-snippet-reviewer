import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildSuggestionDiff } from "@/components/SuggestedChangeDiff";

describe("buildSuggestionDiff", () => {
  it("highlights changed characters from a frozen +/- hunk", () => {
    const rows = buildSuggestionDiff("-  return a - b;\n+  return a + b;");

    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0]?.segments, [
      { text: "  return a ", changed: false },
      { text: "-", changed: true },
      { text: " b;", changed: false },
    ]);
    assert.deepEqual(rows[1]?.segments, [
      { text: "  return a ", changed: false },
      { text: "+", changed: true },
      { text: " b;", changed: false },
    ]);
  });

  it("keeps the red side after apply because the hunk is self-contained", () => {
    const rows = buildSuggestionDiff("-  return a - b;\n+  return a + b;");
    assert.equal(rows[0]?.segments.find((s) => s.changed)?.text, "-");
    assert.equal(rows[1]?.segments.find((s) => s.changed)?.text, "+");
  });

  it("marks whole lines when old and new counts differ", () => {
    const rows = buildSuggestionDiff("-line one\n-line two\n+only one");

    assert.deepEqual(rows, [
      {
        type: "remove",
        segments: [{ text: "line one", changed: true }],
      },
      {
        type: "remove",
        segments: [{ text: "line two", changed: true }],
      },
      {
        type: "add",
        segments: [{ text: "only one", changed: true }],
      },
    ]);
  });
});
