import Link from "next/link";

import { NewSnippetButton } from "@/components/NewSnippetButton";
import { SnippetFilters } from "@/components/SnippetFilters";
import { SnippetRow } from "@/components/SnippetRow";
import { SortableColumnHeader } from "@/components/SortableColumnHeader";
import {
  clearSnippetFiltersHref,
  type SnippetListSort,
} from "@/lib/snippet-filters";
import type { SnippetListItem } from "@/lib/snippets";

type SnippetListProps = {
  snippets: SnippetListItem[];
  sort: SnippetListSort;
  filtersActive?: boolean;
};

export function SnippetList({
  snippets,
  sort,
  filtersActive = false,
}: SnippetListProps) {
  const showFilters = filtersActive || snippets.length > 0;

  if (snippets.length === 0) {
    return (
      <div>
        {showFilters ? <SnippetFilters /> : null}
        {filtersActive ? (
          <div className="rounded-2xl border border-dashed border-border-strong bg-surface/70 px-6 py-16 text-center shadow-[var(--shadow)]">
            <p className="text-lg font-semibold text-foreground">
              No matching snippets
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
              Nothing matches the current language or review status filters.
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                href={clearSnippetFiltersHref(sort)}
                className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
              >
                Clear filters
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border-strong bg-surface/70 px-6 py-20 text-center shadow-[var(--shadow)]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <span className="font-mono text-sm font-semibold">{"{}"}</span>
            </div>
            <p className="text-lg font-semibold text-foreground">
              No snippets yet
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
              Create a snippet to start reviewing code with structured AI
              findings.
            </p>
            <div className="mt-6 flex justify-center">
              <NewSnippetButton />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <SnippetFilters />
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-muted text-xs font-medium tracking-wide">
            <tr>
              <SortableColumnHeader field="title" label="Title" sort={sort} />
              <SortableColumnHeader
                field="language"
                label="Language"
                sort={sort}
              />
              <SortableColumnHeader
                field="created"
                label="Created"
                sort={sort}
              />
              <SortableColumnHeader
                field="status"
                label="Review status"
                sort={sort}
              />
            </tr>
          </thead>
          <tbody className="[&_tr:last-child_td]:border-b-0">
            {snippets.map((snippet) => (
              <SnippetRow key={snippet.id} snippet={snippet} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
