import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

const DEFAULT_REVIEW_MODEL = "openai:gpt-5.6-luna";

export function getReviewModelId() {
  return process.env.REVIEW_MODEL?.trim() || DEFAULT_REVIEW_MODEL;
}

/**
 * Parse `provider:modelId` (e.g. `openai:gpt-5.6-luna`) into an AI SDK model.
 */
export function resolveReviewModel(modelSpec = getReviewModelId()): LanguageModel {
  const separator = modelSpec.indexOf(":");
  if (separator <= 0 || separator === modelSpec.length - 1) {
    throw new Error(
      `Invalid REVIEW_MODEL "${modelSpec}". Expected "provider:modelId" (e.g. openai:gpt-5.6-luna).`,
    );
  }

  const provider = modelSpec.slice(0, separator);
  const modelId = modelSpec.slice(separator + 1);

  switch (provider) {
    case "openai":
      return openai(modelId);
    case "anthropic":
      return anthropic(modelId);
    default:
      throw new Error(
        `Unsupported REVIEW_MODEL provider "${provider}". Use openai or anthropic.`,
      );
  }
}
