import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => {
  const invoke = vi.fn(async (channel: string) => {
    if (channel === "ai:models:list") {
      return {
        ok: true,
        data: {
          source: "proxy",
          items: [{ id: "local-model", name: "Local Model", provider: "proxy" }],
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
    skills: [],
    skillsStatus: "ready" as const,
    skillsLastError: null,
    input: "",
    outputText: "无价格模型输出",
    activeRunId: null,
    activeChunkSeq: 0,
    lastRunId: "run-usage-2",
    lastError: null,
    selectionRef: null,
    selectionText: "",
    proposal: null,
    applyStatus: "idle" as const,
    lastCandidates: [],
    usageStats: {
      promptTokens: 300,
      completionTokens: 120,
      sessionTotalTokens: 420,
    },
    selectedCandidateId: null,
    lastRunRequest: null,
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
        projectId: string | null;
        documentId: string | null;
      }) => unknown,
    ) =>
      selector({
        editor: null,
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
  captureSelectionRef: vi.fn(() => ({ ok: false, error: null })),
  applySelection: vi.fn(),
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

describe("usage stats no price", () => {
  it("should hide cost when model price is not configured", async () => {
    const { AiPanel } = await import("../AiPanel");

    render(<AiPanel />);

    expect(screen.getByTestId("ai-usage-prompt-tokens")).toHaveTextContent("300");
    expect(screen.getByTestId("ai-usage-completion-tokens")).toHaveTextContent(
      "120",
    );
    expect(screen.getByTestId("ai-usage-session-total-tokens")).toHaveTextContent(
      "420",
    );
    expect(screen.queryByTestId("ai-usage-estimated-cost")).not.toBeInTheDocument();
  });
});
