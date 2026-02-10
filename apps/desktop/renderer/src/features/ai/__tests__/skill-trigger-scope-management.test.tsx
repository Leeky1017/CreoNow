import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => {
  const run = vi.fn().mockResolvedValue(undefined);
  const setSelectedSkillId = vi.fn();

  const aiState = {
    status: "idle" as const,
    stream: true,
    selectedSkillId: "builtin:polish",
    skills: [
      {
        id: "builtin:rewrite",
        name: "改写",
        scope: "builtin" as const,
        enabled: true,
        valid: true,
        packageId: "pkg-builtin",
        version: "1.0.0",
      },
    ],
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
    setStream: vi.fn(),
    setSelectedSkillId,
    refreshSkills: vi.fn().mockResolvedValue(undefined),
    setInput: vi.fn(),
    clearError: vi.fn(),
    setError: vi.fn(),
    setSelectionSnapshot: vi.fn(),
    setProposal: vi.fn(),
    setSelectedCandidateId: vi.fn(),
    persistAiApply: vi.fn().mockResolvedValue(undefined),
    logAiApplyConflict: vi.fn().mockResolvedValue(undefined),
    run,
    regenerateWithStrongNegative: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
    onStreamEvent: vi.fn(),
  };

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

  return {
    aiState,
    run,
    setSelectedSkillId,
    invoke,
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
        editor: { getJSON: () => object } | null;
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
      selectionRef: { range: { from: 1, to: 6 }, selectionTextHash: "hash-1" },
      selectionText: "选中文本",
    },
  })),
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

describe("AiPanel skill trigger flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should start execution immediately when selecting a skill from panel", async () => {
    const { AiPanel } = await import("../AiPanel");
    const user = userEvent.setup();

    render(<AiPanel />);

    await user.click(screen.getByTestId("ai-skills-toggle"));
    await user.click(await screen.findByTestId("ai-skill-builtin:rewrite"));

    await waitFor(() => {
      expect(mocks.setSelectedSkillId).toHaveBeenCalledWith("builtin:rewrite");
    });

    await waitFor(() => {
      expect(mocks.run).toHaveBeenCalledTimes(1);
      expect(mocks.run).toHaveBeenCalledWith(
        expect.objectContaining({ inputOverride: "选中文本" }),
      );
    });
  });
});
