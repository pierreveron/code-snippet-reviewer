import { notFound } from "next/navigation";

import { SnippetDetailContent } from "@/components/SnippetDetailContent";
import { parseSnippetListReturnTo } from "@/lib/snippet-filters";
import { getSnippet } from "@/lib/snippets";

type SnippetDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    review?: string | string[];
    returnTo?: string | string[];
  }>;
};

export default async function SnippetDetailPage({
  params,
  searchParams,
}: SnippetDetailPageProps) {
  const { id } = await params;
  const { review, returnTo } = await searchParams;

  if (!id) {
    notFound();
  }

  const snippet = await getSnippet(id);
  const reviewParam = Array.isArray(review) ? review[0] : review;
  // ?review=1 is only a Create-and-Review signal for never-reviewed snippets.
  // Do not re-run on shared/bookmarked URLs for snippets that already have a review.
  const reviewRequested = reviewParam === "1";
  const autoStartReview =
    reviewRequested && snippet.reviewStatus === null;
  const listReturnTo = parseSnippetListReturnTo(returnTo);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <SnippetDetailContent
        snippet={snippet}
        autoStartReview={autoStartReview}
        clearReviewQuery={reviewRequested}
        listReturnTo={listReturnTo}
      />
    </div>
  );
}
