export type LanguageOption = {
  value: string;
  label: string;
};

/** Predefined languages for create UI and CodeMirror mapping. */
export const LANGUAGES: LanguageOption[] = [
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "other", label: "Other" },
];

export function formatLanguageLabel(language: string): string {
  const match = LANGUAGES.find((item) => item.value === language.toLowerCase());
  if (match) return match.label;
  if (!language) return "Unknown";
  return language.charAt(0).toUpperCase() + language.slice(1);
}

/** Normalize stored language values to a known combobox option. */
export function normalizeLanguageValue(language: string): string {
  const match = LANGUAGES.find((item) => item.value === language.toLowerCase());
  return match?.value ?? "other";
}
