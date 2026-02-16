import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => {
  const invoke = vi.fn(async (channel: string) => {
    if (channel === "ai:models:list") {
      throw new Error("network boom");
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
    skills: [],
    skillsStatus: "ready" as const,
    skillsLastError: null,
    input: "",
    outputText: "",
    activeRunId: null,
    activeChunkSeq: 0,
    lastRunId: null,
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

  return { invoke, aiState };
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

describe("models loading convergence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("WB-AUD-C1B-S2 should not keep model picker in Loading when refresh throws", async () => {
    const { AiPanel } = await import("../AiPanel");
    render(<AiPanel />);

    await waitFor(() => {
      expect(mocks.invoke).toHaveBeenCalledWith("ai:models:list", {});
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading")).not.toBeInTheDocument();
      expect(screen.getByText("GPT-5.2")).toBeInTheDocument();
    });
  });
});
