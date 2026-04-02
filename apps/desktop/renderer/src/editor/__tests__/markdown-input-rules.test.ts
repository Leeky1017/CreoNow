import { describe, expect, it } from "vitest";
import { TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import { createEditorBridge } from "@/editor/bridge";

function typeText(view: EditorView, text: string): void {
  for (const character of text) {
    const from = view.state.selection.from;
    const to = view.state.selection.to;
    const handled = view.someProp("handleTextInput", (handler) =>
      handler(view, from, to, character, () => view.state.tr.insertText(character, from, to)),
    );

    if (handled !== true) {
      view.dispatch(view.state.tr.insertText(character, from, to));
    }
  }
}

describe("markdown input rules", () => {
  it("turns '# ' into a level-1 heading", () => {
    const bridge = createEditorBridge();
    const container = document.createElement("div");
    document.body.append(container);

    bridge.mount(container);

    const view = bridge.view;
    if (view === null) {
      throw new Error("EditorView missing");
    }

    typeText(view, "# ");

    expect(view.state.doc.firstChild?.type.name).toBe("heading");
    expect(view.state.doc.firstChild?.attrs.level).toBe(1);
  });

  it("turns '- ' into a bullet list", () => {
    const bridge = createEditorBridge();
    const container = document.createElement("div");
    document.body.append(container);

    bridge.mount(container);

    const view = bridge.view;
    if (view === null) {
      throw new Error("EditorView missing");
    }

    typeText(view, "- ");

    expect(view.state.doc.firstChild?.type.name).toBe("bullet_list");
    expect(view.state.doc.firstChild?.firstChild?.type.name).toBe("list_item");
  });

  it("turns '**text**' into bold text", () => {
    const bridge = createEditorBridge();
    const container = document.createElement("div");
    document.body.append(container);

    bridge.mount(container);

    const view = bridge.view;
    if (view === null) {
      throw new Error("EditorView missing");
    }

    typeText(view, "**bold**");

    const paragraph = view.state.doc.firstChild;
    const textNode = paragraph?.firstChild;

    expect(paragraph?.type.name).toBe("paragraph");
    expect(textNode?.text).toBe("bold");
    expect(textNode?.marks.map((mark) => mark.type.name)).toEqual(["bold"]);
  });

  it("turns '`code`' into code mark text", () => {
    const bridge = createEditorBridge();
    const container = document.createElement("div");
    document.body.append(container);

    bridge.mount(container);

    const view = bridge.view;
    if (view === null) {
      throw new Error("EditorView missing");
    }

    typeText(view, "`snippet`");

    const paragraph = view.state.doc.firstChild;
    const textNode = paragraph?.firstChild;

    expect(textNode?.text).toBe("snippet");
    expect(textNode?.marks.map((mark) => mark.type.name)).toEqual(["code"]);
  });

  it("keeps selection hash verification on authoritative schema after shortcut transforms", () => {
    const bridge = createEditorBridge();
    const container = document.createElement("div");
    document.body.append(container);

    bridge.mount(container);

    const view = bridge.view;
    if (view === null) {
      throw new Error("EditorView missing");
    }

    typeText(view, "**hello**");
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 6)));
    const selection = bridge.getSelection();

    expect(selection?.text).toBe("hello");
    expect(selection?.selectionTextHash).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });
});
