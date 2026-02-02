import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryPanel } from "./MemoryPanel";

// Mock stores
vi.mock("../../stores/memoryStore", () => ({
  useMemoryStore: vi.fn((selector) => {
    const state = {
      projectId: null,
      documentId: null,
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
      bootstrapForContext: vi.fn().mockResolvedValue(undefined),
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

vi.mock("../../stores/fileStore", () => ({
  useFileStore: vi.fn((selector) => {
    const state = {
      currentDocumentId: null,
    };
    return selector(state);
  }),
}));

// Mock dialogs
vi.mock("./MemorySettingsDialog", () => ({
  MemorySettingsDialog: vi.fn(() => null),
}));

vi.mock("./MemoryCreateDialog", () => ({
  MemoryCreateDialog: vi.fn(() => null),
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

    it("应该显示设置按钮（齿轮图标）", () => {
      render(<MemoryPanel />);

      expect(screen.getByTestId("memory-settings-button")).toBeInTheDocument();
    });

    it("应该显示记忆列表区域", () => {
      render(<MemoryPanel />);

      expect(screen.getByText(/条.*记忆/)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Create 测试
  // ===========================================================================
  describe("Create", () => {
    it("应该显示添加新记忆按钮", () => {
      render(<MemoryPanel />);

      expect(screen.getByTestId("memory-create-button")).toBeInTheDocument();
      expect(screen.getByText("添加新记忆")).toBeInTheDocument();
    });

    it("不应该显示内联表单（已移至对话框）", () => {
      render(<MemoryPanel />);

      expect(screen.queryByTestId("memory-create-type")).not.toBeInTheDocument();
      expect(screen.queryByTestId("memory-create-content")).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 空状态测试
  // ===========================================================================
  describe("空状态", () => {
    it("无记忆时应显示空状态提示", () => {
      render(<MemoryPanel />);

      expect(screen.getByText("还没有全局记忆")).toBeInTheDocument();
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
          documentId: null,
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
          bootstrapForContext: vi.fn(),
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

    it("每个记忆应显示删除按钮", async () => {
      const { useMemoryStore } = await import("../../stores/memoryStore");
      vi.mocked(useMemoryStore).mockImplementation((selector) => {
        const state = {
          projectId: null,
          documentId: null,
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
          bootstrapForContext: vi.fn(),
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

    it("应该显示记忆来源（手动/AI学习）", async () => {
      const { useMemoryStore } = await import("../../stores/memoryStore");
      vi.mocked(useMemoryStore).mockImplementation((selector) => {
        const state = {
          projectId: null,
          documentId: null,
          bootstrapStatus: "ready" as const,
          items: [
            {
              memoryId: "mem-1",
              type: "preference" as const,
              scope: "global" as const,
              origin: "manual" as const,
              content: "手动添加的记忆",
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            {
              memoryId: "mem-2",
              type: "preference" as const,
              scope: "global" as const,
              origin: "learned" as const,
              content: "AI学习的记忆",
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
          settings: null,
          preview: null,
          lastError: null,
          bootstrapForContext: vi.fn(),
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

      expect(screen.getByText("手动")).toBeInTheDocument();
      expect(screen.getByText("AI学习")).toBeInTheDocument();
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
          documentId: null,
          bootstrapStatus: "ready" as const,
          items: [],
          settings: null,
          preview: null,
          lastError: { code: "IO_ERROR" as const, message: "Failed to save memory" },
          bootstrapForContext: vi.fn(),
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
  // Scope Tabs 测试
  // ===========================================================================
  describe("Scope Tabs", () => {
    it("应该渲染三个 scope tab 按钮", () => {
      render(<MemoryPanel />);

      expect(screen.getByTestId("memory-scope-global")).toBeInTheDocument();
      expect(screen.getByTestId("memory-scope-project")).toBeInTheDocument();
      expect(screen.getByTestId("memory-scope-document")).toBeInTheDocument();
    });

    it("Global tab 默认激活", () => {
      render(<MemoryPanel />);

      const globalTab = screen.getByTestId("memory-scope-global");
      expect(globalTab.className).toContain("border-[var(--color-border-focus)]");
    });

    it("无项目时 Project/Document tabs 应该禁用", () => {
      render(<MemoryPanel />);

      const projectTab = screen.getByTestId("memory-scope-project");
      const documentTab = screen.getByTestId("memory-scope-document");
      expect(projectTab).toBeDisabled();
      expect(documentTab).toBeDisabled();
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

    it("应该有 h-full 使其填满容器", () => {
      render(<MemoryPanel />);

      const panel = screen.getByTestId("memory-panel");
      expect(panel).toHaveClass("h-full");
    });
  });
});
