// @ts-nocheck - Mock types are intentionally incomplete for testing
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AiPanel } from "./AiPanel";

// Mock stores
vi.mock("../../stores/aiStore", () => ({
  useAiStore: vi.fn((selector) => {
    const state = {
      status: "idle" as const,
      stream: false,
      selectedSkillId: "default",
      skills: [{ id: "default", name: "Default Skill", enabled: true, valid: true, scope: "global" }],
      skillsStatus: "ready" as const,
      skillsLastError: null,
      input: "",
      outputText: "",
      lastRunId: null,
      lastError: null,
      selectionRef: null,
      selectionText: "",
      proposal: null,
      applyStatus: "idle" as const,
      setInput: vi.fn(),
      setStream: vi.fn(),
      setSelectedSkillId: vi.fn(),
      refreshSkills: vi.fn().mockResolvedValue(undefined),
      clearError: vi.fn(),
      setError: vi.fn(),
      setSelectionSnapshot: vi.fn(),
      setProposal: vi.fn(),
      persistAiApply: vi.fn(),
      logAiApplyConflict: vi.fn(),
      run: vi.fn().mockResolvedValue({ ok: true }),
      cancel: vi.fn().mockResolvedValue({ ok: true }),
    };
    return selector(state);
  }),
}));

vi.mock("../../stores/contextStore", () => ({
  useContextStore: vi.fn((selector) => {
    const state = {
      viewerOpen: false,
      toggleViewer: vi.fn(),
      refresh: vi.fn().mockResolvedValue({ promptText: "", hashes: {} }),
    };
    return selector(state);
  }),
}));

vi.mock("../../stores/editorStore", () => ({
  useEditorStore: vi.fn((selector) => {
    const state = {
      editor: null,
      projectId: null,
      documentId: null,
    };
    return selector(state);
  }),
}));

vi.mock("../../stores/projectStore", () => ({
  useProjectStore: vi.fn((selector) => {
    const state = {
      current: null,
    };
    return selector(state);
  }),
}));

vi.mock("./useAiStream", () => ({
  useAiStream: vi.fn(),
}));

