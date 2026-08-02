import { z } from "zod";

import { LANGUAGES } from "@/lib/languages";

const languageValues = LANGUAGES.map((language) => language.value) as [
  string,
  ...string[],
];

const titleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(120, "Title must be at most 120 characters");

const languageSchema = z.enum(languageValues, {
  error: "Select a language from the list",
});

export const createSnippetSchema = z.object({
  title: titleSchema,
  language: languageSchema,
  code: z
    .string()
    .min(1, "Code is required")
    .max(100_000, "Code must be at most 100,000 characters"),
});

export const updateSnippetMetadataSchema = z.object({
  title: titleSchema,
  language: languageSchema,
});

export type CreateSnippetInput = z.infer<typeof createSnippetSchema>;

export type CreateSnippetFieldErrors = {
  title?: string[];
  language?: string[];
  code?: string[];
  form?: string[];
};

export type UpdateSnippetMetadataFieldErrors = {
  title?: string[];
  language?: string[];
};
