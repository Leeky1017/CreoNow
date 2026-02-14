import React from "react";
import type { Editor, JSONContent } from "@tiptap/react";
import { render, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { IpcRequest } from "@shared/types/ipc-generated";

import {
  EditorStoreProvider,
  createEditorStore,
} from "../../stores/editorStore";
import { useAutosave } from "./useAutosave";

/**
 * Minimal fake editor that supports the update subscription API used by useAutosave.
 */
class FakeEditor {
  private listeners = new Set<() => void>();
  private json: JSONContent;

  constructor(initial: JSONContent) {
    this.json = initial;
  }

  on(event: string, callback: () => void): void {
    if (event === "update") {
      this.listeners.add(callback);
    }
  }

  off(event: string, callback: () => void): void {
    if (event === "update") {
      this.listeners.delete(callback);
    }
  }

  getJSON(): JSONContent {
    return this.json;
  }

  setJSON(next: JSONContent): void {
    this.json = next;
  }

  emitUpdate(): void {
    for (const callback of this.listeners) {
      callback();
    }
  }
}

function AutosaveHarness(props: {
  enabled: boolean;
  projectId: string;
  documentId: string;
  editor: FakeEditor;
  suppressRef: React.MutableRefObject<boolean>;
  store: ReturnType<typeof createEditorStore>;
}): JSX.Element {
  return (
    <EditorStoreProvider store={props.store}>
      <InnerAutosaveHarness
        enabled={props.enabled}
        projectId={props.projectId}
        documentId={props.documentId}
        editor={props.editor}
        suppressRef={props.suppressRef}
      />
    </EditorStoreProvider>
  );
}

function InnerAutosaveHarness(props: {
  enabled: boolean;
  projectId: string;
  documentId: string;
  editor: FakeEditor;
  suppressRef: React.MutableRefObject<boolean>;
}): JSX.Element {
  useAutosave({
    enabled: props.enabled,
    projectId: props.projectId,
    documentId: props.documentId,
    editor: props.editor as unknown as Editor,
    suppressRef: props.suppressRef,
  });
  return <div data-testid="autosave-harness" />;
}

describe("useAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should trigger debounced autosave on content update", async () => {
    const saveCalls: Array<{
      actor: string;
      reason: string;
      contentJson: string;
    }> = [];
    const store = createEditorStore({
      invoke: async (channel, payload) => {
        if (channel !== "file:document:save") {
          throw new Error(`Unexpected channel: ${channel}`);
        }
        const savePayload = payload as IpcRequest<"file:document:save">;
        saveCalls.push({
          actor: savePayload.actor,
          reason: savePayload.reason,
          contentJson: savePayload.contentJson,
        });
        return {
          ok: true,
          data: {
            contentHash: "hash-autosave",
            updatedAt: 10,
          },
        };
      },
    });
    store.setState({
      projectId: "project-1",
      documentId: "doc-1",
    });

    const editor = new FakeEditor({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "v1" }] }],
    });
    const suppressRef = { current: false };

    render(
      <AutosaveHarness
        enabled
        projectId="project-1"
        documentId="doc-1"
        editor={editor}
        suppressRef={suppressRef}
        store={store}
      />,
    );

    act(() => {
      editor.emitUpdate();
    });
    expect(store.getState().autosaveStatus).toBe("saving");

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(saveCalls).toHaveLength(0);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(saveCalls).toHaveLength(1);
    expect(saveCalls[0]).toMatchObject({
      actor: "auto",
      reason: "autosave",
    });
    expect(store.getState().autosaveStatus).toBe("saved");
  });

  it("should suppress autosave during document load and resume afterwards", async () => {
    const saveCalls: Array<{ reason: string }> = [];
    const store = createEditorStore({
      invoke: async (channel, payload) => {
        if (channel !== "file:document:save") {
          throw new Error(`Unexpected channel: ${channel}`);
        }
        const savePayload = payload as IpcRequest<"file:document:save">;
        saveCalls.push({ reason: savePayload.reason });
        return {
          ok: true,
          data: {
            contentHash: "hash-suppress",
            updatedAt: 11,
          },
        };
      },
    });

    const editor = new FakeEditor({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "load" }] },
      ],
    });
    const suppressRef = { current: true };

    render(
      <AutosaveHarness
        enabled
        projectId="project-1"
        documentId="doc-1"
        editor={editor}
        suppressRef={suppressRef}
        store={store}
      />,
    );

    act(() => {
      editor.emitUpdate();
      vi.advanceTimersByTime(600);
    });
    expect(saveCalls).toHaveLength(0);

    suppressRef.current = false;
    editor.setJSON({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "edited" }] },
      ],
    });
    act(() => {
      editor.emitUpdate();
    });

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    expect(saveCalls).toHaveLength(1);
  });

  it("should flush queued autosave immediately on unmount", async () => {
    let saveCount = 0;
    const store = createEditorStore({
      invoke: async (channel, _payload) => {
        if (channel !== "file:document:save") {
          throw new Error(`Unexpected channel: ${channel}`);
        }
        saveCount += 1;
        return {
          ok: true,
          data: {
            contentHash: "hash-flush",
            updatedAt: 12,
          },
        };
      },
    });

    const editor = new FakeEditor({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "queued" }] },
      ],
    });
    const suppressRef = { current: false };

    const rendered = render(
      <AutosaveHarness
        enabled
        projectId="project-1"
        documentId="doc-1"
        editor={editor}
        suppressRef={suppressRef}
        store={store}
      />,
    );

    act(() => {
      editor.emitUpdate();
    });

    rendered.unmount();

    await act(async () => {
      await Promise.resolve();
    });

    expect(saveCount).toBe(1);
  });
});
