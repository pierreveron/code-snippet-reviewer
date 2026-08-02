import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatSuggestionPatch,
  originalFromPatch,
  parseSuggestionPatch,
  replacementFromPatch,
} from "@/lib/review/suggestion-patch";

describe("suggestion-patch", () => {
  it("parses a minus/plus hunk", () => {
    const patch = "-  return a - b;\n+  return a + b;";
    assert.deepEqual(parseSuggestionPatch(patch), {
      before: ["  return a - b;"],
      after: ["  return a + b;"],
    });
    assert.equal(originalFromPatch(patch), "  return a - b;");
    assert.equal(replacementFromPatch(patch), "  return a + b;");
  });

  it("treats plain text as after-only", () => {
    assert.deepEqual(parseSuggestionPatch("  return a + b;"), {
      before: [],
      after: ["  return a + b;"],
    });
  });

  it("round-trips through formatSuggestionPatch", () => {
    const formatted = formatSuggestionPatch({
      before: ["  return a - b;"],
      after: ["  return a + b;"],
    });
    assert.equal(formatted, "-  return a - b;\n+  return a + b;");
    assert.deepEqual(parseSuggestionPatch(formatted), {
      before: ["  return a - b;"],
      after: ["  return a + b;"],
    });
  });

  it("round-trips replacement lines that begin with +", () => {
    const formatted = formatSuggestionPatch({
      before: ["i++"],
      after: ["++i"],
    });
    assert.equal(formatted, "-i++\n+++i");
    assert.deepEqual(parseSuggestionPatch(formatted), {
      before: ["i++"],
      after: ["++i"],
    });
    assert.equal(replacementFromPatch(formatted), "++i");
  });

  it("keeps plain ++i as after-only (not a + marker line)", () => {
    assert.deepEqual(parseSuggestionPatch("++i"), {
      before: [],
      after: ["++i"],
    });
    assert.equal(replacementFromPatch("++i"), "++i");
  });

  it("keeps plain lines that begin with - as after-only", () => {
    assert.deepEqual(parseSuggestionPatch("-option"), {
      before: [],
      after: ["-option"],
    });
  });
});
