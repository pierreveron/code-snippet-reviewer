import "server-only";

import { connection } from "next/server";
import { notFound } from "next/navigation";

import type {
  FindingCategory,
  FindingResolution,
  FindingSeverity,
  ReviewStatus,
} from "@/generated/prisma/enums";
import { db } from "@/lib/db";

export type SnippetListItem = {
  id: string;
  title: string;
  language: string;
  createdAt: Date;
  reviewStatus: ReviewStatus | null;
};

export type SnippetFinding = {
  id: string;
  startLine: number;
  endLine: number | null;
  severity: FindingSeverity;
  category: FindingCategory;
  description: string;
  suggestedFix: string | null;
  resolution: FindingResolution;
};

export type SnippetDetail = {
  id: string;
  title: string;
  language: string;
  code: string;
  createdAt: Date;
  updatedAt: Date;
  reviewStatus: ReviewStatus | null;
  reviewErrorMessage: string | null;
  findings: SnippetFinding[];
};

const severityOrder: Record<FindingSeverity, number> = {
  CRITICAL: 0,
  WARNING: 1,
  INFO: 2,
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
        select: {
          status: true,
          errorMessage: true,
          findings: {
            select: {
              id: true,
              startLine: true,
              endLine: true,
              severity: true,
              category: true,
              description: true,
              suggestedFix: true,
              resolution: true,
            },
          },
        },
      },
    },
  });

  if (!snippet) {
    notFound();
  }

  const findings = [...(snippet.review?.findings ?? [])].sort((a, b) => {
    if (a.startLine !== b.startLine) {
      return a.startLine - b.startLine;
    }
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return {
    id: snippet.id,
    title: snippet.title,
    language: snippet.language,
    code: snippet.code,
    createdAt: snippet.createdAt,
    updatedAt: snippet.updatedAt,
    reviewStatus: snippet.review?.status ?? null,
    reviewErrorMessage: snippet.review?.errorMessage ?? null,
    findings,
  };
}
