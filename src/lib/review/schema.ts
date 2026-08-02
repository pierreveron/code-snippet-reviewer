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
export const reviewFindingSchema = z.object({
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
  suggestedFix: z
    .string()
    .nullable()
    .describe("Concrete fix or improved snippet; null if none"),
});

export const reviewAnalysisSchema = z.object({
  findings: z.array(reviewFindingSchema),
});

export type ReviewFinding = z.infer<typeof reviewFindingSchema>;
export type ReviewAnalysis = z.infer<typeof reviewAnalysisSchema>;
