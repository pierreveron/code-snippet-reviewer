import { notFound } from "next/navigation";

import { SnippetDetailContent } from "@/components/SnippetDetailContent";
import { getSnippet } from "@/lib/snippets";

type SnippetDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ review?: string | string[] }>;
};

export default async function SnippetDetailPage({
  params,
  searchParams,
}: SnippetDetailPageProps) {
  const { id } = await params;
  const { review } = await searchParams;

  if (!id) {
    notFound();
  }

  const snippet = await getSnippet(id);
  const reviewParam = Array.isArray(review) ? review[0] : review;
  const autoStartReview = reviewParam === "1";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      <SnippetDetailContent
        snippet={snippet}
        autoStartReview={autoStartReview}
      />
    </div>
  );
}
