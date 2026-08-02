import Link from "next/link";

import { ReviewStatusBadge } from "@/components/ReviewStatusBadge";
import { formatDateTime } from "@/lib/datetime";
import { formatLanguageLabel } from "@/lib/languages";
import type { SnippetListItem } from "@/lib/snippets";

type SnippetRowProps = {
  snippet: SnippetListItem;
};

export function SnippetRow({ snippet }: SnippetRowProps) {
  const href = `/snippets/${snippet.id}`;

  return (
    <tr className="relative transition-colors hover:bg-surface-muted/70">
      <td className="px-5 py-3.5 font-semibold sm:px-6">
        <Link
          href={href}
          className="text-foreground after:absolute after:inset-0 after:content-[''] hover:text-accent"
        >
          {snippet.title}
        </Link>
      </td>
      <td className="pointer-events-none px-5 py-3.5 sm:px-6">
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-medium text-slate-700">
          {formatLanguageLabel(snippet.language)}
        </span>
      </td>
      <td className="pointer-events-none px-5 py-3.5 text-muted sm:px-6">
        {formatDateTime(snippet.createdAt)}
      </td>
      <td className="pointer-events-none px-5 py-3.5 sm:px-6">
        <ReviewStatusBadge status={snippet.reviewStatus} />
      </td>
    </tr>
  );
}
