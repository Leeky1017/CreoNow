import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { IpcRequest } from "../../../../../../packages/shared/types/ipc-generated";

import {
  EditorStoreProvider,
  createEditorStore,
} from "../../stores/editorStore";
import { EditorPane, sanitizePastedHtml } from "./EditorPane";

function createReadyEditorStore(args: {
  onSave: (payload: {
    actor: string;
    reason: string;
    projectId: string;
    documentId: string;
    contentJson: string;
  }) => void;
}) {
  const store = createEditorStore({
    invoke: async (channel, payload) => {
      if (channel === "file:document:save") {
        const savePayload = payload as IpcRequest<"file:document:save">;
        args.onSave({
          actor: savePayload.actor,
          reason: savePayload.reason,
          projectId: savePayload.projectId,
          documentId: savePayload.documentId,
          contentJson: savePayload.contentJson,
        });
        return {
          ok: true,
          data: {
            contentHash: "hash-manual",
            updatedAt: 101,
          },
        };
      }

      if (channel === "file:document:updatestatus") {
        return {
          ok: true,
          data: {
            updated: true,
            status: "draft",
          },
        };
      }

      throw new Error(`Unexpected channel: ${channel}`);
    },
  });

  store.setState({
    bootstrapStatus: "ready",
    projectId: "project-1",
    documentId: "doc-1",
    documentStatus: "draft",
    documentContentJson: JSON.stringify({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Initial" }] },
      ],
    }),
    autosaveStatus: "idle",
    autosaveError: null,
  });

  return store;
}

/**
 * Wait until EditorPane wires the TipTap editor instance into editorStore.
 *
 * Why: tests need direct access to selection/formatting commands to verify
 * Bubble Menu scenarios against real editor state.
 */
async function waitForEditorInstance(
  store: ReturnType<typeof createReadyEditorStore>,
) {
  await waitFor(() => {
    expect(store.getState().editor).not.toBeNull();
  });
  return store.getState().editor!;
}

