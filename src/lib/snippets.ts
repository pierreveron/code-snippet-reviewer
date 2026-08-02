import "server-only";

import { connection } from "next/server";
import { notFound } from "next/navigation";

import { ReviewStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

export type SnippetListItem = {
  id: string;
  title: string;
  language: string;
  createdAt: Date;
  reviewStatus: ReviewStatus | null;
};

export type SnippetDetail = {
  id: string;
  title: string;
  language: string;
  code: string;
  createdAt: Date;
  updatedAt: Date;
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

export async function getSnippet(id: string): Promise<SnippetDetail> {
  await connection();

  const snippet = await db.snippet.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      language: true,
      code: true,
      createdAt: true,
      updatedAt: true,
      review: {
        select: { status: true },
      },
    },
  });

  if (!snippet) {
    notFound();
  }

  return {
    id: snippet.id,
    title: snippet.title,
    language: snippet.language,
    code: snippet.code,
    createdAt: snippet.createdAt,
    updatedAt: snippet.updatedAt,
    reviewStatus: snippet.review?.status ?? null,
  };
}
