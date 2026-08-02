import type { PrismaClient } from "@/generated/prisma/client";
import {
  FindingResolution,
  type FindingResolution as FindingResolutionValue,
} from "@/generated/prisma/enums";
import {
  applyLineReplacement,
  lineDeltaForReplacement,
  locateExactLineRange,
  shiftFindingLinesAfterApply,
} from "@/lib/review/apply-fix";
import { decodeSuggestionPatch } from "@/lib/review/suggestion-patch";

export type CanonicalFindingState = {
  id: string;
  startLine: number;
  endLine: number | null;
  resolution: FindingResolutionValue;
};

export type ApplySuggestionResult =
  | {
      ok: true;
      snippetId: string;
      code: string;
      contentVersion: number;
      findings: CanonicalFindingState[];
    }
  | { ok: false; error: string };

type ApplySuggestionOptions = {
  beforeCommit?: () => Promise<void>;
};

class ApplyConflictError extends Error {}

export async function applyFindingSuggestion(
  db: PrismaClient,
  findingId: string,
  options: ApplySuggestionOptions = {},
): Promise<ApplySuggestionResult> {
  const finding = await db.finding.findUnique({
    where: { id: findingId },
    select: {
      id: true,
      startLine: true,
      endLine: true,
      suggestionPatch: true,
      resolution: true,
      review: {
        select: {
          id: true,
          snippetId: true,
          sourceVersion: true,
          status: true,
          snippet: {
            select: { code: true, contentVersion: true },
          },
          findings: {
            select: {
              id: true,
              startLine: true,
              endLine: true,
              resolution: true,
            },
          },
        },
      },
    },
  });

  if (!finding) {
    return { ok: false, error: "Finding not found" };
  }

  if (finding.resolution !== FindingResolution.OPEN) {
    return { ok: false, error: "Finding is already resolved" };
  }

  if (!finding.suggestionPatch) {
    return { ok: false, error: "This finding has no applyable suggestion" };
  }

  if (
    finding.review.status !== "COMPLETED" ||
    finding.review.sourceVersion !== finding.review.snippet.contentVersion
  ) {
    return {
      ok: false,
      error: "This suggestion is stale. Run a new review before applying it.",
    };
  }

  const patch = decodeSuggestionPatch(finding.suggestionPatch);
  if (!patch || patch.before.length === 0) {
    return {
      ok: false,
      error: "This finding has an invalid suggestion patch",
    };
  }

  const located = locateExactLineRange(
    finding.review.snippet.code,
    patch.before,
    finding.startLine,
  );
  if (!located) {
    return {
      ok: false,
      error:
        "This suggestion no longer matches the snippet. Run a new review before applying it.",
    };
  }

  let nextCode: string;
  try {
    nextCode = applyLineReplacement(
      finding.review.snippet.code,
      located.startLine,
      located.endLine,
      patch.after,
    );
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Couldn't apply the suggested fix",
    };
  }

  const delta = lineDeltaForReplacement(
    located.startLine,
    located.endLine,
    patch.after,
  );
  const others = finding.review.findings.filter(
    (candidate) => candidate.id !== finding.id,
  );
  const overlappingIds = others
    .filter((candidate) => {
      const candidateEnd = candidate.endLine ?? candidate.startLine;
      return (
        candidate.startLine <= located.endLine &&
        candidateEnd >= located.startLine
      );
    })
    .map((candidate) => candidate.id);
  const shifted = shiftFindingLinesAfterApply(
    others,
    located.startLine,
    located.endLine,
    delta,
  );
  const expectedVersion = finding.review.snippet.contentVersion;
  const nextVersion = expectedVersion + 1;

  await options.beforeCommit?.();

  try {
    const canonicalFindings = await db.$transaction(async (tx) => {
      const updatedSnippet = await tx.snippet.updateMany({
        where: {
          id: finding.review.snippetId,
          contentVersion: expectedVersion,
        },
        data: {
          code: nextCode,
          contentVersion: { increment: 1 },
        },
      });

      if (updatedSnippet.count !== 1) {
        throw new ApplyConflictError();
      }

      const accepted = await tx.finding.updateMany({
        where: {
          id: finding.id,
          reviewId: finding.review.id,
          resolution: FindingResolution.OPEN,
        },
        data: {
          startLine: located.startLine,
          endLine: located.endLine,
          resolution: FindingResolution.ACCEPTED,
        },
      });

      if (accepted.count !== 1) {
        throw new ApplyConflictError();
      }

      if (overlappingIds.length > 0) {
        await tx.finding.updateMany({
          where: {
            id: { in: overlappingIds },
            reviewId: finding.review.id,
            resolution: FindingResolution.OPEN,
          },
          data: { resolution: FindingResolution.STALE },
        });
      }

      for (const other of shifted) {
        const original = others.find((candidate) => candidate.id === other.id);
        if (
          !original ||
          (original.startLine === other.startLine &&
            original.endLine === other.endLine)
        ) {
          continue;
        }

        await tx.finding.updateMany({
          where: { id: other.id, reviewId: finding.review.id },
          data: {
            startLine: other.startLine,
            endLine: other.endLine,
          },
        });
      }

      const updatedReview = await tx.review.updateMany({
        where: {
          id: finding.review.id,
          sourceVersion: expectedVersion,
          status: "COMPLETED",
        },
        data: { sourceVersion: nextVersion },
      });

      if (updatedReview.count !== 1) {
        throw new ApplyConflictError();
      }

      return tx.finding.findMany({
        where: { reviewId: finding.review.id },
        select: {
          id: true,
          startLine: true,
          endLine: true,
          resolution: true,
        },
      });
    });

    return {
      ok: true,
      snippetId: finding.review.snippetId,
      code: nextCode,
      contentVersion: nextVersion,
      findings: canonicalFindings,
    };
  } catch (error) {
    if (error instanceof ApplyConflictError) {
      return {
        ok: false,
        error:
          "The snippet changed before this suggestion could be applied. Refresh and try again.",
      };
    }

    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Couldn't apply the suggested fix",
    };
  }
}
