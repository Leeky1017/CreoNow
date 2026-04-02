import { render } from "@testing-library/react";
import { TextSelection } from "prosemirror-state";
import { createElement, useEffect, useRef } from "react";
import { describe, expect, it } from "vitest";

import { createEditorBridge } from "@/editor/bridge";

function createDoc(text: string) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

function BridgeHost({ bridge }: { bridge: ReturnType<typeof createEditorBridge> }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      bridge.mount(containerRef.current);
    }

    return () => bridge.destroy();
  }, [bridge]);

  return createElement("div", { ref: containerRef });
}

describe("createEditorBridge", () => {
  it("mounts into a DOM container and extracts a text selection", () => {
    const bridge = createEditorBridge();
    const container = document.createElement("div");
    document.body.append(container);

    bridge.mount(container, createDoc("hello world"));

    expect(container.querySelector(".cn-editor-surface")).not.toBeNull();

    const view = bridge.view;
    expect(view).not.toBeNull();
    if (view === null) {
      throw new Error("EditorView missing");
    }

    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 6)));

    const selection = bridge.getSelection();
    expect(selection).not.toBeNull();
    expect(selection?.text).toBe("hello");
  });

  it("returns null when there is no text selection", () => {
    const bridge = createEditorBridge();
    const container = document.createElement("div");
    document.body.append(container);

    bridge.mount(container, createDoc("hello world"));

    const view = bridge.view;
    if (view === null) {
      throw new Error("EditorView missing");
    }

    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1)));

    expect(bridge.getSelection()).toBeNull();
  });

  it("destroys the EditorView when the hosting component unmounts", () => {
    const bridge = createEditorBridge();
    const rendered = render(createElement(BridgeHost, { bridge }));

    expect(rendered.container.querySelector(".ProseMirror")).not.toBeNull();

    rendered.unmount();

    expect(bridge.view).toBeNull();
    expect(rendered.container.querySelector(".ProseMirror")).toBeNull();
  });

  it("blocks write-back when selection hash no longer matches", () => {
    const bridge = createEditorBridge();
    const container = document.createElement("div");
    document.body.append(container);

    bridge.mount(container, createDoc("hello world"));

    const view = bridge.view;
    if (view === null) {
      throw new Error("EditorView missing");
    }

    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 6)));
    const selection = bridge.getSelection();
    if (selection === null) {
      throw new Error("Selection missing");
    }

    bridge.setContent(createDoc("hullo world"));

    expect(bridge.replaceSelection(selection, "refined")).toEqual({
      ok: false,
      reason: "selection-changed",
    });
  });

  it("replaces a selection with multi-paragraph text using block-aware structure", () => {
    const bridge = createEditorBridge();
    const container = document.createElement("div");
    document.body.append(container);

    bridge.mount(container, createDoc("甲乙丙丁"));

    const view = bridge.view;
    if (view === null) {
      throw new Error("EditorView missing");
    }

    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 5)));
    const selection = bridge.getSelection();
    if (selection === null) {
      throw new Error("Selection missing");
    }

    expect(bridge.replaceSelection(selection, "第一段\n第二段")).toEqual({ ok: true });
    expect(bridge.getContent()).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "第一段" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "第二段" }],
        },
      ],
    });
  });

  it("getCursorContext returns position and preceding text", () => {
    const bridge = createEditorBridge();
    const container = document.createElement("div");
    document.body.append(container);

    bridge.mount(container, createDoc("hello world"));

    const view = bridge.view;
    if (view === null) {
      throw new Error("EditorView missing");
    }

    // Move cursor to position 6 (after "hello ")
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 6)));

    const ctx = bridge.getCursorContext();
    expect(ctx).not.toBeNull();
    expect(ctx?.position).toBe(6);
    expect(ctx?.precedingText).toBe("hello");
  });

  it("getCursorContext returns null when view is not mounted", () => {
    const bridge = createEditorBridge();
    expect(bridge.getCursorContext()).toBeNull();
  });

  it("insertAtCursor inserts text when cursor position matches", () => {
    const bridge = createEditorBridge();
    const container = document.createElement("div");
    document.body.append(container);

    bridge.mount(container, createDoc("hello world"));

    const view = bridge.view;
    if (view === null) {
      throw new Error("EditorView missing");
    }

    // Place cursor at end of "hello" (position 6)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 6)));

    const result = bridge.insertAtCursor(6, " there");
    expect(result).toEqual({ ok: true });
    expect(bridge.getTextContent()).toBe("hello there world");
  });

  it("insertAtCursor returns cursor-moved when position has changed", () => {
    const bridge = createEditorBridge();
    const container = document.createElement("div");
    document.body.append(container);

    bridge.mount(container, createDoc("hello world"));

    const view = bridge.view;
    if (view === null) {
      throw new Error("EditorView missing");
    }

    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 6)));

    // Provide stale position
    const result = bridge.insertAtCursor(3, "X");
    expect(result).toEqual({ ok: false, reason: "cursor-moved" });
  });

  it("insertAtCursor returns cursor-moved when view is not mounted", () => {
    const bridge = createEditorBridge();
    expect(bridge.insertAtCursor(0, "X")).toEqual({ ok: false, reason: "cursor-moved" });
  });
});