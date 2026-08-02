import { LANGUAGES } from "@/lib/languages";
import {
  reviewStatusLabel,
  type DisplayReviewStatus,
} from "@/lib/review-status";

export type SnippetListFilters = {
  language?: string;
  status?: DisplayReviewStatus;
};

export type SnippetSortField = "title" | "language" | "created" | "status";
export type SnippetSortOrder = "asc" | "desc";

export type SnippetListSort = {
  field: SnippetSortField;
  order: SnippetSortOrder;
};

export const DEFAULT_SNIPPET_SORT: SnippetListSort = {
  field: "created",
  order: "desc",
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
const sortFields = new Set<SnippetSortField>([
  "title",
  "language",
  "created",
  "status",
]);
const sortOrders = new Set<SnippetSortOrder>(["asc", "desc"]);

/** Preferred first-click direction per column. */
export function defaultOrderForSortField(
  field: SnippetSortField,
): SnippetSortOrder {
  return field === "created" ? "desc" : "asc";
}

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

export function parseSnippetSort(searchParams: {
  sort?: string | string[];
  order?: string | string[];
}): SnippetListSort {
  const sort = firstParam(searchParams.sort);
  const order = firstParam(searchParams.order);

  const field =
    sort && sortFields.has(sort as SnippetSortField)
      ? (sort as SnippetSortField)
      : DEFAULT_SNIPPET_SORT.field;

  const parsedOrder =
    order && sortOrders.has(order as SnippetSortOrder)
      ? (order as SnippetSortOrder)
      : undefined;

  return {
    field,
    order: parsedOrder ?? defaultOrderForSortField(field),
  };
}

export function hasActiveSnippetFilters(filters: SnippetListFilters): boolean {
  return Boolean(filters.language || filters.status);
}

/** Removes language/status while keeping sort/order and any other params. */
export function withoutSnippetFilterParams(
  searchParams: string | URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(searchParams.toString());
  params.delete("language");
  params.delete("status");
  return params;
}

/** Home path with optional non-default sort; never includes language/status. */
export function clearSnippetFiltersHref(sort: SnippetListSort): string {
  if (
    sort.field === DEFAULT_SNIPPET_SORT.field &&
    sort.order === DEFAULT_SNIPPET_SORT.order
  ) {
    return "/";
  }

  const params = new URLSearchParams({
    sort: sort.field,
    order: sort.order,
  });
  return `/?${params.toString()}`;
}

/**
 * Detail URL that remembers the list query so “Back to snippets” can restore
 * filters/sort. Omits returnTo when the list has no query.
 */
export function snippetDetailHref(
  id: string,
  listSearchParams?: string | URLSearchParams,
): string {
  const listQuery =
    typeof listSearchParams === "string"
      ? listSearchParams
      : (listSearchParams?.toString() ?? "");
  if (!listQuery) {
    return `/snippets/${id}`;
  }

  const params = new URLSearchParams({
    returnTo: `/?${listQuery}`,
  });
  return `/snippets/${id}?${params.toString()}`;
}

/**
 * Safe list href from a detail-page returnTo param. Only the home path with
 * an optional query is accepted (blocks open redirects).
 */
export function parseSnippetListReturnTo(
  returnTo: string | string[] | undefined,
): string {
  const value = firstParam(returnTo);
  if (!value || value === "/") {
    return "/";
  }

  try {
    const url = new URL(value, "http://local.invalid");
    if (url.origin !== "http://local.invalid" || url.pathname !== "/") {
      return "/";
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return "/";
  }
}

/** Detail path that keeps returnTo after stripping one-shot flags like review. */
export function snippetDetailPath(
  id: string,
  listReturnTo: string = "/",
): string {
  if (listReturnTo === "/") {
    return `/snippets/${id}`;
  }

  const params = new URLSearchParams({ returnTo: listReturnTo });
  return `/snippets/${id}?${params.toString()}`;
}

export function nextSnippetSort(
  current: SnippetListSort,
  field: SnippetSortField,
): SnippetListSort {
  if (current.field === field) {
    return {
      field,
      order: current.order === "asc" ? "desc" : "asc",
    };
  }

  return {
    field,
    order: defaultOrderForSortField(field),
  };
}
