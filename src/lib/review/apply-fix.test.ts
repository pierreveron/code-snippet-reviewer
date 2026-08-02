import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  alignReplacementLines,
  applyLineReplacement,
  locateExactLineRange,
} from "@/lib/review/apply-fix";

describe("alignReplacementLines", () => {
  it("uses the first non-empty original line when the range starts blank", () => {
    const aligned = alignReplacementLines(
      ["", "  if (ready) {", "    return true;", "  }"],
      ["return false;"],
    );

    assert.deepEqual(aligned, ["  return false;"]);
  });

  it("preserves relative indent inside the replacement", () => {
    const aligned = alignReplacementLines(
      ["  if (ready) {", "    return true;", "  }"],
      ["if (ready) {", "  return false;", "}"],
    );

    assert.deepEqual(aligned, [
      "  if (ready) {",
      "    return false;",
      "  }",
    ]);
  });

  it("preserves a closing brace dedented before the first replacement line", () => {
    const aligned = alignReplacementLines(
      ["    if (ready) {", "      return true;", "    }"],
      ["  if (ready) {", "    return false;", "}"],
    );

    assert.deepEqual(aligned, [
      "    if (ready) {",
      "      return false;",
      "  }",
    ]);
  });

  it("preserves a Python dedent before the first replacement line", () => {
    const aligned = alignReplacementLines(
      ["    if ready:", "        return current", "    return fallback"],
      ["        if ready:", "            return updated", "    return fallback"],
    );

    assert.deepEqual(aligned, [
      "    if ready:",
      "        return updated",
      "return fallback",
    ]);
  });

  it("preserves leading and trailing blank replacement lines", () => {
    assert.deepEqual(
      alignReplacementLines(["  old();"], ["", "new();", ""]),
      ["", "  new();", ""],
    );
  });
});

describe("applyLineReplacement", () => {
  it("distinguishes deletion from one blank replacement line", () => {
    const code = ["before", "target", "after"].join("\n");

    assert.equal(applyLineReplacement(code, 2, 2, []), "before\nafter");
    assert.equal(applyLineReplacement(code, 2, 2, [""]), "before\n\nafter");
  });
});

describe("locateExactLineRange", () => {
  it("uses the preferred range when it still matches", () => {
    assert.deepEqual(locateExactLineRange("a\nb\nc", ["b"], 2), {
      startLine: 2,
      endLine: 2,
    });
  });

  it("relocates a uniquely matching block", () => {
    assert.deepEqual(locateExactLineRange("inserted\na\nb\nc", ["b", "c"], 2), {
      startLine: 3,
      endLine: 4,
    });
  });

  it("rejects an ambiguous or missing block", () => {
    assert.equal(locateExactLineRange("a\nb\na\nb", ["a", "b"], 2), null);
    assert.equal(locateExactLineRange("a\nb", ["missing"], 1), null);
  });
});
