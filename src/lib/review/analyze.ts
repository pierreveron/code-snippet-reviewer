import { generateText, Output } from "ai";

import { enableReviewDevtools } from "@/lib/review/devtools";
import { resolveReviewModel } from "@/lib/review/model";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/review/prompt";
import {
  reviewAnalysisSchema,
  type ReviewFinding,
} from "@/lib/review/schema";

export type AnalyzeSnippetInput = {
  title: string;
  language: string;
  code: string;
};

function lineCount(code: string) {
  if (code.length === 0) {
    return 0;
  }
  return code.split("\n").length;
}

/** Drop / clamp findings that point outside the snippet. */
export function sanitizeFindings(
  findings: ReviewFinding[],
  code: string,
): ReviewFinding[] {
  const totalLines = lineCount(code);
  if (totalLines === 0) {
    return [];
  }

  const sanitized: ReviewFinding[] = [];

  for (const finding of findings) {
    if (finding.startLine < 1 || finding.startLine > totalLines) {
      continue;
    }

    let endLine = finding.endLine;
    if (endLine !== null) {
      if (endLine < finding.startLine) {
        endLine = finding.startLine;
      }
      if (endLine > totalLines) {
        endLine = totalLines;
      }
    }

    const suggestedFix = finding.suggestedFix?.trim() || null;

    sanitized.push({
      startLine: finding.startLine,
      endLine,
      severity: finding.severity,
      category: finding.category,
      description: finding.description.trim(),
      suggestedFix,
    });
  }

  return sanitized;
}

/**
 * Pure LLM review — no database access.
 * Suitable for CLI evals and the runReview orchestrator.
 */
export async function analyzeSnippet(
  input: AnalyzeSnippetInput,
): Promise<ReviewFinding[]> {
  const model = resolveReviewModel();
  const debugReview = process.env.DEBUG_REVIEW === "1";

  await enableReviewDevtools();

  const result = await generateText({
    model,
    output: Output.object({
      schema: reviewAnalysisSchema,
      name: "CodeReviewFindings",
      description: "Structured code review findings for an ad-hoc snippet",
    }),
    instructions: buildSystemPrompt(),
    prompt: buildUserPrompt(input),
    include: debugReview
      ? { requestBody: true, responseBody: true }
      : undefined,
  });

  if (debugReview) {
    console.log(
      "[review] provider request body:\n",
      JSON.stringify(result.request.body, null, 2),
    );
    console.log(
      "[review] provider response body:\n",
      JSON.stringify(result.response.body, null, 2),
    );
  }

  if (!result.output) {
    throw new Error("Model returned no structured review output");
  }

  return sanitizeFindings(result.output.findings, input.code);
}
