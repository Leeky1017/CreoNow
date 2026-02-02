import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryPanel } from "./MemoryPanel";

// Mock stores
vi.mock("../../stores/memoryStore", () => ({
  useMemoryStore: vi.fn((selector) => {
    const state = {
      projectId: null,
      bootstrapStatus: "ready" as const,
      items: [],
      settings: {
        injectionEnabled: true,
        preferenceLearningEnabled: true,
        privacyModeEnabled: false,
        preferenceLearningThreshold: 3,
      },
      preview: null,
      lastError: null,
      bootstrapForProject: vi.fn().mockResolvedValue(undefined),
      refresh: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue({ ok: true }),
      remove: vi.fn().mockResolvedValue({ ok: true }),
      updateSettings: vi.fn().mockResolvedValue({ ok: true }),
      previewInjection: vi.fn().mockResolvedValue({ ok: true }),
      clearPreview: vi.fn(),
      clearError: vi.fn(),
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

describe("MemoryPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("应该渲染 MemoryPanel 组件", () => {
      render(<MemoryPanel />);

      const panel = screen.getByTestId("memory-panel");
      expect(panel).toBeInTheDocument();
    });

    it("应该显示 Memory 标题", () => {
      render(<MemoryPanel />);

      expect(screen.getByText("Memory")).toBeInTheDocument();
    });

    it("应该显示 Settings 区域", () => {
      render(<MemoryPanel />);

      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("应该显示 Create 区域", () => {
      render(<MemoryPanel />);

      expect(screen.getByText("Create")).toBeInTheDocument();
    });

    it("应该显示 Items 区域", () => {
      render(<MemoryPanel />);

      expect(screen.getByText(/Items/)).toBeInTheDocument();
    });

    it("应该显示 Injection preview 区域", () => {
      render(<MemoryPanel />);

      expect(screen.getByText("Injection preview")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Settings 测试
  // ===========================================================================
  describe("Settings", () => {
    it("应该显示 Injection enabled 复选框", () => {
      render(<MemoryPanel />);

      expect(screen.getByTestId("memory-settings-injection")).toBeInTheDocument();
      expect(screen.getByText("Injection enabled")).toBeInTheDocument();
    });

    it("应该显示 Preference learning enabled 复选框", () => {
      render(<MemoryPanel />);

      expect(screen.getByTestId("memory-settings-learning")).toBeInTheDocument();
      expect(screen.getByText("Preference learning enabled")).toBeInTheDocument();
    });

    it("应该显示 Privacy mode 复选框", () => {
      render(<MemoryPanel />);

      expect(screen.getByTestId("memory-settings-privacy")).toBeInTheDocument();
      expect(screen.getByText("Privacy mode")).toBeInTheDocument();
    });

    it("应该显示 Threshold 输入", () => {
      render(<MemoryPanel />);

      expect(screen.getByTestId("memory-settings-threshold")).toBeInTheDocument();
      expect(screen.getByText("Threshold")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Create 测试
  // ===========================================================================
  describe("Create", () => {
    it("应该显示类型选择器", () => {
      render(<MemoryPanel />);

      expect(screen.getByTestId("memory-create-type")).toBeInTheDocument();
    });

    it("应该显示范围选择器", () => {
      render(<MemoryPanel />);

      expect(screen.getByTestId("memory-create-scope")).toBeInTheDocument();
    });

    it("应该显示内容输入框", () => {
      render(<MemoryPanel />);

      expect(screen.getByTestId("memory-create-content")).toBeInTheDocument();
    });

    it("应该显示 Add 按钮", () => {
      render(<MemoryPanel />);

      expect(screen.getByTestId("memory-create-submit")).toBeInTheDocument();
      expect(screen.getByText("Add")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 空状态测试
  // ===========================================================================
  describe("空状态", () => {
    it("无记忆时应显示空状态提示", () => {
      render(<MemoryPanel />);

      expect(screen.getByText("No memories yet.")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 记忆列表测试
  // ===========================================================================
  describe("记忆列表", () => {
    it("有记忆时应显示记忆项", async () => {
      const { useMemoryStore } = await import("../../stores/memoryStore");
      vi.mocked(useMemoryStore).mockImplementation((selector) => {
        const state = {
          projectId: null,
          bootstrapStatus: "ready" as const,
          items: [
            {
              memoryId: "mem-1",
              type: "preference" as const,
              scope: "global" as const,
              origin: "manual" as const,
              content: "Test memory content",
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
          settings: {
            injectionEnabled: true,
            preferenceLearningEnabled: true,
            privacyModeEnabled: false,
            preferenceLearningThreshold: 3,
          },
          preview: null,
          lastError: null,
          bootstrapForProject: vi.fn(),
          refresh: vi.fn(),
          create: vi.fn(),
          remove: vi.fn(),
          updateSettings: vi.fn(),
          previewInjection: vi.fn(),
          clearPreview: vi.fn(),
          clearError: vi.fn(),
        };
        return selector(state);
      });

      render(<MemoryPanel />);

      expect(screen.getByTestId("memory-item-mem-1")).toBeInTheDocument();
      expect(screen.getByText("Test memory content")).toBeInTheDocument();
    });

    it("每个记忆应显示 Delete 按钮", async () => {
      const { useMemoryStore } = await import("../../stores/memoryStore");
      vi.mocked(useMemoryStore).mockImplementation((selector) => {
        const state = {
          projectId: null,
          bootstrapStatus: "ready" as const,
          items: [
            {
              memoryId: "mem-1",
              type: "preference" as const,
              scope: "global" as const,
              origin: "manual" as const,
              content: "Test memory",
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
          settings: {
            injectionEnabled: true,
            preferenceLearningEnabled: true,
            privacyModeEnabled: false,
            preferenceLearningThreshold: 3,
          },
          preview: null,
          lastError: null,
          bootstrapForProject: vi.fn(),
          refresh: vi.fn(),
          create: vi.fn(),
          remove: vi.fn(),
          updateSettings: vi.fn(),
          previewInjection: vi.fn(),
          clearPreview: vi.fn(),
          clearError: vi.fn(),
        };
        return selector(state);
      });

      render(<MemoryPanel />);

      expect(screen.getByTestId("memory-delete-mem-1")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 错误状态测试
  // ===========================================================================
  describe("错误状态", () => {
    it("有错误时应显示错误信息", async () => {
      const { useMemoryStore } = await import("../../stores/memoryStore");
      vi.mocked(useMemoryStore).mockImplementation((selector) => {
        const state = {
          projectId: null,
          bootstrapStatus: "ready" as const,
          items: [],
          settings: null,
          preview: null,
          lastError: { code: "IO_ERROR" as const, message: "Failed to save memory" },
          bootstrapForProject: vi.fn(),
          refresh: vi.fn(),
          create: vi.fn(),
          remove: vi.fn(),
          updateSettings: vi.fn(),
          previewInjection: vi.fn(),
          clearPreview: vi.fn(),
          clearError: vi.fn(),
        };
        return selector(state);
      });

      render(<MemoryPanel />);

      expect(screen.getByTestId("memory-error-code")).toBeInTheDocument();
      expect(screen.getByText("IO_ERROR")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Preview 测试
  // ===========================================================================
  describe("Preview", () => {
    it("应该显示 Preview 按钮", () => {
      render(<MemoryPanel />);

      expect(screen.getByTestId("memory-preview-run")).toBeInTheDocument();
    });

    it("应该显示 Clear 按钮", () => {
      render(<MemoryPanel />);

      expect(screen.getByTestId("memory-preview-clear")).toBeInTheDocument();
    });

    it("应该显示查询输入框", () => {
      render(<MemoryPanel />);

      expect(screen.getByTestId("memory-preview-query")).toBeInTheDocument();
    });

    it("有预览结果时应显示", async () => {
      const { useMemoryStore } = await import("../../stores/memoryStore");
      vi.mocked(useMemoryStore).mockImplementation((selector) => {
        const state = {
          projectId: null,
          bootstrapStatus: "ready" as const,
          items: [],
          settings: {
            injectionEnabled: true,
            preferenceLearningEnabled: true,
            privacyModeEnabled: false,
            preferenceLearningThreshold: 3,
          },
          preview: { mode: "deterministic" as const, items: [] },
          lastError: null,
          bootstrapForProject: vi.fn(),
          refresh: vi.fn(),
          create: vi.fn(),
          remove: vi.fn(),
          updateSettings: vi.fn(),
          previewInjection: vi.fn(),
          clearPreview: vi.fn(),
          clearError: vi.fn(),
        };
        return selector(state);
      });

      render(<MemoryPanel />);

      expect(screen.getByTestId("memory-preview-result")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 样式测试
  // ===========================================================================
  describe("样式", () => {
    it("应该是 section 元素", () => {
      render(<MemoryPanel />);

      const panel = screen.getByTestId("memory-panel");
      expect(panel.tagName).toBe("SECTION");
    });

    it("应该有 flex column 布局", () => {
      render(<MemoryPanel />);

      const panel = screen.getByTestId("memory-panel");
      expect(panel).toHaveClass("flex");
      expect(panel).toHaveClass("flex-col");
    });
  });
});
