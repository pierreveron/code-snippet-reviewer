import { ReviewStatusBadge } from "@/components/ReviewStatusBadge";
import type { SnippetListItem } from "@/lib/snippets";

type SnippetListProps = {
  snippets: SnippetListItem[];
};

function formatCreatedAt(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatLanguage(language: string) {
  if (!language) return "Unknown";
  return language.charAt(0).toUpperCase() + language.slice(1);
}

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
            <tr
              key={snippet.id}
              className="transition-colors hover:bg-surface-muted/70"
            >
              <td className="px-5 py-3.5 font-semibold text-foreground sm:px-6">
                {snippet.title}
              </td>
              <td className="px-5 py-3.5 sm:px-6">
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-medium text-slate-700">
                  {formatLanguage(snippet.language)}
                </span>
              </td>
              <td className="px-5 py-3.5 text-muted sm:px-6">
                {formatCreatedAt(snippet.createdAt)}
              </td>
              <td className="px-5 py-3.5 sm:px-6">
                <ReviewStatusBadge status={snippet.reviewStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
