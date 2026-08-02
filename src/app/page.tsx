import { Suspense } from "react";

import { NewSnippetButton } from "@/components/NewSnippetButton";
import { SnippetList } from "@/components/SnippetList";
import {
  hasActiveSnippetFilters,
  parseSnippetFilters,
  parseSnippetSort,
} from "@/lib/snippet-filters";
import { listSnippets } from "@/lib/snippets";

type HomeProps = {
  searchParams: Promise<{
    language?: string | string[];
    status?: string | string[];
    sort?: string | string[];
    order?: string | string[];
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const filters = parseSnippetFilters(params);
  const sort = parseSnippetSort(params);
  const snippets = await listSnippets(filters, sort);
  const filtersActive = hasActiveSnippetFilters(filters);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Snippets
        </h1>
        <NewSnippetButton />
      </div>

      <Suspense fallback={null}>
        <SnippetList
          snippets={snippets}
          sort={sort}
          filtersActive={filtersActive}
        />
      </Suspense>
    </div>
  );
}
