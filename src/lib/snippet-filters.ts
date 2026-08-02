import { LANGUAGES } from "@/lib/languages";
import {
  reviewStatusLabel,
  type DisplayReviewStatus,
} from "@/lib/review-status";

export type SnippetListFilters = {
  language?: string;
  status?: DisplayReviewStatus;
};

export const REVIEW_STATUS_FILTERS: {
  value: DisplayReviewStatus;
  label: string;
}[] = (
  [
    "not_reviewed",
    "in_progress",
    "reviewed",
    "failed",
  ] as const satisfies readonly DisplayReviewStatus[]
).map((value) => ({
  value,
  label: reviewStatusLabel(value),
}));

const languageValues = new Set(LANGUAGES.map((language) => language.value));
const statusValues = new Set<DisplayReviewStatus>([
  "not_reviewed",
  "in_progress",
  "reviewed",
  "failed",
]);

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function parseSnippetFilters(searchParams: {
  language?: string | string[];
  status?: string | string[];
}): SnippetListFilters {
  const language = firstParam(searchParams.language);
  const status = firstParam(searchParams.status);

  return {
    language:
      language && languageValues.has(language) ? language : undefined,
    status:
      status && statusValues.has(status as DisplayReviewStatus)
        ? (status as DisplayReviewStatus)
        : undefined,
  };
}

export function hasActiveSnippetFilters(filters: SnippetListFilters): boolean {
  return Boolean(filters.language || filters.status);
}
