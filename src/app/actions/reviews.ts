"use server";

import { revalidatePath } from "next/cache";

import { FindingResolution } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import {
  applyLineReplacement,
  lineDeltaForReplacement,
  runReview,
  shiftFindingLinesAfterApply,
} from "@/lib/review";
import { replacementFromPatch } from "@/lib/review/suggestion-patch";

export type RunSnippetReviewResult =
  | {
      ok: true;
      status: "COMPLETED" | "FAILED" | "SUPERSEDED";
      errorMessage: string | null;
      findingCount: number;
    }
  | { ok: false; error: string };

export type AcceptFindingResult =
  | { ok: true; code: string }
  | { ok: false; error: string };

export type DismissFindingResult =
  | { ok: true }
  | { ok: false; error: string };

export async function runSnippetReview(
  snippetId: string,
): Promise<RunSnippetReviewResult> {
  if (!snippetId) {
    return { ok: false, error: "Snippet id is required" };
  }

  try {
    const result = await runReview(db, snippetId);

    revalidatePath("/");
    revalidatePath(`/snippets/${snippetId}`);

    return {
      ok: true,
      status: result.status,
      errorMessage: result.errorMessage,
      findingCount: result.findings.length,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Couldn't run the review";

    if (message.startsWith("Snippet not found:")) {
      return { ok: false, error: "Snippet not found" };
    }

    return { ok: false, error: message };
  }
}

/**
 * GitHub-style "Apply suggestion": replace the finding's line range with
 * suggestedFix, mark the finding ACCEPTED, and shift later findings' lines.
 */
export async function acceptFinding(
  findingId: string,
): Promise<AcceptFindingResult> {
  if (!findingId) {
    return { ok: false, error: "Finding id is required" };
  }

  const finding = await db.finding.findUnique({
    where: { id: findingId },
    select: {
      id: true,
      startLine: true,
      endLine: true,
      suggestedFix: true,
      resolution: true,
      review: {
        select: {
          id: true,
          snippetId: true,
          snippet: {
            select: { code: true },
          },
          findings: {
            select: {
              id: true,
              startLine: true,
              endLine: true,
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

  if (!finding.suggestedFix) {
    return { ok: false, error: "This finding has no applyable suggestion" };
  }

  const endLine = finding.endLine ?? finding.startLine;
  const replacement = replacementFromPatch(finding.suggestedFix);
  if (
    replacement.length === 0 &&
    finding.suggestedFix.includes("-") &&
    !finding.suggestedFix.split("\n").some((line) => line.startsWith("+"))
  ) {
    return { ok: false, error: "Suggestion hunk has no '+' lines to apply" };
  }

  let nextCode: string;

  try {
    nextCode = applyLineReplacement(
      finding.review.snippet.code,
      finding.startLine,
      endLine,
      replacement,
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
    finding.startLine,
    endLine,
    replacement,
  );

  const others = finding.review.findings.filter((f) => f.id !== finding.id);
  const shifted = shiftFindingLinesAfterApply(
    others,
    finding.startLine,
    endLine,
    delta,
  );

  await db.$transaction(async (tx) => {
    await tx.snippet.update({
      where: { id: finding.review.snippetId },
      data: { code: nextCode },
    });

    await tx.finding.update({
      where: { id: finding.id },
      data: { resolution: FindingResolution.ACCEPTED },
    });

    for (const other of shifted) {
      const original = others.find((f) => f.id === other.id);
      if (
        !original ||
        (original.startLine === other.startLine &&
          original.endLine === other.endLine)
      ) {
        continue;
      }

      await tx.finding.update({
        where: { id: other.id },
        data: {
          startLine: other.startLine,
          endLine: other.endLine,
        },
      });
    }
  });

  revalidatePath("/");
  revalidatePath(`/snippets/${finding.review.snippetId}`);

  return { ok: true, code: nextCode };
}

export async function dismissFinding(
  findingId: string,
): Promise<DismissFindingResult> {
  if (!findingId) {
    return { ok: false, error: "Finding id is required" };
  }

  const finding = await db.finding.findUnique({
    where: { id: findingId },
    select: {
      id: true,
      resolution: true,
      review: {
        select: { snippetId: true },
      },
    },
  });

  if (!finding) {
    return { ok: false, error: "Finding not found" };
  }

  if (finding.resolution !== FindingResolution.OPEN) {
    return { ok: false, error: "Finding is already resolved" };
  }

  await db.finding.update({
    where: { id: findingId },
    data: { resolution: FindingResolution.DISMISSED },
  });

  revalidatePath(`/snippets/${finding.review.snippetId}`);

  return { ok: true };
}
