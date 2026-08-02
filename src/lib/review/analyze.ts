import { generateObject } from "ai";

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

  const { object } = await generateObject({
    model,
    schema: reviewAnalysisSchema,
    schemaName: "CodeReviewFindings",
    schemaDescription:
      "Structured code review findings for an ad-hoc snippet",
    system: buildSystemPrompt(),
    prompt: buildUserPrompt(input),
  });

  return sanitizeFindings(object.findings, input.code);
}
