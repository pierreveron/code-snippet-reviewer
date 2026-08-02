"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

import { FilterSelect } from "@/components/FilterSelect";
import { LANGUAGES } from "@/lib/languages";
import {
  REVIEW_STATUS_FILTERS,
  withoutSnippetFilterParams,
} from "@/lib/snippet-filters";

export function SnippetFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Compose rapid filter changes against the latest in-flight query, not the
  // still-stale URL from useSearchParams.
  const pendingQueryRef = useRef<string | null>(null);

  useEffect(() => {
    if (pendingQueryRef.current === searchParams.toString()) {
      pendingQueryRef.current = null;
    }
  }, [searchParams]);

  const language = searchParams.get("language") ?? "";
  const status = searchParams.get("status") ?? "";
  const hasFilters = Boolean(language || status);

  const languageOptions = useMemo(
    () => [
      { value: "", label: "All languages" },
      ...LANGUAGES.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    ],
    [],
  );

  const statusOptions = useMemo(
    () => [
      { value: "", label: "All statuses" },
      ...REVIEW_STATUS_FILTERS.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    ],
    [],
  );

  function latestParams() {
    return new URLSearchParams(
      pendingQueryRef.current ?? searchParams.toString(),
    );
  }

  function replaceParams(params: URLSearchParams) {
    const query = params.toString();
    pendingQueryRef.current = query;
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  function updateParam(key: "language" | "status", value: string) {
    const params = latestParams();

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    replaceParams(params);
  }

  function clearFilters() {
    replaceParams(withoutSnippetFilterParams(latestParams()));
  }

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <FilterSelect
        label="Language"
        aria-label="Filter by language"
        value={language}
        options={languageOptions}
        placeholder="All languages"
        onChange={(value) => updateParam("language", value)}
      />

      <FilterSelect
        label="Review status"
        aria-label="Filter by review status"
        value={status}
        options={statusOptions}
        placeholder="All statuses"
        onChange={(value) => updateParam("status", value)}
      />

      {hasFilters ? (
        <button
          type="button"
          onClick={clearFilters}
          className="inline-flex h-9 items-center justify-center rounded-lg px-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
