import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clearSnippetFiltersHref,
  DEFAULT_SNIPPET_SORT,
  hasActiveSnippetFilters,
  nextSnippetSort,
  parseSnippetFilters,
  parseSnippetSort,
  withoutSnippetFilterParams,
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

describe("withoutSnippetFilterParams", () => {
  it("removes language and status but keeps sort and order", () => {
    const params = withoutSnippetFilterParams(
      "language=go&status=reviewed&sort=title&order=asc",
    );
    assert.equal(params.get("language"), null);
    assert.equal(params.get("status"), null);
    assert.equal(params.get("sort"), "title");
    assert.equal(params.get("order"), "asc");
  });
});

describe("clearSnippetFiltersHref", () => {
  it("returns / for the default sort", () => {
    assert.equal(clearSnippetFiltersHref(DEFAULT_SNIPPET_SORT), "/");
  });

  it("preserves non-default sort and order", () => {
    assert.equal(
      clearSnippetFiltersHref({ field: "title", order: "asc" }),
      "/?sort=title&order=asc",
    );
  });
});

describe("parseSnippetSort", () => {
  it("defaults to created desc", () => {
    assert.deepEqual(parseSnippetSort({}), DEFAULT_SNIPPET_SORT);
  });

  it("accepts known sort fields and orders", () => {
    assert.deepEqual(parseSnippetSort({ sort: "title", order: "asc" }), {
      field: "title",
      order: "asc",
    });
  });

  it("falls back to the field default order when order is missing", () => {
    assert.deepEqual(parseSnippetSort({ sort: "language" }), {
      field: "language",
      order: "asc",
    });
    assert.deepEqual(parseSnippetSort({ sort: "created" }), {
      field: "created",
      order: "desc",
    });
  });

  it("ignores unknown sort values", () => {
    assert.deepEqual(parseSnippetSort({ sort: "priority", order: "sideways" }), {
      field: "created",
      order: "desc",
    });
  });
});

describe("nextSnippetSort", () => {
  it("toggles order when the same field is clicked", () => {
    assert.deepEqual(
      nextSnippetSort({ field: "title", order: "asc" }, "title"),
      { field: "title", order: "desc" },
    );
  });

  it("switches field with its default order", () => {
    assert.deepEqual(
      nextSnippetSort({ field: "title", order: "asc" }, "created"),
      { field: "created", order: "desc" },
    );
  });
});