describe("EditorPane", () => {
  it("should trigger manual save with actor=user reason=manual-save on Ctrl/Cmd+S", async () => {
    const saveCalls: Array<{ actor: string; reason: string }> = [];
    const store = createReadyEditorStore({
      onSave: (payload) => {
        saveCalls.push({ actor: payload.actor, reason: payload.reason });
      },
    });

    render(
      <EditorStoreProvider store={store}>
        <EditorPane projectId="project-1" />
      </EditorStoreProvider>,
    );

    await screen.findByTestId("editor-pane");
    await screen.findByTestId("tiptap-editor");

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => {
      expect(saveCalls).toContainEqual({
        actor: "user",
        reason: "manual-save",
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 700));
    const autosaveCalls = saveCalls.filter(
      (call) => call.reason === "autosave",
    );
    expect(autosaveCalls).toHaveLength(0);
  });

  it("should strip unsupported paste formatting while preserving supported structure", () => {
    const inputHtml = `
      <p><span style="color:red;background:yellow">Hello <strong>world</strong></span></p>
      <div style="font-size:30px">Second line with <em>italic</em></div>
      <object data="evil.bin"></object>
    `;

    const sanitized = sanitizePastedHtml(inputHtml);

    expect(sanitized).toContain("<p>");
    expect(sanitized).toContain("<strong>world</strong>");
    expect(sanitized).toContain("<em>italic</em>");
    expect(sanitized).not.toContain("style=");
    expect(sanitized).not.toContain("<object");
  });

  it("should show Bubble Menu with inline actions when selection is non-empty", async () => {
    const store = createReadyEditorStore({ onSave: () => {} });

    render(
      <EditorStoreProvider store={store}>
        <EditorPane projectId="project-1" />
      </EditorStoreProvider>,
    );

    await screen.findByTestId("editor-pane");
    await screen.findByTestId("tiptap-editor");

    const editor = await waitForEditorInstance(store);

    act(() => {
      editor.commands.focus("start");
      editor.commands.setTextSelection({ from: 1, to: 6 });
    });

    await waitFor(() => {
      expect(screen.getByTestId("editor-bubble-menu")).toBeInTheDocument();
    });

    expect(screen.getByTestId("bubble-bold")).toBeInTheDocument();
    expect(screen.getByTestId("bubble-italic")).toBeInTheDocument();
    expect(screen.getByTestId("bubble-underline")).toBeInTheDocument();
    expect(screen.getByTestId("bubble-strike")).toBeInTheDocument();
    expect(screen.getByTestId("bubble-code")).toBeInTheDocument();
    expect(screen.getByTestId("bubble-link")).toBeInTheDocument();
  });

  it("should apply format through Bubble Menu while preserving selection and syncing toolbar active state", async () => {
    const store = createReadyEditorStore({ onSave: () => {} });

    render(
      <EditorStoreProvider store={store}>
        <EditorPane projectId="project-1" />
      </EditorStoreProvider>,
    );

    await screen.findByTestId("editor-pane");
    await screen.findByTestId("tiptap-editor");

    const editor = await waitForEditorInstance(store);

    act(() => {
      editor.commands.focus("start");
      editor.commands.setTextSelection({ from: 1, to: 6 });
    });

    const bubbleBold = await screen.findByTestId("bubble-bold");
    fireEvent.click(bubbleBold);

    await waitFor(() => {
      expect(editor.isActive("bold")).toBe(true);
      expect(editor.state.selection.empty).toBe(false);
      expect(screen.getByTestId("toolbar-bold")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });
  });

  it("should hide Bubble Menu when selection is collapsed", async () => {
    const store = createReadyEditorStore({ onSave: () => {} });

    render(
      <EditorStoreProvider store={store}>
        <EditorPane projectId="project-1" />
      </EditorStoreProvider>,
    );

    await screen.findByTestId("editor-pane");
    await screen.findByTestId("tiptap-editor");

    const editor = await waitForEditorInstance(store);

    act(() => {
      editor.commands.focus("start");
      editor.commands.setTextSelection({ from: 1, to: 6 });
    });

    await screen.findByTestId("editor-bubble-menu");

    act(() => {
      editor.commands.setTextSelection({ from: 6, to: 6 });
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId("editor-bubble-menu"),
      ).not.toBeInTheDocument();
    });
  });

  it("should suppress Bubble Menu in code block and disable inline toolbar buttons", async () => {
    const store = createReadyEditorStore({ onSave: () => {} });

    render(
      <EditorStoreProvider store={store}>
        <EditorPane projectId="project-1" />
      </EditorStoreProvider>,
    );

    await screen.findByTestId("editor-pane");
    await screen.findByTestId("tiptap-editor");

    const editor = await waitForEditorInstance(store);

    act(() => {
      editor.commands.setContent({
        type: "doc",
        content: [
          {
            type: "codeBlock",
            content: [{ type: "text", text: "const x = 1;" }],
          },
        ],
      });
      editor.commands.focus("start");
      editor.commands.setTextSelection({ from: 2, to: 8 });
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId("editor-bubble-menu"),
      ).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("toolbar-bold")).toBeDisabled();
    expect(screen.getByTestId("toolbar-italic")).toBeDisabled();
    expect(screen.getByTestId("toolbar-underline")).toBeDisabled();
    expect(screen.getByTestId("toolbar-strike")).toBeDisabled();
    expect(screen.getByTestId("toolbar-code")).toBeDisabled();
  });

  it("should place Bubble Menu below selection when top boundary has insufficient space", async () => {
    const store = createReadyEditorStore({ onSave: () => {} });
    const originalGetBoundingClientRect = Range.prototype.getBoundingClientRect;

    Object.defineProperty(Range.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        x: 0,
        y: 4,
        width: 120,
        height: 16,
        top: 4,
        right: 120,
        bottom: 20,
        left: 0,
        toJSON: () => ({}),
      }),
    });

    try {
      render(
        <EditorStoreProvider store={store}>
          <EditorPane projectId="project-1" />
        </EditorStoreProvider>,
      );

      await screen.findByTestId("editor-pane");
      await screen.findByTestId("tiptap-editor");

      const editor = await waitForEditorInstance(store);

      act(() => {
        editor.commands.focus("start");
        editor.commands.setTextSelection({ from: 1, to: 6 });
      });

      await waitFor(() => {
        expect(screen.getByTestId("editor-bubble-menu")).toHaveAttribute(
          "data-bubble-placement",
          "bottom",
        );
      });
    } finally {
      Object.defineProperty(Range.prototype, "getBoundingClientRect", {
        configurable: true,
        value: originalGetBoundingClientRect,
      });
    }
  });
});
