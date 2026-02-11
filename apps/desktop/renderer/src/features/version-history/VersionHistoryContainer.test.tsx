import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { VersionHistoryContainer } from "./VersionHistoryContainer";
import {
  VersionStoreProvider,
  createVersionStore,
  type UseVersionStore,
} from "../../stores/versionStore";

const invokeMock = vi.hoisted(() => vi.fn());
const startCompareMock = vi.hoisted(() => vi.fn());
const editorState = vi.hoisted(() => ({
  documentId: "doc-1",
  bootstrapForProject: vi.fn(),
}));

vi.mock("../../lib/ipcClient", () => ({
  invoke: invokeMock,
}));

vi.mock("../../stores/editorStore", () => ({
  useEditorStore: vi.fn((selector: (state: typeof editorState) => unknown) =>
    selector(editorState),
  ),
}));

vi.mock("./useVersionCompare", () => ({
  useVersionCompare: () => ({
    startCompare: startCompareMock,
  }),
}));

vi.mock("./VersionHistoryPanel", () => ({
  VersionHistoryPanelContent: (props: {
    onPreview?: (id: string) => void;
    onRestore?: (id: string) => void;
    onCompare?: (id: string) => void;
  }) => (
    <div data-testid="version-history-panel-content-mock">
      <button
        type="button"
        data-testid="version-preview-trigger"
        onClick={() => props.onPreview?.("v-1")}
      >
        Preview
      </button>
      <button
        type="button"
        data-testid="version-restore-trigger"
        onClick={() => props.onRestore?.("v-1")}
      >
        Restore
      </button>
      <button
        type="button"
        data-testid="version-compare-trigger"
        onClick={() => props.onCompare?.("v-1")}
      >
        Compare
      </button>
    </div>
  ),
}));

/**
 * Build a stable IPC mock implementation for version-history container tests.
 */
function installInvokeMock(args?: {
  readVersionError?: { code: string; message: string };
}): void {
  invokeMock.mockImplementation(async (channel: string) => {
    if (channel === "file:document:read") {
      return {
        ok: true,
        data: {
          documentId: "doc-1",
          projectId: "project-1",
          title: "Doc 1",
          contentJson: '{"type":"doc"}',
          contentText: "current",
          contentMd: "current",
          contentHash: "hash-current",
          updatedAt: 100,
        },
      };
    }

    if (channel === "version:snapshot:list") {
      return {
        ok: true,
        data: {
          items: [
            {
              versionId: "v-1",
              actor: "user",
              reason: "manual-save",
              contentHash: "hash-old",
              createdAt: 90,
            },
          ],
        },
      };
    }

    if (channel === "version:snapshot:read") {
      if (args?.readVersionError) {
        return { ok: false, error: args.readVersionError };
      }
      return {
        ok: true,
        data: {
          documentId: "doc-1",
          projectId: "project-1",
          versionId: "v-1",
          actor: "user",
          reason: "manual-save",
          contentJson: '{"type":"doc"}',
          contentText: "historical body",
          contentMd: "historical body",
          contentHash: "hash-old",
          createdAt: 90,
        },
      };
    }

    if (channel === "version:snapshot:rollback") {
      return { ok: true, data: { restored: true } };
    }

    return { ok: false, error: { code: "NOT_FOUND", message: "not found" } };
  });
}

/**
 * Count how many times `version:snapshot:rollback` was invoked in the mocked IPC client.
 */
function getRestoreInvokeCount(): number {
  return invokeMock.mock.calls.filter(
    ([channel]) => channel === "version:snapshot:rollback",
  ).length;
}

/**
 * Render VersionHistoryContainer with a real version store provider.
 */
function renderWithVersionStore(
  ui: JSX.Element,
  versionStore: UseVersionStore,
): ReturnType<typeof render> {
  return render(
    <VersionStoreProvider store={versionStore}>{ui}</VersionStoreProvider>,
  );
}

describe("VersionHistoryContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    editorState.documentId = "doc-1";
    editorState.bootstrapForProject.mockReset();
    installInvokeMock();
  });

  it("loads selected version into preview state when preview is triggered", async () => {
    const user = userEvent.setup();
    const versionStore = createVersionStore({ invoke: invokeMock as never });

    renderWithVersionStore(
      <VersionHistoryContainer projectId="project-1" />,
      versionStore,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("version-history-panel-content-mock"),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("version-preview-trigger"));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("version:snapshot:read", {
        documentId: "doc-1",
        versionId: "v-1",
      });
    });

    expect(versionStore.getState().previewStatus).toBe("ready");
    expect(versionStore.getState().previewVersionId).toBe("v-1");
    expect(versionStore.getState().previewContentJson).not.toBeNull();
  });

  it("shows IPC error code/message when preview read fails", async () => {
    const user = userEvent.setup();
    const versionStore = createVersionStore({ invoke: invokeMock as never });
    installInvokeMock({
      readVersionError: { code: "NOT_FOUND", message: "Version not found" },
    });

    renderWithVersionStore(
      <VersionHistoryContainer projectId="project-1" />,
      versionStore,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("version-history-panel-content-mock"),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("version-preview-trigger"));

    const error = await screen.findByTestId("version-preview-error");
    expect(error).toHaveTextContent("NOT_FOUND: Version not found");
  });

  it("restore requires confirmation and refreshes editor only after confirm", async () => {
    const user = userEvent.setup();
    const versionStore = createVersionStore({ invoke: invokeMock as never });

    renderWithVersionStore(
      <VersionHistoryContainer projectId="project-1" />,
      versionStore,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("version-history-panel-content-mock"),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("version-restore-trigger"));
    expect(getRestoreInvokeCount()).toBe(0);

    const cancel = await screen.findByRole("button", { name: "Cancel" });
    await user.click(cancel);
    expect(getRestoreInvokeCount()).toBe(0);

    await user.click(screen.getByTestId("version-restore-trigger"));
    const confirm = await screen.findByRole("button", {
      name: "Restore version",
    });
    await user.click(confirm);

    await waitFor(() => {
      expect(getRestoreInvokeCount()).toBe(1);
    });
    expect(editorState.bootstrapForProject).toHaveBeenCalledWith("project-1");
  });
});
