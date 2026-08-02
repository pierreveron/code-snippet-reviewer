import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  decodeSuggestionPatch,
  encodeSuggestionPatch,
  originalLinesFromPatch,
  replacementLinesFromPatch,
} from "@/lib/review/suggestion-patch";

describe("suggestion-patch", () => {
  const cases = [
    {
      name: "ordinary replacement",
      before: ["  return a - b;"],
      after: ["  return a + b;"],
    },
    { name: "deletion", before: ["unused();"], after: [] },
    { name: "single blank line", before: ["unused();"], after: [""] },
    {
      name: "leading and trailing blank lines",
      before: ["old();"],
      after: ["", "new();", ""],
    },
    { name: "plus-led source", before: ["i++"], after: ["++i"] },
    { name: "minus-led source", before: ["option"], after: ["-option"] },
  ] as const;

  for (const testCase of cases) {
    it(`round-trips ${testCase.name}`, () => {
      const encoded = encodeSuggestionPatch({
        before: [...testCase.before],
        after: [...testCase.after],
      });

      assert.deepEqual(decodeSuggestionPatch(encoded), {
        version: 1,
        before: testCase.before,
        after: testCase.after,
      });
      assert.deepEqual(originalLinesFromPatch(encoded), testCase.before);
      assert.deepEqual(replacementLinesFromPatch(encoded), testCase.after);
    });
  }

  it("rejects malformed or unknown patch payloads", () => {
    assert.equal(decodeSuggestionPatch("not json"), null);
    assert.equal(
      decodeSuggestionPatch(
        JSON.stringify({ version: 2, before: ["a"], after: ["b"] }),
      ),
      null,
    );
    assert.equal(replacementLinesFromPatch("{}"), null);
  });
});
