import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { config } from "dotenv";

config({ path: ".env" });

import { fixtureSchema, type ReviewFixture } from "../evals/review/types";
import { createPrismaClient } from "../src/lib/create-prisma-client";
import { encodeSuggestionPatch } from "../src/lib/review/suggestion-patch";

const FIXTURES_DIR = path.join(process.cwd(), "evals/review/fixtures");

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
  const fixtures = await loadFixtures();
  const db = createPrismaClient();

  try {
    const deleted = await db.snippet.deleteMany();
    console.log(`Deleted ${deleted.count} existing snippet(s)`);

    let findingCount = 0;

    for (const fixture of fixtures) {
      const findings = fixture.findings ?? [];

      await db.snippet.create({
        data: {
          id: fixture.id,
          title: fixture.title,
          language: fixture.language,
          code: fixture.code,
          ...(findings.length > 0
            ? {
                review: {
                  create: {
                    status: "COMPLETED",
                    completedAt: new Date(),
                    findings: {
                      create: findings.map((finding) => ({
                        startLine: finding.startLine,
                        endLine: finding.endLine ?? finding.startLine,
                        severity: finding.severity,
                        category: finding.category,
                        description: finding.description,
                        suggestionPatch: finding.suggestionPatch
                          ? encodeSuggestionPatch(finding.suggestionPatch)
                          : null,
                      })),
                    },
                  },
                },
              }
            : {}),
        },
      });

      findingCount += findings.length;
      const findingLabel =
        findings.length > 0 ? ` (${findings.length} finding(s))` : "";
      console.log(`• ${fixture.id} — ${fixture.title}${findingLabel}`);
    }

    console.log(
      `\nSeeded ${fixtures.length} snippet(s) from fixtures (${findingCount} finding(s))`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
