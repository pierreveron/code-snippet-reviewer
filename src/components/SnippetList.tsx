import { NewSnippetButton } from "@/components/NewSnippetButton";
import { SnippetRow } from "@/components/SnippetRow";
import type { SnippetListItem } from "@/lib/snippets";

type SnippetListProps = {
  snippets: SnippetListItem[];
};

export function SnippetList({ snippets }: SnippetListProps) {
  if (snippets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-surface/70 px-6 py-20 text-center shadow-[var(--shadow)]">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <span className="font-mono text-sm font-semibold">{"{}"}</span>
        </div>
        <p className="text-lg font-semibold text-foreground">No snippets yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Create a snippet to start reviewing code with structured AI findings.
        </p>
        <div className="mt-6 flex justify-center">
          <NewSnippetButton />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)]">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-surface-muted text-xs font-medium uppercase tracking-wide text-muted">
          <tr>
            <th className="px-5 py-3 font-medium sm:px-6">Title</th>
            <th className="px-5 py-3 font-medium sm:px-6">Language</th>
            <th className="px-5 py-3 font-medium sm:px-6">Created</th>
            <th className="px-5 py-3 font-medium sm:px-6">Review status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {snippets.map((snippet) => (
            <SnippetRow key={snippet.id} snippet={snippet} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
