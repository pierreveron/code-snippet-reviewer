import type { PrismaClient } from "@/generated/prisma/client";
import { analyzeSnippet } from "@/lib/review/analyze";
import type { ReviewFinding } from "@/lib/review/schema";

export type RunReviewResult = {
  reviewId: string;
  snippetId: string;
  status: "COMPLETED" | "FAILED";
  findings: ReviewFinding[];
  errorMessage: string | null;
};

/**
 * Full review lifecycle against the database:
 * IN_PROGRESS → analyze → COMPLETED (+ findings) or FAILED.
 * Safe to re-run: replaces prior findings for the snippet's review.
 */
export async function runReview(
  db: PrismaClient,
  snippetId: string,
): Promise<RunReviewResult> {
  const snippet = await db.snippet.findUnique({
    where: { id: snippetId },
    include: { review: true },
  });

  if (!snippet) {
    throw new Error(`Snippet not found: ${snippetId}`);
  }

  const review = snippet.review
    ? await db.review.update({
        where: { id: snippet.review.id },
        data: {
          status: "IN_PROGRESS",
          errorMessage: null,
          completedAt: null,
          findings: { deleteMany: {} },
        },
      })
    : await db.review.create({
        data: {
          snippetId: snippet.id,
          status: "IN_PROGRESS",
        },
      });

  try {
    const findings = await analyzeSnippet({
      language: snippet.language,
      code: snippet.code,
    });

    await db.$transaction([
      db.finding.createMany({
        data: findings.map((finding) => ({
          reviewId: review.id,
          startLine: finding.startLine,
          endLine: finding.endLine,
          severity: finding.severity,
          category: finding.category,
          description: finding.description,
          suggestedFix: finding.suggestedFix,
        })),
      }),
      db.review.update({
        where: { id: review.id },
        data: {
          status: "COMPLETED",
          errorMessage: null,
          completedAt: new Date(),
        },
      }),
    ]);

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

    await db.review.update({
      where: { id: review.id },
      data: {
        status: "FAILED",
        errorMessage,
        completedAt: new Date(),
        findings: { deleteMany: {} },
      },
    });

    return {
      reviewId: review.id,
      snippetId: snippet.id,
      status: "FAILED",
      findings: [],
      errorMessage,
    };
  }
}
