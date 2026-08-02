import { config } from "dotenv";

config({ path: ".env" });

import { createPrismaClient } from "../src/lib/create-prisma-client";
import { getReviewModelId, runReview } from "../src/lib/review";

async function main() {
  const snippetId = process.argv[2];

  if (!snippetId) {
    console.error("Usage: npm run review -- <snippetId>");
    process.exit(1);
  }

  console.log(`Reviewing snippet ${snippetId}`);
  console.log(`Model: ${getReviewModelId()}`);

  const db = createPrismaClient();

  try {
    const result = await runReview(db, snippetId);

    console.log(`Status: ${result.status}`);
    console.log(`Review id: ${result.reviewId}`);

    if (result.status === "SUPERSEDED") {
      console.error(
        result.errorMessage ?? "Review was superseded by a newer run",
      );
      process.exit(1);
    }

    if (result.status === "FAILED") {
      console.error(`Error: ${result.errorMessage}`);
      process.exit(1);
    }

    console.log(`Findings: ${result.findings.length}`);

    if (result.findings.length === 0) {
      console.log("No issues found.");
      return;
    }

    console.log("");
    for (const finding of result.findings) {
      const lines =
        finding.endLine && finding.endLine !== finding.startLine
          ? `${finding.startLine}-${finding.endLine}`
          : String(finding.startLine);

      console.log(
        `[${finding.severity}] ${finding.category} @ L${lines}: ${finding.description}`,
      );
      if (finding.suggestedFix) {
        console.log(`  Fix: ${finding.suggestedFix}`);
      }
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
