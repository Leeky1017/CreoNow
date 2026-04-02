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
});
