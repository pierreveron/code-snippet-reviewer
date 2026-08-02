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
  analyze: typeof analyzeSnippet = analyzeSnippet,
): Promise<RunReviewResult> {
  const runToken = randomUUID();
  const { snippet, review } = await db.$transaction(async (tx) => {
    const currentSnippet = await tx.snippet.findUnique({
      where: { id: snippetId },
    });

    if (!currentSnippet) {
      throw new Error(`Snippet not found: ${snippetId}`);
    }

    const currentReview = await tx.review.upsert({
      where: { snippetId: currentSnippet.id },
      create: {
        snippetId: currentSnippet.id,
        sourceVersion: currentSnippet.contentVersion,
        status: "IN_PROGRESS",
        runToken,
      },
      update: {
        sourceVersion: currentSnippet.contentVersion,
        status: "IN_PROGRESS",
        errorMessage: null,
        completedAt: null,
        runToken,
        findings: { deleteMany: {} },
      },
    });

    return { snippet: currentSnippet, review: currentReview };
  });

  try {
    const findings = await analyze({
      language: snippet.language,
      code: snippet.code,
    });

    // true = this run still owns runToken and wrote the result
    const persisted = await db.$transaction(async (tx) => {
      const updated = await tx.review.updateMany({
        where: {
          id: review.id,
          runToken,
          sourceVersion: snippet.contentVersion,
          snippet: { contentVersion: snippet.contentVersion },
        },
        data: {
          status: "COMPLETED",
          errorMessage: null,
          completedAt: new Date(),
        },
      });

      if (updated.count === 0) {
        await tx.review.deleteMany({
          where: { id: review.id, runToken },
        });
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
          suggestionPatch: finding.suggestionPatch,
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

    const persisted = await db.$transaction(async (tx) => {
      const updated = await tx.review.updateMany({
        where: {
          id: review.id,
          runToken,
          sourceVersion: snippet.contentVersion,
          snippet: { contentVersion: snippet.contentVersion },
        },
        data: {
          status: "FAILED",
          errorMessage,
          completedAt: new Date(),
        },
      });

      if (updated.count === 0) {
        await tx.review.deleteMany({
          where: { id: review.id, runToken },
        });
      }

      return updated;
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
