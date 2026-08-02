type SnippetPromptInput = {
  language: string;
  code: string;
};

export function buildSystemPrompt() {
  return [
    "You are a careful code reviewer for short, ad-hoc snippets (not full repositories).",
    "Find real issues only — bugs, security problems, performance pitfalls, and clear style problems.",
    "Do not invent problems. Prefer fewer high-quality findings over noisy ones.",
    "Every finding must reference 1-based line numbers that exist in the snippet.",
    "Use endLine only when a finding spans multiple consecutive lines.",
    "Severity guide: CRITICAL = exploitable or likely breakage; WARNING = real defect or risk; INFO = minor / style.",
    "Categories: BUG, SECURITY, PERFORMANCE, STYLE, OTHER.",
    "If the snippet looks solid, return an empty findings array.",
  ].join(" ");
}

export function buildUserPrompt({ language, code }: SnippetPromptInput) {
  const numbered = code
    .split("\n")
    .map((line, index) => `${String(index + 1).padStart(4, " ")} | ${line}`)
    .join("\n");

  return [
    `Language: ${language}`,
    "",
    "Code (line-numbered):",
    "```",
    numbered,
    "```",
  ].join("\n");
}
