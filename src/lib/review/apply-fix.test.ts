import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { alignReplacementIndent } from "@/lib/review/apply-fix";

describe("alignReplacementIndent", () => {
  it("uses the first non-empty original line when the range starts blank", () => {
    const aligned = alignReplacementIndent(
      ["", "  if (ready) {", "    return true;", "  }"],
      "return false;",
    );

    assert.equal(aligned, "  return false;");
  });

  it("preserves relative indent inside the replacement", () => {
    const aligned = alignReplacementIndent(
      ["  if (ready) {", "    return true;", "  }"],
      "if (ready) {\n  return false;\n}",
    );

    assert.equal(aligned, "  if (ready) {\n    return false;\n  }");
  });
});
