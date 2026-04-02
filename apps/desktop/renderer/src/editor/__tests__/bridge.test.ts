import { TextSelection } from "prosemirror-state";
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
