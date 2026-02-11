import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AppShell } from "./AppShell";

const invokeMock = vi.hoisted(() => vi.fn());
const applySelectionMock = vi.hoisted(() => vi.fn());
const closeCompareMock = vi.hoisted(() => vi.fn());
const lastDiffPanelProps = vi.hoisted(() => ({
  current: null as null | Record<string, unknown>,
}));

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
  setActiveLeftPanel: vi.fn(),
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
  bootstrap: vi.fn(async () => undefined),
}));

const fileState = vi.hoisted(() => ({
  bootstrapForProject: vi.fn(async () => undefined),
  createAndSetCurrent: vi.fn(async () => ({
    ok: true,
    data: { documentId: "doc-1" },
  })),
  setCurrent: vi.fn(async () => ({ ok: true, data: { documentId: "doc-1" } })),
}));

const setCompareModeMock = vi.hoisted(() => vi.fn());
const openDocumentMock = vi.hoisted(() => vi.fn(async () => undefined));

const editorState = vi.hoisted(() => ({
  bootstrapForProject: vi.fn(async () => undefined),
  compareMode: true,
  compareVersionId: null as string | null,
  documentId: "doc-1",
  editor: {
    getJSON: vi.fn(() => ({ type: "doc", content: [] })),
  },
  autosaveStatus: "saved" as const,
  documentContentJson: null,
  openDocument: openDocumentMock,
  setCompareMode: setCompareModeMock,
}));

const setProposalMock = vi.hoisted(() => vi.fn());
const setSelectionSnapshotMock = vi.hoisted(() => vi.fn());
const persistAiApplyMock = vi.hoisted(() => vi.fn(async () => undefined));
const setErrorMock = vi.hoisted(() => vi.fn());
const logAiApplyConflictMock = vi.hoisted(() => vi.fn(async () => undefined));

const aiState = vi.hoisted(() => ({
  proposal: {
    runId: "run-1",
    selectionRef: {
      range: { from: 1, to: 120 },
      selectionTextHash: "hash-1",
    },
    selectionText: [
      "intro",
      "keep-1",
      "old-a",
      "keep-2",
      "keep-3",
      "keep-4",
      "keep-5",
      "keep-6",
      "keep-7",
      "keep-8",
      "old-b",
      "keep-9",
      "keep-10",
      "keep-11",
      "keep-12",
      "keep-13",
      "keep-14",
      "keep-15",
      "keep-16",
      "old-c",
      "outro",
    ].join("\n"),
    replacementText: [
      "intro",
      "keep-1",
      "new-a",
      "keep-2",
      "keep-3",
      "keep-4",
      "keep-5",
      "keep-6",
      "keep-7",
      "keep-8",
      "new-b",
      "keep-9",
      "keep-10",
      "keep-11",
      "keep-12",
      "keep-13",
      "keep-14",
      "keep-15",
      "keep-16",
      "new-c",
      "outro",
    ].join("\n"),
  },
  setProposal: setProposalMock,
  setSelectionSnapshot: setSelectionSnapshotMock,
  persistAiApply: persistAiApplyMock,
  setError: setErrorMock,
  logAiApplyConflict: logAiApplyConflictMock,
}));

vi.mock("../../lib/ipcClient", () => ({
  invoke: invokeMock,
}));

vi.mock("../../features/ai/applySelection", () => ({
  captureSelectionRef: vi.fn(),
  applySelection: applySelectionMock,
}));

