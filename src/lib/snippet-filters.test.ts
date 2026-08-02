import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hasActiveSnippetFilters,
  parseSnippetFilters,
} from "@/lib/snippet-filters";

describe("parseSnippetFilters", () => {
  it("accepts known language and status values", () => {
    assert.deepEqual(
      parseSnippetFilters({ language: "python", status: "reviewed" }),
      { language: "python", status: "reviewed" },
    );
  });

  it("ignores unknown values", () => {
    assert.deepEqual(
      parseSnippetFilters({ language: "cobol", status: "done" }),
      { language: undefined, status: undefined },
    );
  });

  it("uses the first value when params are arrays", () => {
    assert.deepEqual(
      parseSnippetFilters({
        language: ["typescript", "python"],
        status: ["failed", "reviewed"],
      }),
      { language: "typescript", status: "failed" },
    );
  });
});

describe("hasActiveSnippetFilters", () => {
  it("is true when any filter is set", () => {
    assert.equal(hasActiveSnippetFilters({ language: "go" }), true);
    assert.equal(hasActiveSnippetFilters({ status: "not_reviewed" }), true);
    assert.equal(hasActiveSnippetFilters({}), false);
  });
});
