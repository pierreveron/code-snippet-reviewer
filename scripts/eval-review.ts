import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { config } from "dotenv";

config({ path: ".env" });

import { analyzeSnippet } from "../src/lib/review";
import type { ReviewFinding } from "../src/lib/review";
import {
  fixtureSchema,
  severityMeetsMinimum,
  type Expectation,
  type ReviewFixture,
} from "../evals/review/types";
import { getReviewModelId } from "../src/lib/review/model";

const FIXTURES_DIR = path.join(process.cwd(), "evals/review/fixtures");
const LINE_TOLERANCE = 2;

function matchesExpectation(
  findings: ReviewFinding[],
  expectation: Expectation,
): { ok: boolean; reason: string } {
  const candidates = findings.filter((finding) => {
    if (
      expectation.category &&
      finding.category !== expectation.category
    ) {
      return false;
    }

    if (
      expectation.severityAtLeast &&
      !severityMeetsMinimum(finding.severity, expectation.severityAtLeast)
    ) {
      return false;
    }

    if (expectation.lineNear !== undefined) {
      const end = finding.endLine ?? finding.startLine;
      const near =
        Math.abs(finding.startLine - expectation.lineNear) <= LINE_TOLERANCE ||
        Math.abs(end - expectation.lineNear) <= LINE_TOLERANCE ||
        (finding.startLine <= expectation.lineNear &&
          end >= expectation.lineNear);
      if (!near) {
        return false;
      }
    }

    if (expectation.descriptionIncludes?.length) {
      const haystack = finding.description.toLowerCase();
      const hit = expectation.descriptionIncludes.some((needle) =>
        haystack.includes(needle.toLowerCase()),
      );
      if (!hit) {
        return false;
      }
    }

    return true;
  });

  if (candidates.length === 0) {
    return {
      ok: false,
      reason: `no finding matched ${JSON.stringify(expectation)}`,
    };
  }

  return { ok: true, reason: "matched" };
}

async function loadFixtures(): Promise<ReviewFixture[]> {
  const files = (await readdir(FIXTURES_DIR))
    .filter((name) => name.endsWith(".json"))
    .sort();

  const fixtures: ReviewFixture[] = [];

  for (const file of files) {
    const raw = await readFile(path.join(FIXTURES_DIR, file), "utf8");
    const parsed = fixtureSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      throw new Error(`Invalid fixture ${file}: ${parsed.error.message}`);
    }
    fixtures.push(parsed.data);
  }

  return fixtures;
}

async function main() {
  console.log("Review evals (live LLM — costs tokens)");
  console.log(`Model: ${getReviewModelId()}`);
  console.log("");

  const fixtures = await loadFixtures();
  let failed = 0;

  for (const fixture of fixtures) {
    process.stdout.write(`• ${fixture.id} ... `);

    try {
      const findings = await analyzeSnippet({
        language: fixture.language,
        code: fixture.code,
      });

      const failures: string[] = [];

      if (fixture.expectations.length === 0 && findings.length > 3) {
        failures.push(
          `expected few/no issues, got ${findings.length} findings`,
        );
      }

      for (const expectation of fixture.expectations) {
        const result = matchesExpectation(findings, expectation);
        if (!result.ok) {
          failures.push(result.reason);
        }
      }

      if (failures.length > 0) {
        failed += 1;
        console.log("FAIL");
        for (const failure of failures) {
          console.log(`    - ${failure}`);
        }
        console.log(
          `    findings: ${JSON.stringify(
            findings.map((f) => ({
              severity: f.severity,
              category: f.category,
              startLine: f.startLine,
              description: f.description,
            })),
            null,
            2,
          ).split("\n").join("\n    ")}`,
        );
      } else {
        console.log(`PASS (${findings.length} findings)`);
      }
    } catch (error) {
      failed += 1;
      console.log("ERROR");
      console.log(
        `    ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  console.log("");
  console.log(
    `Summary: ${fixtures.length - failed}/${fixtures.length} fixtures passed`,
  );

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