describe("AiPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染 AiPanel 组件", () => {
      render(<AiPanel />);

      const panel = screen.getByTestId("ai-panel");
      expect(panel).toBeInTheDocument();
    });

    it("应该显示 AI 标题", () => {
      render(<AiPanel />);

      expect(screen.getByText("AI")).toBeInTheDocument();
    });

    it("应该显示 Run 和 Cancel 按钮", () => {
      render(<AiPanel />);

      expect(screen.getByTestId("ai-run")).toBeInTheDocument();
      expect(screen.getByTestId("ai-cancel")).toBeInTheDocument();
    });

    it("应该显示 Stream 复选框", () => {
      render(<AiPanel />);

      expect(screen.getByTestId("ai-stream-toggle")).toBeInTheDocument();
      expect(screen.getByText("Stream")).toBeInTheDocument();
    });

    it("应该显示输入框", () => {
      render(<AiPanel />);

      expect(screen.getByTestId("ai-input")).toBeInTheDocument();
    });

    it("应该显示输出区域", () => {
      render(<AiPanel />);

      expect(screen.getByTestId("ai-output")).toBeInTheDocument();
    });

    it("应该显示状态", () => {
      render(<AiPanel />);

      expect(screen.getByTestId("ai-status")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 按钮状态测试
  // ===========================================================================
  describe("按钮状态", () => {
    it("idle 状态时 Run 按钮应可用", () => {
      render(<AiPanel />);

      const runButton = screen.getByTestId("ai-run");
      expect(runButton).not.toBeDisabled();
    });

    it("idle 状态时 Cancel 按钮应禁用", () => {
      render(<AiPanel />);

      const cancelButton = screen.getByTestId("ai-cancel");
      expect(cancelButton).toBeDisabled();
    });
  });

  // ===========================================================================
  // 错误状态测试
  // ===========================================================================
  describe("错误状态", () => {
    it("有错误时应显示错误信息", async () => {
      const { useAiStore } = await import("../../stores/aiStore");
      vi.mocked(useAiStore).mockImplementation((selector) => {
        const state = {
          status: "idle" as const,
          stream: false,
          selectedSkillId: "default",
          skills: [],
          skillsStatus: "ready" as const,
          skillsLastError: null,
          input: "",
          outputText: "",
          lastRunId: null,
          lastError: { code: "TIMEOUT", message: "Request timed out" },
          selectionRef: null,
          selectionText: "",
          proposal: null,
          applyStatus: "idle" as const,
          setInput: vi.fn(),
          setStream: vi.fn(),
          setSelectedSkillId: vi.fn(),
          refreshSkills: vi.fn(),
          clearError: vi.fn(),
          setError: vi.fn(),
          setSelectionSnapshot: vi.fn(),
          setProposal: vi.fn(),
          persistAiApply: vi.fn(),
          logAiApplyConflict: vi.fn(),
          run: vi.fn(),
          cancel: vi.fn(),
        };
        return selector(state);
      });

      render(<AiPanel />);

      expect(screen.getByTestId("ai-error-code")).toBeInTheDocument();
      expect(screen.getByText("TIMEOUT")).toBeInTheDocument();
      expect(screen.getByText("Request timed out")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Running 状态测试
  // ===========================================================================
  describe("Running 状态", () => {
    it("running 状态时 Run 按钮应禁用", async () => {
      const { useAiStore } = await import("../../stores/aiStore");
      vi.mocked(useAiStore).mockImplementation((selector) => {
        const state = {
          status: "running" as const,
          stream: false,
          selectedSkillId: "default",
          skills: [],
          skillsStatus: "ready" as const,
          skillsLastError: null,
          input: "",
          outputText: "",
          lastRunId: null,
          lastError: null,
          selectionRef: null,
          selectionText: "",
          proposal: null,
          applyStatus: "idle" as const,
          setInput: vi.fn(),
          setStream: vi.fn(),
          setSelectedSkillId: vi.fn(),
          refreshSkills: vi.fn(),
          clearError: vi.fn(),
          setError: vi.fn(),
          setSelectionSnapshot: vi.fn(),
          setProposal: vi.fn(),
          persistAiApply: vi.fn(),
          logAiApplyConflict: vi.fn(),
          run: vi.fn(),
          cancel: vi.fn(),
        };
        return selector(state);
      });

      render(<AiPanel />);

      const runButton = screen.getByTestId("ai-run");
      expect(runButton).toBeDisabled();
    });

    it("running 状态时 Cancel 按钮应可用", async () => {
      const { useAiStore } = await import("../../stores/aiStore");
      vi.mocked(useAiStore).mockImplementation((selector) => {
        const state = {
          status: "running" as const,
          stream: false,
          selectedSkillId: "default",
          skills: [],
          skillsStatus: "ready" as const,
          skillsLastError: null,
          input: "",
          outputText: "",
          lastRunId: null,
          lastError: null,
          selectionRef: null,
          selectionText: "",
          proposal: null,
          applyStatus: "idle" as const,
          setInput: vi.fn(),
          setStream: vi.fn(),
          setSelectedSkillId: vi.fn(),
          refreshSkills: vi.fn(),
          clearError: vi.fn(),
          setError: vi.fn(),
          setSelectionSnapshot: vi.fn(),
          setProposal: vi.fn(),
          persistAiApply: vi.fn(),
          logAiApplyConflict: vi.fn(),
          run: vi.fn(),
          cancel: vi.fn(),
        };
        return selector(state);
      });

      render(<AiPanel />);

      const cancelButton = screen.getByTestId("ai-cancel");
      expect(cancelButton).not.toBeDisabled();
    });
  });

  // ===========================================================================
  // 样式测试
  // ===========================================================================
  describe("样式", () => {
    it("应该是 section 元素", () => {
      render(<AiPanel />);

      const panel = screen.getByTestId("ai-panel");
      expect(panel.tagName).toBe("SECTION");
    });

    it("应该有 flex column 布局", () => {
      render(<AiPanel />);

      const panel = screen.getByTestId("ai-panel");
      expect(panel).toHaveClass("flex");
      expect(panel).toHaveClass("flex-col");
    });
  });
});
