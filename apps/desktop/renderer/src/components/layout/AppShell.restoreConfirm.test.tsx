import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "./AppShell";

const invokeMock = vi.hoisted(() => vi.fn());
const confirmMock = vi.hoisted(() => vi.fn());
const closeCompareMock = vi.hoisted(() => vi.fn());
const bootstrapProjectsMock = vi.hoisted(() => vi.fn(async () => undefined));
const bootstrapFilesMock = vi.hoisted(() => vi.fn(async () => undefined));
const bootstrapEditorMock = vi.hoisted(() => vi.fn(async () => undefined));

const layoutState = vi.hoisted(() => ({
  sidebarWidth: 300,
  panelWidth: 340,
  sidebarCollapsed: false,
  panelCollapsed: false,
  zenMode: false,
  activeLeftPanel: "files" as const,
  setSidebarWidth: vi.fn(),
  setPanelWidth: vi.fn(),
  setSidebarCollapsed: vi.fn(),
  setPanelCollapsed: vi.fn(),
  setZenMode: vi.fn(),
  resetSidebarWidth: vi.fn(),
  resetPanelWidth: vi.fn(),
}));

const projectState = vi.hoisted(() => ({
  current: {
    projectId: "project-1",
    name: "Project 1",
    rootPath: "/tmp/project-1",
    createdAt: 1,
    updatedAt: 1,
  },
  items: [
    {
      projectId: "project-1",
      name: "Project 1",
      rootPath: "/tmp/project-1",
      createdAt: 1,
      updatedAt: 1,
    },
  ],
  bootstrapStatus: "ready" as const,
  bootstrap: bootstrapProjectsMock,
}));

const fileState = vi.hoisted(() => ({
  bootstrapForProject: bootstrapFilesMock,
  createAndSetCurrent: vi.fn(async () => ({
    ok: true,
    data: { documentId: "doc-1" },
  })),
}));

const editorState = vi.hoisted(() => ({
  bootstrapForProject: bootstrapEditorMock,
  compareMode: true,
  compareVersionId: "v-1",
  documentId: "doc-1",
  editor: null,
  autosaveStatus: "saved" as const,
  documentContentJson: null,
}));

vi.mock("../../lib/ipcClient", () => ({
  invoke: invokeMock,
}));

vi.mock("../../hooks/useConfirmDialog", () => ({
  useConfirmDialog: () => ({
    confirm: confirmMock,
    dialogProps: {
      open: false,
      type: "unsaved_changes",
      onOpenChange: vi.fn(),
      onPrimary: vi.fn(),
      onSecondary: vi.fn(),
      onTertiary: vi.fn(),
      primaryLabel: "Confirm",
      secondaryLabel: "Cancel",
      loading: false,
    },
  }),
}));

vi.mock("../../components/features/AiDialogs/SystemDialog", () => ({
  SystemDialog: () => null,
}));

vi.mock("../../features/version-history/useVersionCompare", () => ({
  useVersionCompare: () => ({
    compareState: { status: "ready", diffText: "@@ diff @@" },
    closeCompare: closeCompareMock,
    startCompare: vi.fn(),
    documentId: "doc-1",
  }),
}));

vi.mock("../../stores/layoutStore", () => ({
  LAYOUT_DEFAULTS: {
    iconBarWidth: 52,
    sidebar: { min: 240, max: 420 },
    panel: { min: 280, max: 520 },
    mainMinWidth: 400,
  },
  useLayoutStore: (selector: (state: typeof layoutState) => unknown) =>
    selector(layoutState),
}));

vi.mock("../../stores/projectStore", () => ({
  useProjectStore: (selector: (state: typeof projectState) => unknown) =>
    selector(projectState),
}));

vi.mock("../../stores/fileStore", () => ({
  useFileStore: (selector: (state: typeof fileState) => unknown) =>
    selector(fileState),
}));

vi.mock("../../stores/editorStore", () => ({
  useEditorStore: (selector: (state: typeof editorState) => unknown) =>
    selector(editorState),
}));

vi.mock("./IconBar", () => ({
  IconBar: () => <div data-testid="icon-bar" />,
}));

vi.mock("./RightPanel", () => ({
  RightPanel: () => <div data-testid="right-panel" />,
}));

vi.mock("./Sidebar", () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}));

vi.mock("./StatusBar", () => ({
  StatusBar: () => <div data-testid="status-bar" />,
}));

vi.mock("./Resizer", () => ({
  Resizer: (props: { testId: string }) => <div data-testid={props.testId} />,
}));

vi.mock("../../features/commandPalette/CommandPalette", () => ({
  CommandPalette: () => null,
}));

vi.mock("../../features/dashboard", () => ({
  DashboardPage: () => <div data-testid="dashboard-page" />,
}));

vi.mock("../../features/diff/DiffViewPanel", () => ({
  DiffViewPanel: (props: { onRestore: () => void }) => (
    <button
      type="button"
      data-testid="compare-restore"
      onClick={props.onRestore}
    >
      Restore compare
    </button>
  ),
}));

vi.mock("../../features/editor/EditorPane", () => ({
  EditorPane: () => <div data-testid="editor-pane" />,
}));

vi.mock("../../features/welcome/WelcomeScreen", () => ({
  WelcomeScreen: () => <div data-testid="welcome-screen" />,
}));

vi.mock("../../features/settings-dialog/SettingsDialog", () => ({
  SettingsDialog: () => null,
}));

vi.mock("../../features/export/ExportDialog", () => ({
  ExportDialog: () => null,
}));

vi.mock("../../features/projects/CreateProjectDialog", () => ({
  CreateProjectDialog: () => null,
}));

vi.mock("../../features/zen-mode/ZenMode", () => ({
  ZenMode: () => null,
}));

function getRestoreInvokeCount(): number {
  return invokeMock.mock.calls.filter(
    ([channel]) => channel === "version:restore",
  ).length;
}

describe("AppShell compare restore confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirmMock.mockResolvedValue(false);
    invokeMock.mockResolvedValue({ ok: true, data: { restored: true } });
  });

  it("does not restore when user cancels confirmation", async () => {
    const user = userEvent.setup();

    render(<AppShell />);

    await user.click(screen.getByTestId("compare-restore"));

    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalledTimes(1);
    });

    expect(getRestoreInvokeCount()).toBe(0);
    expect(closeCompareMock).not.toHaveBeenCalled();
  });

  it("restores and refreshes editor when user confirms", async () => {
    const user = userEvent.setup();
    confirmMock.mockResolvedValue(true);

    render(<AppShell />);

    await user.click(screen.getByTestId("compare-restore"));

    await waitFor(() => {
      expect(getRestoreInvokeCount()).toBe(1);
    });

    expect(invokeMock).toHaveBeenCalledWith("version:restore", {
      documentId: "doc-1",
      versionId: "v-1",
    });
    expect(closeCompareMock).toHaveBeenCalledTimes(1);
    expect(bootstrapEditorMock).toHaveBeenCalledWith("project-1");
  });
});
