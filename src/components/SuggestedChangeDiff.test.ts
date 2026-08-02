import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildSuggestionDiff } from "@/components/SuggestedChangeDiff";
import { encodeSuggestionPatch } from "@/lib/review/suggestion-patch";

describe("buildSuggestionDiff", () => {
  it("highlights changed characters from a structured patch", () => {
    const rows = buildSuggestionDiff(
      encodeSuggestionPatch({
        before: ["  return a - b;"],
        after: ["  return a + b;"],
      }),
    );

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
    const rows = buildSuggestionDiff(
      encodeSuggestionPatch({
        before: ["  return a - b;"],
        after: ["  return a + b;"],
      }),
    );
    assert.equal(rows[0]?.segments.find((s) => s.changed)?.text, "-");
    assert.equal(rows[1]?.segments.find((s) => s.changed)?.text, "+");
  });

  it("marks whole lines when old and new counts differ", () => {
    const rows = buildSuggestionDiff(
      encodeSuggestionPatch({
        before: ["line one", "line two"],
        after: ["only one"],
      }),
    );

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

  it("renders a blank replacement line", () => {
    const rows = buildSuggestionDiff(
      encodeSuggestionPatch({ before: ["old"], after: [""] }),
    );

    assert.equal(rows.length, 2);
    assert.equal(rows[1]?.type, "add");
    assert.deepEqual(rows[1]?.segments, [{ text: " ", changed: false }]);
  });

  it("preserves a trailing blank replacement line", () => {
    const rows = buildSuggestionDiff(
      encodeSuggestionPatch({
        before: ["old"],
        after: ["new", ""],
      }),
    );

    assert.equal(rows.length, 3);
    assert.equal(rows[2]?.type, "add");
    assert.deepEqual(rows[2]?.segments, [{ text: " ", changed: false }]);
  });

  it("returns no rows for malformed stored patches", () => {
    assert.deepEqual(buildSuggestionDiff("not-json"), []);
  });
});
