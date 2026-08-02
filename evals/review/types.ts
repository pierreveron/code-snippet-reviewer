import { z } from "zod";

import {
  findingCategorySchema,
  findingSeveritySchema,
} from "../../src/lib/review/schema";

const severityRank = {
  INFO: 0,
  WARNING: 1,
  CRITICAL: 2,
} as const;

export const expectationSchema = z.object({
  category: findingCategorySchema.optional(),
  severityAtLeast: findingSeveritySchema.optional(),
  lineNear: z.number().int().positive().optional(),
  descriptionIncludes: z.array(z.string().min(1)).optional(),
});

/** Optional completed findings for `db:seed` (ignored by live evals). */
export const seedFindingSchema = z.object({
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive().nullable().optional(),
  severity: findingSeveritySchema,
  category: findingCategorySchema,
  description: z.string().min(1),
  suggestedFix: z.string().nullable().optional(),
});

export const fixtureSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  language: z.string().min(1),
  code: z.string().min(1),
  expectations: z.array(expectationSchema),
  findings: z.array(seedFindingSchema).optional(),
});

export type Expectation = z.infer<typeof expectationSchema>;
export type SeedFinding = z.infer<typeof seedFindingSchema>;
export type ReviewFixture = z.infer<typeof fixtureSchema>;

export function severityMeetsMinimum(
  actual: keyof typeof severityRank,
  minimum: keyof typeof severityRank,
) {
  return severityRank[actual] >= severityRank[minimum];
}
