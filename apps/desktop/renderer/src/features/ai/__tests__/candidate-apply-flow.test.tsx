import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => {
  const persistAiApply = vi.fn().mockResolvedValue(undefined);
  const logAiApplyConflict = vi.fn().mockResolvedValue(undefined);
  const applySelection = vi.fn();
  const setProposal = vi.fn();
  const setSelectedCandidateId = vi.fn((candidateId: string | null) => {
    aiState.selectedCandidateId = candidateId;
  });

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
    if (channel === "judge:quality:evaluate") {
      return { ok: true, data: { accepted: true } };
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
    outputText: "方案A：第一版内容",
    activeRunId: null,
    activeChunkSeq: 0,
    lastRunId: "run-a",
    lastError: null,
    selectionRef: {
      range: { from: 1, to: 10 },
      selectionTextHash: "hash-1",
    },
    selectionText: "原始文本",
    proposal: null as {
      runId: string;
      selectionRef: {
        range: { from: number; to: number };
        selectionTextHash: string;
      };
      selectionText: string;
      replacementText: string;
    } | null,
    applyStatus: "idle" as const,
    lastCandidates: [
      {
        id: "candidate-a",
        runId: "run-a",
        text: "方案A：第一版内容",
        summary: "方案A摘要",
      },
      {
        id: "candidate-b",
        runId: "run-b",
        text: "方案B：目标内容",
        summary: "方案B摘要",
      },
      {
        id: "candidate-c",
        runId: "run-c",
        text: "方案C：备选内容",
        summary: "方案C摘要",
      },
    ],
    usageStats: {
      promptTokens: 120,
      completionTokens: 480,
      sessionTotalTokens: 600,
      estimatedCostUsd: 0.12,
    },
    selectedCandidateId: null as string | null,
    lastRunRequest: null,
    setStream: vi.fn(),
    setSelectedSkillId: vi.fn(),
    refreshSkills: vi.fn().mockResolvedValue(undefined),
    setInput: vi.fn(),
    clearError: vi.fn(),
    setError: vi.fn(),
    setSelectionSnapshot: vi.fn(),
    setProposal,
    setSelectedCandidateId,
    persistAiApply,
    logAiApplyConflict,
    run: vi.fn().mockResolvedValue(undefined),
    regenerateWithStrongNegative: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
    onStreamEvent: vi.fn(),
  };

  return {
    persistAiApply,
    logAiApplyConflict,
    applySelection,
    invoke,
    aiState,
    setProposal,
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
      selectionText: "原始文本",
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

describe("candidate apply flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.applySelection.mockReturnValue({ ok: true, data: { applied: true } });
    mocks.aiState.proposal = null;
  });

  it("should select candidate B and apply it through inline diff confirmation", async () => {
    const { AiPanel } = await import("../AiPanel");
    const user = userEvent.setup();
    const { rerender } = render(<AiPanel />);

    await user.click(await screen.findByTestId("ai-candidate-card-2"));

    await waitFor(() => {
      expect(mocks.aiState.setSelectedCandidateId).toHaveBeenCalledWith(
        "candidate-b",
      );
    });

    mocks.aiState.proposal = {
      runId: "run-b",
      selectionRef: {
        range: { from: 1, to: 10 },
        selectionTextHash: "hash-1",
      },
      selectionText: "原始文本",
      replacementText: "方案B：目标内容",
    };
    rerender(<AiPanel />);

    await user.click(screen.getByTestId("ai-apply"));
    await user.click(screen.getByTestId("ai-apply-confirm"));

    await waitFor(() => {
      expect(mocks.applySelection).toHaveBeenCalledTimes(1);
      expect(mocks.persistAiApply).toHaveBeenCalledWith(
        expect.objectContaining({ runId: "run-b" }),
      );
    });
  });
});
