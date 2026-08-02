import { z } from "zod";

export const suggestionPatchSchema = z.object({
  version: z.literal(1),
  before: z.array(z.string()),
  after: z.array(z.string()),
});

export type SuggestionPatch = z.infer<typeof suggestionPatchSchema>;

export function encodeSuggestionPatch(
  patch: Omit<SuggestionPatch, "version">,
): string {
  return JSON.stringify({
    version: 1,
    before: patch.before,
    after: patch.after,
  } satisfies SuggestionPatch);
}

export function decodeSuggestionPatch(value: string): SuggestionPatch | null {
  try {
    const parsed = suggestionPatchSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function replacementLinesFromPatch(value: string): string[] | null {
  return decodeSuggestionPatch(value)?.after ?? null;
}

export function originalLinesFromPatch(value: string): string[] | null {
  return decodeSuggestionPatch(value)?.before ?? null;
}
