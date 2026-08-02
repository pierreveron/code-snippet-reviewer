import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { diffChars } from "@/lib/inline-diff";

describe("diffChars", () => {
  it("highlights a single changed character", () => {
    const { before, after } = diffChars("  return a - b;", "  return a + b;");

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

  it("returns unchanged segments when lines are identical", () => {
    const { before, after } = diffChars("same", "same");

    assert.deepEqual(before, [{ text: "same", changed: false }]);
    assert.deepEqual(after, [{ text: "same", changed: false }]);
  });

  it("marks the whole after line when before is empty", () => {
    const { before, after } = diffChars("", "added");

    assert.deepEqual(before, []);
    assert.deepEqual(after, [{ text: "added", changed: true }]);
  });

  it("marks the whole before line when after is empty", () => {
    const { before, after } = diffChars("removed", "");

    assert.deepEqual(before, [{ text: "removed", changed: true }]);
    assert.deepEqual(after, []);
  });

  it("highlights an inserted token", () => {
    const { before, after } = diffChars("hello world", "hello there world");

    // Before is an LCS subsequence of after, so it stays fully unchanged.
    assert.deepEqual(before, [{ text: "hello world", changed: false }]);
    assert.deepEqual(after, [
      { text: "hello ", changed: false },
      { text: "there ", changed: true },
      { text: "world", changed: false },
    ]);
  });

  it("highlights a deleted token", () => {
    const { before, after } = diffChars("hello there world", "hello world");

    assert.deepEqual(before, [
      { text: "hello ", changed: false },
      { text: "there ", changed: true },
      { text: "world", changed: false },
    ]);
    // After is an LCS subsequence of before, so it stays fully unchanged.
    assert.deepEqual(after, [{ text: "hello world", changed: false }]);
  });

  it("merges adjacent changed segments", () => {
    const { before, after } = diffChars("abc", "axy");

    assert.deepEqual(before, [
      { text: "a", changed: false },
      { text: "bc", changed: true },
    ]);
    assert.deepEqual(after, [
      { text: "a", changed: false },
      { text: "xy", changed: true },
    ]);
  });
});
