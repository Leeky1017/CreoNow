import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SkillPicker } from "./SkillPicker";

const mockSkills = [
  { id: "default", name: "Default", enabled: true, valid: true, scope: "global" as const, packageId: "pkg-1", version: "1.0.0" },
  { id: "rewrite", name: "Rewrite", enabled: true, valid: true, scope: "project" as const, packageId: "pkg-2", version: "1.0.0" },
  { id: "disabled", name: "Disabled Skill", enabled: false, valid: true, scope: "global" as const, packageId: "pkg-3", version: "1.0.0" },
  { id: "invalid", name: "Invalid Skill", enabled: true, valid: false, scope: "global" as const, packageId: "pkg-4", version: "1.0.0" },
];

describe("SkillPicker", () => {
  // ===========================================================================
  // 基础渲染测试
  // ===========================================================================
  describe("渲染", () => {
    it("open 为 true 时应该渲染", () => {
      render(
        <SkillPicker
          open={true}
          items={mockSkills}
          selectedSkillId="default"
          onOpenChange={vi.fn()}
          onSelectSkillId={vi.fn()}
        />
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Skills")).toBeInTheDocument();
    });

    it("open 为 false 时不应该渲染", () => {
      render(
        <SkillPicker
          open={false}
          items={mockSkills}
          selectedSkillId="default"
          onOpenChange={vi.fn()}
          onSelectSkillId={vi.fn()}
        />
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("应该渲染所有技能项", () => {
      render(
        <SkillPicker
          open={true}
          items={mockSkills}
          selectedSkillId="default"
          onOpenChange={vi.fn()}
          onSelectSkillId={vi.fn()}
        />
      );

      expect(screen.getByTestId("ai-skill-default")).toBeInTheDocument();
      expect(screen.getByTestId("ai-skill-rewrite")).toBeInTheDocument();
      expect(screen.getByTestId("ai-skill-disabled")).toBeInTheDocument();
      expect(screen.getByTestId("ai-skill-invalid")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 选中状态测试
  // ===========================================================================
  describe("选中状态", () => {
    it("选中的技能应有不同的样式", () => {
      render(
        <SkillPicker
          open={true}
          items={mockSkills}
          selectedSkillId="default"
          onOpenChange={vi.fn()}
          onSelectSkillId={vi.fn()}
        />
      );

      const selectedButton = screen.getByTestId("ai-skill-default");
      expect(selectedButton.className).toContain("border-[var(--color-border-accent)]");
    });
  });

  // ===========================================================================
  // 禁用状态测试
  // ===========================================================================
  describe("禁用状态", () => {
    it("disabled 技能应禁用按钮", () => {
      render(
        <SkillPicker
          open={true}
          items={mockSkills}
          selectedSkillId="default"
          onOpenChange={vi.fn()}
          onSelectSkillId={vi.fn()}
        />
      );

      const disabledButton = screen.getByTestId("ai-skill-disabled");
      expect(disabledButton).toBeDisabled();
    });

    it("invalid 技能应禁用按钮", () => {
      render(
        <SkillPicker
          open={true}
          items={mockSkills}
          selectedSkillId="default"
          onOpenChange={vi.fn()}
          onSelectSkillId={vi.fn()}
        />
      );

      const invalidButton = screen.getByTestId("ai-skill-invalid");
      expect(invalidButton).toBeDisabled();
    });

    it("disabled 技能应显示 Disabled 状态", () => {
      render(
        <SkillPicker
          open={true}
          items={mockSkills}
          selectedSkillId="default"
          onOpenChange={vi.fn()}
          onSelectSkillId={vi.fn()}
        />
      );

      expect(screen.getByText("Disabled")).toBeInTheDocument();
    });

    it("invalid 技能应显示 Invalid 状态", () => {
      render(
        <SkillPicker
          open={true}
          items={mockSkills}
          selectedSkillId="default"
          onOpenChange={vi.fn()}
          onSelectSkillId={vi.fn()}
        />
      );

      expect(screen.getByText("Invalid")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 交互测试
  // ===========================================================================
  describe("交互", () => {
    it("点击技能应调用 onSelectSkillId", () => {
      const onSelectSkillId = vi.fn();
      render(
        <SkillPicker
          open={true}
          items={mockSkills}
          selectedSkillId="default"
          onOpenChange={vi.fn()}
          onSelectSkillId={onSelectSkillId}
        />
      );

      const rewriteButton = screen.getByTestId("ai-skill-rewrite");
      fireEvent.click(rewriteButton);

      expect(onSelectSkillId).toHaveBeenCalledWith("rewrite");
    });

    it("点击背景应调用 onOpenChange(false)", () => {
      const onOpenChange = vi.fn();
      render(
        <SkillPicker
          open={true}
          items={mockSkills}
          selectedSkillId="default"
          onOpenChange={onOpenChange}
          onSelectSkillId={vi.fn()}
        />
      );

      const backdrop = screen.getByRole("presentation");
      fireEvent.click(backdrop);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("点击弹窗内部不应关闭", () => {
      const onOpenChange = vi.fn();
      render(
        <SkillPicker
          open={true}
          items={mockSkills}
          selectedSkillId="default"
          onOpenChange={onOpenChange}
          onSelectSkillId={vi.fn()}
        />
      );

      const dialog = screen.getByRole("dialog");
      fireEvent.click(dialog);

      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 空列表测试
  // ===========================================================================
  describe("空列表", () => {
    it("空列表时仍应显示 Skills 标题", () => {
      render(
        <SkillPicker
          open={true}
          items={[]}
          selectedSkillId=""
          onOpenChange={vi.fn()}
          onSelectSkillId={vi.fn()}
        />
      );

      expect(screen.getByText("Skills")).toBeInTheDocument();
    });
  });
});
