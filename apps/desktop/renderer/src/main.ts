/**
 * CreoNow Desktop — Renderer Entry Point
 *
 * Minimal ProseMirror editor foundation for Phase 1.
 *
 * Architecture decision §五: Editor uses ProseMirror for full transaction
 * control, schema ownership, and snapshot integration.
 *
 * This file is the single authoritative entry point for the Electron renderer
 * process.  creonow-app is NOT the runtime UI.
 */

import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";

// ── P1 Document Schema ─────────────────────────────────────────────────────

/**
 * Minimal prose schema for Phase 1.
 * Supports paragraphs, headings (h1-h3), and inline marks (bold, italic, code).
 */
const p1Schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      group: "block",
      content: "inline*",
      parseDOM: [{ tag: "p" }],
      toDOM: () => ["p", 0],
    },
    heading: {
      attrs: { level: { default: 1 } },
      content: "inline*",
      group: "block",
      defining: true,
      parseDOM: [
        { tag: "h1", attrs: { level: 1 } },
        { tag: "h2", attrs: { level: 2 } },
        { tag: "h3", attrs: { level: 3 } },
      ],
      toDOM: (node) => [`h${node.attrs.level as number}`, 0],
    },
    text: { group: "inline" },
  },
  marks: {
    bold: {
      parseDOM: [{ tag: "strong" }, { tag: "b" }],
      toDOM: () => ["strong", 0],
    },
    italic: {
      parseDOM: [{ tag: "em" }, { tag: "i" }],
      toDOM: () => ["em", 0],
    },
    code: {
      parseDOM: [{ tag: "code" }],
      toDOM: () => ["code", 0],
    },
  },
});

// ── Editor bootstrap ───────────────────────────────────────────────────────

function mountEditor(container: HTMLElement): EditorView {
  const state = EditorState.create({
    schema: p1Schema,
    doc: p1Schema.node("doc", null, [
      p1Schema.node("paragraph", null, []),
    ]),
  });

  const view = new EditorView(container, {
    state,
    dispatchTransaction(transaction) {
      const newState = view.state.apply(transaction);
      view.updateState(newState);
    },
  });

  return view;
}

// ── App shell ──────────────────────────────────────────────────────────────

function bootstrap(): void {
  const root = document.getElementById("app");
  if (!root) {
    // Fallback: static shell is already rendered in index.html
    return;
  }

  root.innerHTML = "";
  root.style.cssText = [
    "display:grid",
    "place-items:start center",
    "min-height:100vh",
    "background:#0f1115",
    "padding:48px 24px",
  ].join(";");

  const editorWrapper = document.createElement("div");
  editorWrapper.style.cssText = [
    "width:100%",
    "max-width:680px",
    "min-height:400px",
    "background:#161b22",
    "border-radius:8px",
    "padding:24px",
    "color:#f5f7fa",
    "font-family:\"Source Han Sans\",\"Noto Sans SC\",Inter,sans-serif",
    "font-size:16px",
    "line-height:1.75",
    "outline:none",
  ].join(";");

  root.appendChild(editorWrapper);

  // Mount ProseMirror
  const view = mountEditor(editorWrapper);

  // Focus on load
  requestAnimationFrame(() => view.focus());
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
