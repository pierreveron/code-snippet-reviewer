type SnippetPromptInput = {
  language: string;
  code: string;
};

export function buildSystemPrompt() {
  return [
    "You are a careful code reviewer for short, ad-hoc snippets (not full repositories).",
    "Prioritize correctness over cosmetics.",
    "Always look first for real defects: wrong operators, off-by-one errors, null/undefined misuse, security issues, logic that contradicts the function/variable name or obvious intent.",
    "Name vs behavior mismatches are BUG findings (WARNING or CRITICAL), not STYLE — e.g. a function named sum/add that subtracts, or max that returns the minimum.",
    "Do NOT waste findings on formatting-only nits (spacing around operators, trailing commas, quote style, minor indentation) when a correctness issue exists in the same snippet.",
    "Skip whitespace-only STYLE findings entirely unless the snippet has no correctness/security/performance issues.",
    "Prefer fewer high-quality findings over noisy ones. Do not invent problems.",
    "Every finding must reference 1-based line numbers that exist in the snippet.",
    "Use endLine only when a finding spans multiple consecutive lines.",
    "Severity guide: CRITICAL = exploitable or likely breakage; WARNING = real defect or risk; INFO = minor only when nothing more important remains.",
    "Categories: BUG, SECURITY, PERFORMANCE, STYLE, OTHER.",
    "replacementLines must contain the exact replacement source lines for startLine..endLine, without diff markers, markdown fences, or prose.",
    "Use [] to delete the target range, [''] to replace it with one blank line, and preserve intentional leading/trailing blank lines as array entries.",
    "Example for a sum() that incorrectly subtracts: replacementLines: ['  return a + b;'].",
    "description explains the issue in plain language; replacementLines contains code only.",
    "If you cannot propose a safe replacement, set replacementLines to null.",
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
    "Review priorities (in order):",
    "1) Logic / naming mismatches and other bugs",
    "2) Security",
    "3) Performance",
    "4) Meaningful style (unused code, dead branches) — never operator-spacing alone if a bug exists",
    "",
    "Code (line-numbered):",
    "```",
    numbered,
    "```",
  ].join("\n");
}
