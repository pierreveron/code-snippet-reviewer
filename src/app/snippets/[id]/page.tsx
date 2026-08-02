import Link from "next/link";
import { notFound } from "next/navigation";

import { CodeEditor } from "@/components/CodeEditor";
import { ReviewStatusBadge } from "@/components/ReviewStatusBadge";
import { formatLanguageLabel } from "@/lib/languages";
import { getSnippet } from "@/lib/snippets";

type SnippetDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatCreatedAt(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function SnippetDetailPage({
  params,
}: SnippetDetailPageProps) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const snippet = await getSnippet(id);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          ← Back to snippets
        </Link>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {snippet.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-medium text-slate-700">
              {formatLanguageLabel(snippet.language)}
            </span>
            <ReviewStatusBadge status={snippet.reviewStatus} />
            <span className="text-sm text-muted">
              Created {formatCreatedAt(snippet.createdAt)}
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled
          title="Coming next"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-white opacity-50"
        >
          Run review
        </button>
      </div>

      <CodeEditor
        value={snippet.code}
        language={snippet.language}
        readOnly
        height="520px"
      />
    </div>
  );
}
