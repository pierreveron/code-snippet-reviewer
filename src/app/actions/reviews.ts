"use server";

import { revalidatePath } from "next/cache";

import { FindingResolution } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { runReview } from "@/lib/review";
import {
  applyFindingSuggestion,
  type ApplySuggestionResult,
} from "@/lib/review/apply-suggestion";

export type RunSnippetReviewResult =
  | {
      ok: true;
      status: "COMPLETED" | "FAILED" | "SUPERSEDED";
      errorMessage: string | null;
      findingCount: number;
    }
  | { ok: false; error: string };

export type AcceptFindingResult = ApplySuggestionResult;
export type AcceptedFindingState = Extract<AcceptFindingResult, { ok: true }>;

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

export async function acceptFinding(
  findingId: string,
): Promise<AcceptFindingResult> {
  if (!findingId) {
    return { ok: false, error: "Finding id is required" };
  }

  const result = await applyFindingSuggestion(db, findingId);
  if (!result.ok) {
    return result;
  }

  revalidatePath("/");
  revalidatePath(`/snippets/${result.snippetId}`);

  return result;
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

  const dismissed = await db.finding.updateMany({
    where: {
      id: findingId,
      resolution: FindingResolution.OPEN,
    },
    data: { resolution: FindingResolution.DISMISSED },
  });

  if (dismissed.count !== 1) {
    return {
      ok: false,
      error: "The finding changed before it could be dismissed. Refresh and try again.",
    };
  }

  revalidatePath(`/snippets/${finding.review.snippetId}`);

  return { ok: true };
}
