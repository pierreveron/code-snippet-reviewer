"use client";

import { go } from "@codemirror/lang-go";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { githubLight } from "@uiw/codemirror-theme-github";
import CodeMirror from "@uiw/react-codemirror";

type CodeEditorProps = {
  value: string;
  language: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  height?: string;
};

function languageExtensions(language: string): Extension[] {
  switch (language.toLowerCase()) {
    case "typescript":
      return [javascript({ typescript: true, jsx: true })];
    case "javascript":
      return [javascript({ jsx: true })];
    case "python":
      return [python()];
    case "java":
      return [java()];
    case "go":
      return [go()];
    case "rust":
      return [rust()];
    default:
      return [];
  }
}

const editorTheme = EditorView.theme({
  "&": {
    fontSize: "13px",
  },
  ".cm-content": {
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
    paddingTop: "12px",
    paddingBottom: "12px",
  },
  ".cm-gutters": {
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  },
});

export function CodeEditor({
  value,
  language,
  readOnly = false,
  onChange,
  height = "420px",
}: CodeEditorProps) {
  return (
    <CodeMirror
      value={value}
      height={height}
      theme={githubLight}
      extensions={[...languageExtensions(language), editorTheme]}
      editable={!readOnly}
      readOnly={readOnly}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: !readOnly,
        highlightActiveLineGutter: !readOnly,
      }}
      onChange={onChange}
      className="overflow-hidden rounded-xl border border-border"
    />
  );
}
