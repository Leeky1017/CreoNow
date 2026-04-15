import { render } from "@testing-library/react";
import { TextSelection } from "prosemirror-state";
import { createElement, useEffect, useRef } from "react";
import { describe, expect, it, vi } from "vitest";

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

  it("returns null for getCursorContext when no view is mounted", () => {
    const bridge = createEditorBridge();
    expect(bridge.getCursorContext()).toBeNull();
  });

  it("returns cursor context with correct position and preceding text", () => {
    const bridge = createEditorBridge();
    const container = document.createElement("div");
    document.body.append(container);

    bridge.mount(container, createDoc("hello world"));

    const view = bridge.view;
    if (view === null) {
      throw new Error("EditorView missing");
    }

    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 6)));

    const context = bridge.getCursorContext();
    expect(context).not.toBeNull();
    expect(context!.cursorPosition).toBe(6);
    expect(context!.precedingText).toBe("hello");
  });

  it("returns empty preceding text for getCursorContext on an empty document", () => {
    const bridge = createEditorBridge();
    const container = document.createElement("div");
    document.body.append(container);

    bridge.mount(container);

    const context = bridge.getCursorContext();
    expect(context).not.toBeNull();
    expect(context!.cursorPosition).toBeGreaterThanOrEqual(0);
    expect(context!.precedingText).toBe("");
  });

  it("toggles editor editability for preview mode", () => {
    const bridge = createEditorBridge();
    const container = document.createElement("div");
    document.body.append(container);

    bridge.mount(container, createDoc("hello world"));

    const surface = container.querySelector(".ProseMirror");
    expect(surface).not.toBeNull();
    expect(surface?.getAttribute("contenteditable")).toBe("true");

    bridge.setEditable(false);
    expect(surface?.getAttribute("contenteditable")).toBe("false");

    bridge.setEditable(true);
    expect(surface?.getAttribute("contenteditable")).toBe("true");
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

  it("ignores viewport anchors from DOM selections outside the editor view", () => {
    const bridge = createEditorBridge();
    const container = document.createElement("div");
    const outside = document.createElement("div");
    outside.textContent = "outside";
    document.body.append(container, outside);

    bridge.mount(container, createDoc("hello world"));

    const view = bridge.view;
    if (view === null) {
      throw new Error("EditorView missing");
    }

    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 6)));
    vi.spyOn(view, "coordsAtPos")
      .mockReturnValueOnce({ bottom: 44, left: 20, right: 60, top: 24 })
      .mockReturnValueOnce({ bottom: 48, left: 72, right: 112, top: 28 });

    const getSelectionMock = vi.spyOn(globalThis, "getSelection").mockReturnValue({
      anchorNode: outside,
      focusNode: outside,
      getRangeAt: () => ({
        getBoundingClientRect: () => ({
          bottom: 999,
          height: 20,
          left: 500,
          right: 580,
          top: 960,
          width: 80,
        }),
      }),
      rangeCount: 1,
    } as unknown as Selection);

    expect(bridge.getSelectionViewportAnchor()).toEqual({
      bottom: 48,
      left: 66,
      top: 24,
    });

    getSelectionMock.mockRestore();
  });
});
