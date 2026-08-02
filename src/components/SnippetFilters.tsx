"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";

import { FilterSelect } from "@/components/FilterSelect";
import { LANGUAGES } from "@/lib/languages";
import { REVIEW_STATUS_FILTERS } from "@/lib/snippet-filters";

export function SnippetFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

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

  function updateParam(key: "language" | "status", value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  }

  function clearFilters() {
    startTransition(() => {
      router.replace(pathname);
    });
  }

  return (
    <div
      className={[
        "mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end",
        isPending ? "opacity-70" : "",
      ].join(" ")}
    >
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
