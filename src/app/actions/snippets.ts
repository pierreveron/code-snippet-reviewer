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
  | { ok: true; contentVersion: number }
  | { ok: false; errors: UpdateSnippetFieldErrors };

export async function createSnippet(input: {
  title: string;
  language: string;
  code: string;
  /** When true, redirect with ?review=1 so the detail page starts a first review. */
  startReview?: boolean;
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
  const reviewQuery = input.startReview ? "?review=1" : "";
  redirect(`/snippets/${snippet.id}${reviewQuery}`);
}

export async function updateSnippet(input: {
  id: string;
  title: string;
  language: string;
  code: string;
  expectedVersion: number;
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

  try {
    const existing = await db.snippet.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        code: true,
        language: true,
        contentVersion: true,
      },
    });

    if (!existing) {
      return {
        ok: false,
        errors: { title: ["Snippet not found"] },
      };
    }

    // Code/language changes invalidate line-bound findings — drop the review.
    const reviewOutdated =
      existing.code !== parsed.data.code ||
      existing.language !== parsed.data.language;

    const saved = await db.$transaction(async (tx) => {
      const updated = await tx.snippet.updateMany({
        where: {
          id: input.id,
          contentVersion: input.expectedVersion,
        },
        data: {
          title: parsed.data.title,
          language: parsed.data.language,
          code: parsed.data.code,
          ...(reviewOutdated
            ? { contentVersion: { increment: 1 as const } }
            : {}),
        },
      });

      if (updated.count !== 1) {
        return false;
      }

      if (reviewOutdated) {
        await tx.review.deleteMany({
          where: { snippetId: input.id },
        });
      }

      return true;
    });

    if (!saved) {
      return {
        ok: false,
        errors: {
          form: [
            "The snippet changed in another request. Refresh and try again.",
          ],
        },
      };
    }

    revalidatePath("/");
    revalidatePath(`/snippets/${input.id}`);

    return {
      ok: true,
      contentVersion: input.expectedVersion + (reviewOutdated ? 1 : 0),
    };
  } catch {
    return {
      ok: false,
      errors: {
        form: ["Couldn't save the snippet. Please try again."],
      },
    };
  }
}
