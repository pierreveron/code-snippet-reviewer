"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { KeyboardEvent } from "react";

import { ReviewStatusBadge } from "@/components/ReviewStatusBadge";
import { formatDateTime } from "@/lib/datetime";
import { formatLanguageLabel } from "@/lib/languages";
import type { SnippetListItem } from "@/lib/snippets";

type SnippetRowProps = {
  snippet: SnippetListItem;
};

export function SnippetRow({ snippet }: SnippetRowProps) {
  const router = useRouter();
  const href = `/snippets/${snippet.id}`;

  function navigate() {
    router.push(href);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigate();
    }
  }

  return (
    <tr
      tabIndex={0}
      onClick={navigate}
      onKeyDown={onKeyDown}
      className="cursor-pointer transition-colors hover:bg-surface-muted/70 focus-visible:bg-surface-muted/70 focus-visible:outline-none"
    >
      <td className="border-b border-border px-5 py-3.5 font-semibold sm:px-6">
        <Link
          href={href}
          className="relative z-10 text-foreground hover:text-accent"
          onClick={(event) => {
            // Let the real link handle navigation (new tab, etc.).
            event.stopPropagation();
          }}
        >
          {snippet.title}
        </Link>
      </td>
      <td className="border-b border-border px-5 py-3.5 sm:px-6">
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-medium text-slate-700">
          {formatLanguageLabel(snippet.language)}
        </span>
      </td>
      <td className="border-b border-border px-5 py-3.5 text-muted sm:px-6">
        {formatDateTime(snippet.createdAt)}
      </td>
      <td className="border-b border-border px-5 py-3.5 sm:px-6">
        <ReviewStatusBadge status={snippet.reviewStatus} />
      </td>
    </tr>
  );
}
