"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import {
  createSnippetSchema,
  updateSnippetSchema,
  type CreateSnippetFieldErrors,
  type UpdateSnippetFieldErrors,
} from "@/lib/snippet-schema";

export type CreateSnippetResult =
  | { ok: true }
  | { ok: false; errors: CreateSnippetFieldErrors };

export type UpdateSnippetResult =
  | { ok: true }
  | { ok: false; errors: UpdateSnippetFieldErrors };

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

  let snippet;
  try {
    snippet = await db.snippet.create({
      data: {
        title: parsed.data.title,
        language: parsed.data.language,
        code: parsed.data.code,
      },
    });
  } catch {
    return {
      ok: false,
      errors: {
        form: ["Couldn't save the snippet. Please try again."],
      },
    };
  }

  revalidatePath("/");
  redirect(`/snippets/${snippet.id}`);
}

export async function updateSnippet(input: {
  id: string;
  title: string;
  language: string;
  code: string;
}): Promise<UpdateSnippetResult> {
  const parsed = updateSnippetSchema.safeParse({
    title: input.title,
    language: input.language,
    code: input.code,
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
      code: parsed.data.code,
    },
  });

  revalidatePath("/");
  revalidatePath(`/snippets/${input.id}`);

  return { ok: true };
}