vi.mock("../../hooks/useConfirmDialog", () => ({
  useConfirmDialog: () => ({
    confirm: vi.fn(async () => true),
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
    compareState: { status: "ready", diffText: "version-diff-text" },
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

vi.mock("../../stores/aiStore", () => ({
  useAiStore: (selector: (state: typeof aiState) => unknown) =>
    selector(aiState),
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
  DiffViewPanel: (props: {
    diffText: string;
    onClose?: () => void;
    onRestore?: () => void;
    onRejectAll?: () => void;
    onAcceptAll?: () => void;
    onAcceptHunk?: (index: number) => void;
    onRejectHunk?: (index: number) => void;
    hunkDecisions?: Array<"pending" | "accepted" | "rejected">;
  }) => {
    lastDiffPanelProps.current = props as unknown as Record<string, unknown>;
    return (
      <div data-testid="ai-compare-panel">
        <pre data-testid="ai-compare-diff">{props.diffText}</pre>
        <button
          type="button"
          data-testid="ai-compare-close"
          onClick={() => props.onClose?.()}
        >
          close
        </button>
        {props.onRejectAll ? (
          <button
            type="button"
            data-testid="ai-reject-all"
            onClick={() => props.onRejectAll?.()}
          >
            reject-all
          </button>
        ) : null}
        {props.onAcceptAll ? (
          <button
            type="button"
            data-testid="ai-accept-all"
            onClick={() => props.onAcceptAll?.()}
          >
            accept-all
          </button>
        ) : null}
        {props.hunkDecisions?.map((_, idx) => (
          <div key={idx}>
            <button
              type="button"
              data-testid={`ai-accept-hunk-${idx}`}
              onClick={() => props.onAcceptHunk?.(idx)}
            >
              accept-hunk-{idx}
            </button>
            <button
              type="button"
              data-testid={`ai-reject-hunk-${idx}`}
              onClick={() => props.onRejectHunk?.(idx)}
            >
              reject-hunk-{idx}
            </button>
          </div>
        ))}
      </div>
    );
  },
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

describe("AppShell AI inline diff collaboration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    editorState.compareMode = true;
    editorState.compareVersionId = null;
    applySelectionMock.mockReturnValue({ ok: true, data: { applied: true } });
    invokeMock.mockResolvedValue({ ok: true, data: { restored: true } });
    aiState.proposal = {
      ...aiState.proposal,
    };
  });

  it("should render AI proposal as diff text when compareMode is active", () => {
    render(<AppShell />);

    expect(screen.getByTestId("ai-compare-panel")).toBeInTheDocument();
    expect(screen.getByTestId("ai-compare-diff").textContent).toContain(
      "old-a",
    );
    expect(screen.getByTestId("ai-compare-diff").textContent).toContain(
      "new-a",
    );
  });

  it("should reject suggestion and exit compare mode", async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await user.click(screen.getByTestId("ai-reject-all"));

    expect(setProposalMock).toHaveBeenCalledWith(null);
    expect(setCompareModeMock).toHaveBeenCalledWith(false);
  });

  it("should accept all changes and persist apply result", async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await user.click(screen.getByTestId("ai-accept-all"));

    await waitFor(() => {
      expect(applySelectionMock).toHaveBeenCalledTimes(1);
      expect(persistAiApplyMock).toHaveBeenCalledTimes(1);
    });

    const payload = applySelectionMock.mock.calls[0]?.[0] as
      | { replacementText?: string }
      | undefined;
    expect(payload?.replacementText).toContain("new-a");
    expect(payload?.replacementText).toContain("new-b");
    expect(payload?.replacementText).toContain("new-c");
    expect(setCompareModeMock).toHaveBeenCalledWith(false);
  });

  it("should apply only accepted hunks when user chooses per-hunk decisions", async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await waitFor(() => {
      expect(screen.getByTestId("ai-accept-hunk-0")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("ai-accept-hunk-0"));
    await user.click(screen.getByTestId("ai-reject-hunk-1"));
    await user.click(screen.getByTestId("ai-accept-hunk-2"));
    await user.click(screen.getByTestId("ai-accept-all"));

    await waitFor(() => {
      expect(applySelectionMock).toHaveBeenCalledTimes(1);
    });

    const payload = applySelectionMock.mock.calls[0]?.[0] as
      | { replacementText?: string }
      | undefined;
    const mergedText = payload?.replacementText ?? "";

    expect(mergedText).toContain("new-a");
    expect(mergedText).toContain("old-b");
    expect(mergedText).toContain("new-c");
    expect(mergedText).not.toContain("new-b");
  });
});
