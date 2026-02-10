import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => {
  const persistAiApply = vi.fn().mockResolvedValue(undefined);
  const logAiApplyConflict = vi.fn().mockResolvedValue(undefined);
  const applySelection = vi.fn();
  const invoke = vi.fn(async (channel: string) => {
    if (channel === "ai:models:list") {
      return {
        ok: true,
        data: {
          source: "proxy",
          items: [{ id: "gpt-5.2", name: "GPT-5.2", provider: "openai" }],
        },
      };
    }
    return { ok: true, data: {} };
  });

  const aiState = {
    status: "idle" as const,
    stream: true,
    selectedSkillId: "builtin:polish",
    skills: [
      {
        id: "builtin:polish",
        name: "Polish",
        description: "Polish text",
        scope: "global" as const,
        enabled: true,
        valid: true,
      },
    ],
    skillsStatus: "ready" as const,
    skillsLastError: null,
    input: "",
    outputText: "AI output replacement",
    activeRunId: null,
    activeChunkSeq: 0,
    lastRunId: "run-1",
    lastError: null,
    selectionRef: {
      range: { from: 1, to: 10 },
      selectionTextHash: "hash-1",
    },
    selectionText: "Original text",
    proposal: {
      runId: "run-1",
      selectionRef: {
        range: { from: 1, to: 10 },
        selectionTextHash: "hash-1",
      },
      selectionText: "Original text",
      replacementText: "AI output replacement",
    },
    applyStatus: "idle" as const,
    setStream: vi.fn(),
    setSelectedSkillId: vi.fn(),
    refreshSkills: vi.fn().mockResolvedValue(undefined),
    setInput: vi.fn(),
    clearError: vi.fn(),
    setError: vi.fn(),
    setSelectionSnapshot: vi.fn(),
    setProposal: vi.fn(),
    persistAiApply,
    logAiApplyConflict,
    run: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
    onStreamEvent: vi.fn(),
  };

  return {
    persistAiApply,
    logAiApplyConflict,
    applySelection,
    invoke,
    aiState,
  };
});

vi.mock("../../../stores/aiStore", () => ({
  useAiStore: vi.fn((selector: (state: typeof mocks.aiState) => unknown) =>
    selector(mocks.aiState),
  ),
}));

vi.mock("../../../stores/editorStore", () => ({
  useEditorStore: vi.fn(
    (
      selector: (state: {
        editor: { getJSON: () => object };
        projectId: string | null;
        documentId: string | null;
      }) => unknown,
    ) =>
      selector({
        editor: {
          getJSON: () => ({ type: "doc", content: [] }),
        },
        projectId: "project-1",
        documentId: "doc-1",
      }),
  ),
}));

vi.mock("../../../stores/projectStore", () => ({
  useProjectStore: vi.fn((selector: (state: { current: null }) => unknown) =>
    selector({ current: null }),
  ),
}));

vi.mock("../applySelection", () => ({
  captureSelectionRef: vi.fn(() => ({
    ok: true,
    data: {
      selectionRef: { range: { from: 1, to: 10 }, selectionTextHash: "hash-1" },
      selectionText: "Original text",
    },
  })),
  applySelection: mocks.applySelection,
}));

vi.mock("../useAiStream", () => ({
  useAiStream: vi.fn(),
}));

vi.mock("../modelCatalogEvents", () => ({
  onAiModelCatalogUpdated: vi.fn(() => () => {}),
}));

vi.mock("../../../components/layout/RightPanel", () => ({
  useOpenSettings: vi.fn(() => vi.fn()),
}));

vi.mock("../../../lib/ipcClient", () => ({
  invoke: mocks.invoke,
}));

describe("apply to editor inline diff flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.applySelection.mockReturnValue({ ok: true, data: { applied: true } });
  });

  it("should require inline diff confirmation before persisting editor content", async () => {
    const { AiPanel } = await import("../AiPanel");
    const user = userEvent.setup();
    render(<AiPanel />);

    const openConfirm = await screen.findByTestId("ai-apply");
    await user.click(openConfirm);

    expect(mocks.persistAiApply).not.toHaveBeenCalled();
    expect(screen.getByTestId("ai-apply-confirm")).toBeInTheDocument();

    await user.click(screen.getByTestId("ai-apply-confirm"));

    await waitFor(() => {
      expect(mocks.applySelection).toHaveBeenCalledTimes(1);
      expect(mocks.persistAiApply).toHaveBeenCalledTimes(1);
    });
  });
});
