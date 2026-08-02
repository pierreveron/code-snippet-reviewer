"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import {
  createSnippetSchema,
  type CreateSnippetFieldErrors,
} from "@/lib/snippet-schema";

export type CreateSnippetResult =
  | { ok: true }
  | { ok: false; errors: CreateSnippetFieldErrors };

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
