import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemorySettingsDialog } from "./MemorySettingsDialog";

// Mock memoryStore
vi.mock("../../stores/memoryStore", () => ({
  useMemoryStore: vi.fn((selector) => {
    const state = {
      settings: {
        injectionEnabled: true,
        preferenceLearningEnabled: true,
        privacyModeEnabled: false,
        preferenceLearningThreshold: 3,
      },
      updateSettings: vi.fn().mockResolvedValue({ ok: true }),
    };
    return selector(state);
  }),
}));

describe("MemorySettingsDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // 渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("打开时应该渲染 Dialog", () => {
      render(<MemorySettingsDialog open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByText("记忆设置")).toBeInTheDocument();
    });

    it("关闭时不应该渲染内容", () => {
      render(<MemorySettingsDialog open={false} onOpenChange={vi.fn()} />);

      expect(screen.queryByText("记忆设置")).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 设置项测试
  // ===========================================================================
  describe("设置项", () => {
    it("应该显示注入开关", () => {
      render(<MemorySettingsDialog open={true} onOpenChange={vi.fn()} />);

      expect(
        screen.getByTestId("memory-settings-injection"),
      ).toBeInTheDocument();
      expect(screen.getByText("启用记忆注入")).toBeInTheDocument();
    });

    it("应该显示学习开关", () => {
      render(<MemorySettingsDialog open={true} onOpenChange={vi.fn()} />);

      expect(
        screen.getByTestId("memory-settings-learning"),
      ).toBeInTheDocument();
      expect(screen.getByText("启用偏好学习")).toBeInTheDocument();
    });

    it("应该显示隐私模式开关", () => {
      render(<MemorySettingsDialog open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByTestId("memory-settings-privacy")).toBeInTheDocument();
      expect(screen.getByText("隐私模式")).toBeInTheDocument();
    });

    it("应该显示学习阈值输入", () => {
      render(<MemorySettingsDialog open={true} onOpenChange={vi.fn()} />);

      expect(
        screen.getByTestId("memory-settings-threshold"),
      ).toBeInTheDocument();
      expect(screen.getByText("学习阈值")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 帮助文本测试
  // ===========================================================================
  describe("帮助文本", () => {
    it("应该显示注入开关的说明", () => {
      render(<MemorySettingsDialog open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByText("AI 在写作时会参考你的记忆")).toBeInTheDocument();
    });

    it("应该显示学习开关的说明", () => {
      render(<MemorySettingsDialog open={true} onOpenChange={vi.fn()} />);

      expect(
        screen.getByText("AI 会从你的反馈中学习写作偏好"),
      ).toBeInTheDocument();
    });

    it("应该显示隐私模式的说明", () => {
      render(<MemorySettingsDialog open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByText("减少存储可识别的内容片段")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 按钮测试
  // ===========================================================================
  describe("按钮", () => {
    it("应该显示完成按钮", () => {
      render(<MemorySettingsDialog open={true} onOpenChange={vi.fn()} />);

      expect(screen.getByText("完成")).toBeInTheDocument();
    });

    it("点击完成按钮应该调用 onOpenChange(false)", async () => {
      const onOpenChange = vi.fn();
      render(<MemorySettingsDialog open={true} onOpenChange={onOpenChange} />);

      const doneButton = screen.getByText("完成");
      doneButton.click();

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
