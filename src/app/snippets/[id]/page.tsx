import { notFound } from "next/navigation";

import { SnippetDetailContent } from "@/components/SnippetDetailContent";
import { getSnippet } from "@/lib/snippets";

type SnippetDetailPageProps = {
  params: Promise<{ id: string }>;
};

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
      <SnippetDetailContent snippet={snippet} />
    </div>
  );
}
