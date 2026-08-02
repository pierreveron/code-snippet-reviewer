import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@/generated/prisma/client";
import { analyzeSnippet } from "@/lib/review/analyze";
import type { ReviewFinding } from "@/lib/review/schema";

export type RunReviewResult = {
  reviewId: string;
  snippetId: string;
  /** SUPERSEDED: this run lost the runToken race and did not persist. */
  status: "COMPLETED" | "FAILED" | "SUPERSEDED";
  findings: ReviewFinding[];
  errorMessage: string | null;
};

/**
 * Full review lifecycle against the database:
 * IN_PROGRESS → analyze → COMPLETED (+ findings) or FAILED.
 * Safe to re-run: clears prior findings at start, then writes replacements on
 * success.
 *
 * Concurrent starts for the same snippet are safe: start uses upsert (no
 * unique-constraint race on create), and each run owns a `runToken` so only
 * the latest run may persist completion or failure. A run that loses ownership
 * returns SUPERSEDED instead of in-memory findings that were never saved.
 */
export async function runReview(
  db: PrismaClient,
  snippetId: string,
): Promise<RunReviewResult> {
  const snippet = await db.snippet.findUnique({
    where: { id: snippetId },
  });

  if (!snippet) {
    throw new Error(`Snippet not found: ${snippetId}`);
  }

  const runToken = randomUUID();

  const review = await db.review.upsert({
    where: { snippetId: snippet.id },
    create: {
      snippetId: snippet.id,
      status: "IN_PROGRESS",
      runToken,
    },
    update: {
      status: "IN_PROGRESS",
      errorMessage: null,
      completedAt: null,
      runToken,
      findings: { deleteMany: {} },
    },
  });

  try {
    const findings = await analyzeSnippet({
      language: snippet.language,
      code: snippet.code,
    });

    // true = this run still owns runToken and wrote the result
    const persisted = await db.$transaction(async (tx) => {
      const updated = await tx.review.updateMany({
        where: { id: review.id, runToken },
        data: {
          status: "COMPLETED",
          errorMessage: null,
          completedAt: new Date(),
        },
      });

      if (updated.count === 0) {
        return false;
      }

      await tx.finding.createMany({
        data: findings.map((finding) => ({
          reviewId: review.id,
          startLine: finding.startLine,
          endLine: finding.endLine,
          severity: finding.severity,
          category: finding.category,
          description: finding.description,
          suggestedFix: finding.suggestedFix,
        })),
      });

      return true;
    });

    if (!persisted) {
      return supersededResult(review.id, snippet.id);
    }

    return {
      reviewId: review.id,
      snippetId: snippet.id,
      status: "COMPLETED",
      findings,
      errorMessage: null,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown review error";

    const persisted = await db.review.updateMany({
      where: { id: review.id, runToken },
      data: {
        status: "FAILED",
        errorMessage,
        completedAt: new Date(),
      },
    });

    if (persisted.count === 0) {
      return supersededResult(review.id, snippet.id);
    }

    return {
      reviewId: review.id,
      snippetId: snippet.id,
      status: "FAILED",
      findings: [],
      errorMessage,
    };
  }
}

function supersededResult(
  reviewId: string,
  snippetId: string,
): RunReviewResult {
  return {
    reviewId,
    snippetId,
    status: "SUPERSEDED",
    findings: [],
    errorMessage: "Review was superseded by a newer run",
  };
}
