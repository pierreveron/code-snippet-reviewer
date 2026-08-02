"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { runReview } from "@/lib/review";

export type RunSnippetReviewResult =
  | {
      ok: true;
      status: "COMPLETED" | "FAILED" | "SUPERSEDED";
      errorMessage: string | null;
      findingCount: number;
    }
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
