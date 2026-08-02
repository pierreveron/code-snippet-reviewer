"use client";

import { useRouter } from "next/navigation";
import type { KeyboardEvent } from "react";

import { ReviewStatusBadge } from "@/components/ReviewStatusBadge";
import { formatLanguageLabel } from "@/lib/languages";
import type { SnippetListItem } from "@/lib/snippets";

type SnippetRowProps = {
  snippet: SnippetListItem;
};

function formatCreatedAt(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function SnippetRow({ snippet }: SnippetRowProps) {
  const router = useRouter();
  const href = `/snippets/${snippet.id}`;

  function goToSnippet() {
    router.push(href);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      goToSnippet();
    }
  }

  return (
    <tr
      role="link"
      tabIndex={0}
      aria-label={`Open snippet ${snippet.title}`}
      onClick={goToSnippet}
      onKeyDown={onKeyDown}
      className="cursor-pointer transition-colors hover:bg-surface-muted/70 focus-visible:bg-surface-muted/70 focus-visible:outline-none"
    >
      <td className="px-5 py-3.5 font-semibold text-foreground sm:px-6">
        {snippet.title}
      </td>
      <td className="px-5 py-3.5 sm:px-6">
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-medium text-slate-700">
          {formatLanguageLabel(snippet.language)}
        </span>
      </td>
      <td className="px-5 py-3.5 text-muted sm:px-6">
        {formatCreatedAt(snippet.createdAt)}
      </td>
      <td className="px-5 py-3.5 sm:px-6">
        <ReviewStatusBadge status={snippet.reviewStatus} />
      </td>
    </tr>
  );
}
