import { z } from "zod";

export const findingSeveritySchema = z.enum(["CRITICAL", "WARNING", "INFO"]);

export const findingCategorySchema = z.enum([
  "BUG",
  "SECURITY",
  "PERFORMANCE",
  "STYLE",
  "OTHER",
]);

/**
 * OpenAI structured outputs require every property in `required`.
 * Use `.nullable()` instead of `.optional()` for absent values.
 */
const reviewFindingBaseSchema = z.object({
  startLine: z
    .number()
    .int()
    .positive()
    .describe("1-based start line the finding applies to"),
  endLine: z
    .number()
    .int()
    .positive()
    .nullable()
    .describe(
      "1-based end line (inclusive) when the finding spans a range; null if single-line",
    ),
  severity: findingSeveritySchema,
  category: findingCategorySchema,
  description: z.string().min(1).describe("Clear explanation of the issue"),
});

export const reviewFindingSchema = reviewFindingBaseSchema.extend({
  replacementLines: z
    .array(z.string())
    .nullable()
    .describe(
      "Exact replacement source lines for startLine..endLine. [] deletes the range; [''] leaves one blank line. Null when no safe fix is available.",
    ),
});

export const normalizedReviewFindingSchema = reviewFindingBaseSchema.extend({
  suggestionPatch: z.string().nullable(),
});

export const reviewAnalysisSchema = z.object({
  findings: z.array(reviewFindingSchema),
});

export type ModelReviewFinding = z.infer<typeof reviewFindingSchema>;
export type ReviewFinding = z.infer<typeof normalizedReviewFindingSchema>;
export type ReviewAnalysis = z.infer<typeof reviewAnalysisSchema>;
