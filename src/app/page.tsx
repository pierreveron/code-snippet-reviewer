import { Suspense } from "react";

import { NewSnippetButton } from "@/components/NewSnippetButton";
import { SnippetList } from "@/components/SnippetList";
import {
  hasActiveSnippetFilters,
  parseSnippetFilters,
} from "@/lib/snippet-filters";
import { listSnippets } from "@/lib/snippets";

type HomeProps = {
  searchParams: Promise<{
    language?: string | string[];
    status?: string | string[];
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const filters = parseSnippetFilters(params);
  const snippets = await listSnippets(filters);
  const filtersActive = hasActiveSnippetFilters(filters);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-accent">Dashboard</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Snippets
          </h1>
          <p className="mt-1 max-w-xl text-[15px] leading-relaxed text-muted">
            Paste ad-hoc code, run an AI review, and work through findings one
            by one.
          </p>
        </div>
        <NewSnippetButton />
      </div>

      <Suspense fallback={null}>
        <SnippetList snippets={snippets} filtersActive={filtersActive} />
      </Suspense>
    </div>
  );
}
