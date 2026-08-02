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

export const fixtureSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  language: z.string().min(1),
  code: z.string().min(1),
  expectations: z.array(expectationSchema),
});

export type Expectation = z.infer<typeof expectationSchema>;
export type ReviewFixture = z.infer<typeof fixtureSchema>;

export function severityMeetsMinimum(
  actual: keyof typeof severityRank,
  minimum: keyof typeof severityRank,
) {
  return severityRank[actual] >= severityRank[minimum];
}
