import "server-only";

import { connection } from "next/server";

import { ReviewStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

export type SnippetListItem = {
  id: string;
  title: string;
  language: string;
  createdAt: Date;
  reviewStatus: ReviewStatus | null;
};

export async function listSnippets(): Promise<SnippetListItem[]> {
  // better-sqlite3 can resolve during prerender; wait for a request first.
  await connection();

  const snippets = await db.snippet.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      language: true,
      createdAt: true,
      review: {
        select: { status: true },
      },
    },
  });

  return snippets.map((snippet) => ({
    id: snippet.id,
    title: snippet.title,
    language: snippet.language,
    createdAt: snippet.createdAt,
    reviewStatus: snippet.review?.status ?? null,
  }));
}
