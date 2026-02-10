import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { IpcRequest } from "../../../../../../packages/shared/types/ipc-generated";

import {
  EditorStoreProvider,
  createEditorStore,
} from "../../stores/editorStore";
import {
  VersionStoreProvider,
  createVersionStore,
  type IpcInvoke as VersionIpcInvoke,
} from "../../stores/versionStore";
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

function createVersionStoreForEditorPaneTests() {
  const invoke: VersionIpcInvoke = async (_channel, _payload) => {
    return {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "test stub",
      },
    };
  };

  return createVersionStore({
    invoke,
  });
}

describe("EditorPane", () => {
  it("should trigger manual save with actor=user reason=manual-save on Ctrl/Cmd+S", async () => {
    const saveCalls: Array<{ actor: string; reason: string }> = [];
    const store = createReadyEditorStore({
      onSave: (payload) => {
        saveCalls.push({ actor: payload.actor, reason: payload.reason });
      },
    });
    const versionStore = createVersionStoreForEditorPaneTests();

    render(
      <VersionStoreProvider store={versionStore}>
        <EditorStoreProvider store={store}>
          <EditorPane projectId="project-1" />
        </EditorStoreProvider>
      </VersionStoreProvider>,
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

  it("should render preview banner and disable editor toolbar when preview mode is active", async () => {
    const store = createReadyEditorStore({
      onSave: () => undefined,
    });
    const versionStore = createVersionStoreForEditorPaneTests();

    versionStore.setState({
      previewStatus: "ready",
      previewVersionId: "v-1",
      previewTimestamp: "2 小时前",
      previewContentJson: JSON.stringify({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "历史版本内容" }] }],
      }),
      previewError: null,
    });

    render(
      <VersionStoreProvider store={versionStore}>
        <EditorStoreProvider store={store}>
          <EditorPane projectId="project-1" />
        </EditorStoreProvider>
      </VersionStoreProvider>,
    );

    expect(await screen.findByTestId("editor-preview-banner")).toHaveTextContent(
      "正在预览 2 小时前 的版本",
    );

    const editor = await screen.findByTestId("tiptap-editor");
    await waitFor(() => {
      expect(editor).toHaveAttribute("contenteditable", "false");
    });

    expect(screen.getByTestId("toolbar-bold")).toBeDisabled();
    expect(screen.getByTestId("toolbar-undo")).toBeDisabled();
  });

  it("should return to current version when clicking return button in preview banner", async () => {
    const store = createReadyEditorStore({
      onSave: () => undefined,
    });
    const versionStore = createVersionStoreForEditorPaneTests();

    versionStore.setState({
      previewStatus: "ready",
      previewVersionId: "v-2",
      previewTimestamp: "Yesterday",
      previewContentJson: JSON.stringify({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "历史版本" }] }],
      }),
      previewError: null,
    });

    render(
      <VersionStoreProvider store={versionStore}>
        <EditorStoreProvider store={store}>
          <EditorPane projectId="project-1" />
        </EditorStoreProvider>
      </VersionStoreProvider>,
    );

    const returnButton = await screen.findByRole("button", {
      name: "返回当前版本",
    });
    fireEvent.click(returnButton);

    expect(versionStore.getState().previewStatus).toBe("idle");
    expect(versionStore.getState().previewVersionId).toBeNull();
  });
});
