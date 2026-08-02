"use client";

import { go } from "@codemirror/lang-go";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import {
  EditorState,
  StateEffect,
  StateField,
  type Extension,
} from "@codemirror/state";
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";
import { githubLight } from "@uiw/codemirror-theme-github";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { useEffect, useMemo, useRef } from "react";

export type HighlightRange = {
  startLine: number;
  endLine: number;
};

type CodeEditorProps = {
  value: string;
  language: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  height?: string;
  highlightRange?: HighlightRange | null;
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

const setHighlightRange = StateEffect.define<HighlightRange | null>();

const highlightLineDeco = Decoration.line({ class: "cm-finding-line" });

function highlightDecorations(
  state: EditorState,
  range: HighlightRange | null,
): DecorationSet {
  if (!range) {
    return Decoration.none;
  }

  const docLines = state.doc.lines;
  const startLine = Math.min(Math.max(range.startLine, 1), docLines);
  const endLine = Math.min(Math.max(range.endLine, startLine), docLines);
  const decorations = [];

  for (let line = startLine; line <= endLine; line += 1) {
    decorations.push(highlightLineDeco.range(state.doc.line(line).from));
  }

  return Decoration.set(decorations);
}

const highlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, transaction) {
    let next = decorations.map(transaction.changes);

    for (const effect of transaction.effects) {
      if (effect.is(setHighlightRange)) {
        next = highlightDecorations(transaction.state, effect.value);
      }
    }

    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

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
  ".cm-finding-line": {
    backgroundColor: "color-mix(in srgb, var(--accent-soft) 85%, transparent)",
  },
});

function scrollToHighlight(view: EditorView, range: HighlightRange | null) {
  if (!range) {
    return;
  }

  const docLines = view.state.doc.lines;
  const lineNumber = Math.min(Math.max(range.startLine, 1), docLines);
  const line = view.state.doc.line(lineNumber);

  view.dispatch({
    effects: EditorView.scrollIntoView(line.from, { y: "center" }),
  });
}

function applyHighlight(view: EditorView, range: HighlightRange | null) {
  view.dispatch({
    effects: setHighlightRange.of(range),
  });
  scrollToHighlight(view, range);
}

export function CodeEditor({
  value,
  language,
  readOnly = false,
  onChange,
  height = "420px",
  highlightRange = null,
}: CodeEditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  const extensions = useMemo(
    () => [...languageExtensions(language), editorTheme, highlightField],
    [language],
  );

  useEffect(() => {
    const view = editorRef.current?.view;
    if (!view) {
      return;
    }

    applyHighlight(view, highlightRange);
  }, [highlightRange, value]);

  return (
    <CodeMirror
      ref={editorRef}
      value={value}
      height={height}
      theme={githubLight}
      extensions={extensions}
      editable={!readOnly}
      readOnly={readOnly}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: !readOnly,
        highlightActiveLineGutter: !readOnly,
      }}
      onCreateEditor={(view) => {
        applyHighlight(view, highlightRange);
      }}
      onChange={onChange}
      className="overflow-hidden rounded-xl border border-border"
    />
  );
}
