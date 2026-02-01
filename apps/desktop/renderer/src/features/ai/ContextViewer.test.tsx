// @ts-nocheck - Mock types are intentionally incomplete for testing
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContextViewer } from "./ContextViewer";

// Mock stores
vi.mock("../../stores/contextStore", () => ({
  useContextStore: vi.fn((selector) => {
    const state = {
      status: "idle" as const,
      assembled: null,
    };
    return selector(state);
  }),
}));

describe("ContextViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染 ContextViewer 组件", () => {
      render(<ContextViewer />);

      const panel = screen.getByTestId("ai-context-panel");
      expect(panel).toBeInTheDocument();
    });

    it("无上下文时应显示空状态提示", () => {
      render(<ContextViewer />);

      expect(screen.getByText("No context yet")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 加载状态测试
  // ===========================================================================
  describe("加载状态", () => {
    it("loading 状态时应显示加载提示", async () => {
      const { useContextStore } = await import("../../stores/contextStore");
      vi.mocked(useContextStore).mockImplementation((selector) => {
        const state = {
          status: "loading" as const,
          assembled: null,
        };
        return selector(state);
      });

      render(<ContextViewer />);

      expect(screen.getByText("Loading context…")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 完整上下文测试
  // ===========================================================================
  describe("完整上下文", () => {
    const mockAssembled = {
      hashes: {
        stablePrefixHash: "abc123",
        promptHash: "def456",
      },
      budget: {
        maxInputTokens: 4096,
        estimate: {
          rulesTokens: 100,
          settingsTokens: 50,
          retrievedTokens: 200,
          immediateTokens: 150,
          totalTokens: 500,
        },
      },
      layers: {
        rules: "System rules content",
        settings: "Settings content",
        retrieved: "Retrieved content",
        immediate: "Immediate content",
      },
      trimEvidence: [],
      redactionEvidence: [],
    };

    it("有上下文时应显示 Context 标题", async () => {
      const { useContextStore } = await import("../../stores/contextStore");
      vi.mocked(useContextStore).mockImplementation((selector) => {
        const state = {
          status: "ready" as const,
          assembled: mockAssembled,
        };
        return selector(state);
      });

      render(<ContextViewer />);

      expect(screen.getByText("Context")).toBeInTheDocument();
    });

    it("应该显示 stablePrefixHash", async () => {
      const { useContextStore } = await import("../../stores/contextStore");
      vi.mocked(useContextStore).mockImplementation((selector) => {
        const state = {
          status: "ready" as const,
          assembled: mockAssembled,
        };
        return selector(state);
      });

      render(<ContextViewer />);

      expect(screen.getByTestId("ai-context-stable-prefix-hash")).toBeInTheDocument();
      expect(screen.getByText("abc123")).toBeInTheDocument();
    });

    it("应该显示 promptHash", async () => {
      const { useContextStore } = await import("../../stores/contextStore");
      vi.mocked(useContextStore).mockImplementation((selector) => {
        const state = {
          status: "ready" as const,
          assembled: mockAssembled,
        };
        return selector(state);
      });

      render(<ContextViewer />);

      expect(screen.getByTestId("ai-context-prompt-hash")).toBeInTheDocument();
      expect(screen.getByText("def456")).toBeInTheDocument();
    });

    it("应该显示所有上下文层级", async () => {
      const { useContextStore } = await import("../../stores/contextStore");
      vi.mocked(useContextStore).mockImplementation((selector) => {
        const state = {
          status: "ready" as const,
          assembled: mockAssembled,
        };
        return selector(state);
      });

      render(<ContextViewer />);

      expect(screen.getByTestId("ai-context-layer-rules")).toBeInTheDocument();
      expect(screen.getByTestId("ai-context-layer-settings")).toBeInTheDocument();
      expect(screen.getByTestId("ai-context-layer-retrieved")).toBeInTheDocument();
      expect(screen.getByTestId("ai-context-layer-immediate")).toBeInTheDocument();
    });

    it("应该显示 TrimEvidence 区域", async () => {
      const { useContextStore } = await import("../../stores/contextStore");
      vi.mocked(useContextStore).mockImplementation((selector) => {
        const state = {
          status: "ready" as const,
          assembled: mockAssembled,
        };
        return selector(state);
      });

      render(<ContextViewer />);

      expect(screen.getByTestId("ai-context-trim")).toBeInTheDocument();
    });

    it("应该显示 RedactionEvidence 区域", async () => {
      const { useContextStore } = await import("../../stores/contextStore");
      vi.mocked(useContextStore).mockImplementation((selector) => {
        const state = {
          status: "ready" as const,
          assembled: mockAssembled,
        };
        return selector(state);
      });

      render(<ContextViewer />);

      expect(screen.getByText(/RedactionEvidence/)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 边界情况测试
  // ===========================================================================
  describe("边界情况", () => {
    it("trimEvidence 有项目时应显示", async () => {
      const { useContextStore } = await import("../../stores/contextStore");
      vi.mocked(useContextStore).mockImplementation((selector) => {
        const state = {
          status: "ready" as const,
          assembled: {
            hashes: { stablePrefixHash: "abc", promptHash: "def" },
            budget: {
              maxInputTokens: 4096,
              estimate: {
                rulesTokens: 100,
                settingsTokens: 50,
                retrievedTokens: 200,
                immediateTokens: 150,
                totalTokens: 500,
              },
            },
            layers: { rules: "", settings: "", retrieved: "", immediate: "" },
            trimEvidence: [
              {
                layer: "rules",
                action: "trimmed" as const,
                reason: "over_budget",
                sourceRef: "rule-1",
                beforeChars: 1000,
                afterChars: 500,
              },
            ],
            redactionEvidence: [],
          },
        };
        return selector(state);
      });

      render(<ContextViewer />);

      expect(screen.getByText(/TrimEvidence \(1\)/)).toBeInTheDocument();
    });

    it("redactionEvidence 有项目时应显示", async () => {
      const { useContextStore } = await import("../../stores/contextStore");
      vi.mocked(useContextStore).mockImplementation((selector) => {
        const state = {
          status: "ready" as const,
          assembled: {
            hashes: { stablePrefixHash: "abc", promptHash: "def" },
            budget: {
              maxInputTokens: 4096,
              estimate: {
                rulesTokens: 100,
                settingsTokens: 50,
                retrievedTokens: 200,
                immediateTokens: 150,
                totalTokens: 500,
              },
            },
            layers: { rules: "", settings: "", retrieved: "", immediate: "" },
            trimEvidence: [],
            redactionEvidence: [
              { patternId: "api-key", matchCount: 2, sourceRef: "config" },
            ],
          },
        };
        return selector(state);
      });

      render(<ContextViewer />);

      expect(screen.getByText(/RedactionEvidence \(1\)/)).toBeInTheDocument();
    });
  });
});
