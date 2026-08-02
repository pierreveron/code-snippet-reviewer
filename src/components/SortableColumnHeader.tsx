"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import {
  DEFAULT_SNIPPET_SORT,
  nextSnippetSort,
  type SnippetListSort,
  type SnippetSortField,
} from "@/lib/snippet-filters";

type SortableColumnHeaderProps = {
  field: SnippetSortField;
  label: string;
  sort: SnippetListSort;
};

function SortIcon({
  active,
  order,
}: {
  active: boolean;
  order: "asc" | "desc";
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 16"
      fill="none"
      className={[
        "h-3.5 w-2.5 shrink-0",
        active ? "text-accent" : "text-muted/50",
      ].join(" ")}
    >
      <path
        d="M6 2.5 9 6.5H3L6 2.5Z"
        fill="currentColor"
        className={active && order === "asc" ? "opacity-100" : "opacity-35"}
      />
      <path
        d="M6 13.5 3 9.5h6L6 13.5Z"
        fill="currentColor"
        className={active && order === "desc" ? "opacity-100" : "opacity-35"}
      />
    </svg>
  );
}

export function SortableColumnHeader({
  field,
  label,
  sort,
}: SortableColumnHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const active = sort.field === field;
  const ariaSort = active
    ? sort.order === "asc"
      ? "ascending"
      : "descending"
    : "none";

  function handleClick() {
    const next = nextSnippetSort(sort, field);
    const params = new URLSearchParams(searchParams.toString());

    if (
      next.field === DEFAULT_SNIPPET_SORT.field &&
      next.order === DEFAULT_SNIPPET_SORT.order
    ) {
      params.delete("sort");
      params.delete("order");
    } else {
      params.set("sort", next.field);
      params.set("order", next.order);
    }

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  }

  return (
    <th aria-sort={ariaSort} className="px-5 py-3 font-medium sm:px-6">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={[
          "inline-flex items-center gap-1.5 rounded-md uppercase tracking-wide outline-none ring-accent/30 transition-colors focus-visible:ring-2",
          active
            ? "text-accent"
            : "text-muted hover:text-foreground",
          isPending ? "opacity-70" : "",
        ].join(" ")}
      >
        <span>{label}</span>
        <SortIcon active={active} order={sort.order} />
      </button>
    </th>
  );
}
