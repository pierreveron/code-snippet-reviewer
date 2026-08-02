import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { diffLinePair } from "@/lib/inline-diff";

describe("diffLinePair", () => {
  it("highlights a single changed operator", () => {
    const { before, after } = diffLinePair(
      "  return a - b;",
      "  return a + b;",
    );

    assert.deepEqual(before, [
      { text: "  return a ", changed: false },
      { text: "-", changed: true },
      { text: " b;", changed: false },
    ]);
    assert.deepEqual(after, [
      { text: "  return a ", changed: false },
      { text: "+", changed: true },
      { text: " b;", changed: false },
    ]);
  });

  it("keeps identifiers like console.log as one changed token", () => {
    const { before, after } = diffLinePair(
      'console.log("Hello world!");',
      'print("Hello world!")',
    );

    assert.deepEqual(before, [
      { text: "console.log", changed: true },
      { text: '("Hello world!")', changed: false },
      { text: ";", changed: true },
    ]);
    assert.deepEqual(after, [
      { text: "print", changed: true },
      { text: '("Hello world!")', changed: false },
    ]);
  });

  it("returns unchanged segments when lines are identical", () => {
    const { before, after } = diffLinePair("same", "same");

    assert.deepEqual(before, [{ text: "same", changed: false }]);
    assert.deepEqual(after, [{ text: "same", changed: false }]);
  });

  it("marks the whole after line when before is empty", () => {
    const { before, after } = diffLinePair("", "added");

    assert.deepEqual(before, []);
    assert.deepEqual(after, [{ text: "added", changed: true }]);
  });

  it("marks the whole before line when after is empty", () => {
    const { before, after } = diffLinePair("removed", "");

    assert.deepEqual(before, [{ text: "removed", changed: true }]);
    assert.deepEqual(after, []);
  });
});
