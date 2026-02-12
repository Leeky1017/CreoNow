import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Editor, JSONContent } from "@tiptap/react";

import {
  EditorStoreProvider,
  createEditorStore,
} from "../../stores/editorStore";
import { OutlinePanelContainer } from "./OutlinePanelContainer";

type EditorEventName = "update" | "selectionUpdate";
type EditorEventHandler = () => void;
type OutlineEditorDouble = Editor & {
  __setDoc: (doc: JSONContent) => void;
  __emitUpdate: () => void;
};

/**
 * Minimal editor double for OutlinePanelContainer behavior tests.
 *
 * Why: container logic only needs document snapshot, selection anchor, and
 * chain navigation hooks; mocking those keeps tests deterministic and fast.
 */
function createOutlineEditorDouble(
  initialDoc: JSONContent,
): OutlineEditorDouble {
  const handlers = new Map<EditorEventName, Set<EditorEventHandler>>();
  let doc = initialDoc;
  const selection = { anchor: 0 };
  const editorState = {
    selection,
    doc: {
      content: { size: 200 },
    },
  };
  const editor = {
    state: editorState,
    getJSON: () => doc,
    on: (event: EditorEventName, handler: EditorEventHandler) => {
      const next = handlers.get(event) ?? new Set();
      next.add(handler);
      handlers.set(event, next);
      return editor;
    },
    off: (event: EditorEventName, handler: EditorEventHandler) => {
      handlers.get(event)?.delete(handler);
      return editor;
    },
    chain: () => ({
      focus: () => ({
        setTextSelection: (position: number) => ({
          run: () => {
            selection.anchor = position;
            handlers.get("selectionUpdate")?.forEach((cb) => cb());
            return true;
          },
        }),
      }),
    }),
    __setDoc: (nextDoc: JSONContent) => {
      doc = nextDoc;
    },
    __emitUpdate: () => {
      handlers.get("update")?.forEach((cb) => cb());
    },
  } as unknown as OutlineEditorDouble;

  return editor;
}

describe("OutlinePanelContainer", () => {
  it("should navigate to clicked heading and highlight active outline item", async () => {
    const store = createEditorStore({
      invoke: async () => {
        throw new Error("invoke should not be called in this test");
      },
    });

    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "第一章" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "场景一" }],
        },
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "对话" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "场景二" }],
        },
      ],
    };

    const editor = createOutlineEditorDouble(doc);
    store.setState({
      bootstrapStatus: "ready",
      documentId: "doc-outline",
      editor,
    });

    render(
      <EditorStoreProvider store={store}>
        <OutlinePanelContainer />
      </EditorStoreProvider>,
    );

    const targetHeading = await screen.findByText("场景二");
    fireEvent.click(targetHeading);

    await waitFor(() => {
      const activeRow = targetHeading.closest('[role="treeitem"]');
      expect(activeRow).not.toBeNull();
      expect(activeRow).toHaveAttribute("aria-selected", "true");
      expect(store.getState().editor?.state.selection.anchor).toBeGreaterThan(
        0,
      );
    });
  });

  it("should keep only the latest outline recomputation when rapid updates arrive", async () => {
    const store = createEditorStore({
      invoke: async () => {
        throw new Error("invoke should not be called in this test");
      },
    });

    const editor = createOutlineEditorDouble({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "初始标题" }],
        },
      ],
    });
    store.setState({
      bootstrapStatus: "ready",
      documentId: "doc-outline",
      editor,
    });

    render(
      <EditorStoreProvider store={store}>
        <OutlinePanelContainer />
      </EditorStoreProvider>,
    );

    for (let i = 1; i <= 10; i += 1) {
      act(() => {
        editor.__setDoc({
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 1 },
              content: [{ type: "text", text: `章节${i}` }],
            },
          ],
        });
        editor.__emitUpdate();
      });
    }

    await waitFor(
      () => {
        expect(screen.getByText("章节10")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    expect(screen.queryByText("章节1")).not.toBeInTheDocument();
    expect(screen.queryByText("章节9")).not.toBeInTheDocument();
  });
});
