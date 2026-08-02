"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import {
  createSnippetSchema,
  updateSnippetMetadataSchema,
  type CreateSnippetFieldErrors,
  type UpdateSnippetMetadataFieldErrors,
} from "@/lib/snippet-schema";

export type CreateSnippetResult =
  | { ok: true }
  | { ok: false; errors: CreateSnippetFieldErrors };

export type UpdateSnippetMetadataResult =
  | { ok: true }
  | { ok: false; errors: UpdateSnippetMetadataFieldErrors };

export async function createSnippet(input: {
  title: string;
  language: string;
  code: string;
}): Promise<CreateSnippetResult> {
  const parsed = createSnippetSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const snippet = await db.snippet.create({
    data: {
      title: parsed.data.title,
      language: parsed.data.language,
      code: parsed.data.code,
    },
  });

  revalidatePath("/");
  redirect(`/snippets/${snippet.id}`);
}

export async function updateSnippetMetadata(input: {
  id: string;
  title: string;
  language: string;
}): Promise<UpdateSnippetMetadataResult> {
  const parsed = updateSnippetMetadataSchema.safeParse({
    title: input.title,
    language: input.language,
  });

  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await db.snippet.findUnique({
    where: { id: input.id },
    select: { id: true },
  });

  if (!existing) {
    return {
      ok: false,
      errors: { title: ["Snippet not found"] },
    };
  }

  await db.snippet.update({
    where: { id: input.id },
    data: {
      title: parsed.data.title,
      language: parsed.data.language,
    },
  });

  revalidatePath("/");
  revalidatePath(`/snippets/${input.id}`);

  return { ok: true };
}
