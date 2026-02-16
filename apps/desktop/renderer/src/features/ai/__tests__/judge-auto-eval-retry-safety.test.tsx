import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => {
  let judgeAttempt = 0;

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
      judgeAttempt += 1;
      if (judgeAttempt === 1) {
        return {
          ok: false,
          error: { code: "INTERNAL", message: "judge unavailable" },
        };
      }
      return { ok: true, data: { accepted: true } };
    }
    return { ok: true, data: {} };
  });

  const aiState = {
    status: "idle" as "idle" | "running",
    stream: true,
    selectedSkillId: "builtin:polish",
    skills: [],
    skillsStatus: "ready" as const,
    skillsLastError: null,
    input: "",
    outputText: "judge candidate output",
    activeRunId: null,
    activeChunkSeq: 0,
    lastRunId: "run-locked-1",
    lastError: null,
    selectionRef: null,
    selectionText: "",
    proposal: null,
    applyStatus: "idle" as const,
    lastCandidates: [],
    usageStats: null,
    selectedCandidateId: null,
    lastRunRequest: null,
    queuePosition: null,
    queuedCount: 0,
    globalRunningCount: 0,
    setStream: vi.fn(),
    setSelectedSkillId: vi.fn(),
    refreshSkills: vi.fn().mockResolvedValue(undefined),
    setInput: vi.fn(),
    clearError: vi.fn(),
    setError: vi.fn(),
    setSelectionSnapshot: vi.fn(),
    setProposal: vi.fn(),
    setSelectedCandidateId: vi.fn(),
    persistAiApply: vi.fn().mockResolvedValue(undefined),
    logAiApplyConflict: vi.fn().mockResolvedValue(undefined),
    run: vi.fn().mockResolvedValue(undefined),
    regenerateWithStrongNegative: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
    onStreamEvent: vi.fn(),
  };

  function reset(): void {
    judgeAttempt = 0;
    invoke.mockClear();
    aiState.status = "idle";
    aiState.outputText = "judge candidate output";
    aiState.lastRunId = "run-locked-1";
  }

  return { invoke, aiState, reset };
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
        editor: null;
        projectId: string;
        documentId: string;
        bootstrapStatus: "ready";
        compareMode: boolean;
        setCompareMode: (enabled: boolean, versionId?: string | null) => void;
      }) => unknown,
    ) =>
      selector({
        editor: null,
        projectId: "project-1",
        documentId: "doc-1",
        bootstrapStatus: "ready",
        compareMode: false,
        setCompareMode: vi.fn(),
      }),
  ),
}));

vi.mock("../../../stores/projectStore", () => ({
  useProjectStore: vi.fn(
    (selector: (state: { current: { projectId: string } | null }) => unknown) =>
      selector({ current: { projectId: "project-1" } }),
  ),
}));

vi.mock("../applySelection", () => ({
  captureSelectionRef: vi.fn(() => ({ ok: false })),
  applySelection: vi.fn(),
}));

vi.mock("../useAiStream", () => ({
  useAiStream: vi.fn(),
}));

vi.mock("../modelCatalogEvents", () => ({
  onAiModelCatalogUpdated: vi.fn(() => () => {}),
}));

vi.mock("../../../contexts/OpenSettingsContext", () => ({
  useOpenSettings: vi.fn(() => vi.fn()),
}));

vi.mock("../../../lib/ipcClient", () => ({
  invoke: mocks.invoke,
}));

describe("judge auto-eval retry safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reset();
  });

  it("AISVC-AUD-H4-S2 retries same runId after first auto-eval failure", async () => {
    const { AiPanel } = await import("../AiPanel");
    const { rerender } = render(<AiPanel />);

    await waitFor(() => {
      const calls = mocks.invoke.mock.calls.filter(
        ([channel]) => channel === "judge:quality:evaluate",
      );
      expect(calls).toHaveLength(1);
    });

    mocks.aiState.status = "running";
    rerender(<AiPanel />);
    mocks.aiState.status = "idle";
    rerender(<AiPanel />);

    await waitFor(() => {
      const calls = mocks.invoke.mock.calls.filter(
        ([channel]) => channel === "judge:quality:evaluate",
      );
      expect(calls).toHaveLength(2);
    });
  });
});
