import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AiPreviewSurface } from "@/features/workbench/components/AiPreviewSurface";

const reference = {
  from: 1,
  to: 12,
  text: "风从北方来，带着草原上最后一丝温暖。",
  selectionTextHash: "demo-hash",
};

describe("AiPreviewSurface", () => {
  it("submits on Enter and keeps Shift+Enter as a newline path", () => {
    const onGenerate = vi.fn();

    render(
      <AiPreviewSurface
        activeSkill="rewrite"
        busy={false}
        errorMessage={null}
        instruction="润色这段文字"
        model="gpt-4.1-mini"
        onAccept={() => undefined}
        onClearReference={() => undefined}
        onGenerate={onGenerate}
        onInstructionChange={() => undefined}
        onModelChange={() => undefined}
        onReject={() => undefined}
        onSkillChange={() => undefined}
        preview={null}
        reference={reference}
      />,
    );

    const textarea = screen.getByLabelText("指令");
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onGenerate).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it("renders three skill buttons: 润色 / 改写 / 续写", () => {
    render(
      <AiPreviewSurface
        activeSkill="rewrite"
        busy={false}
        errorMessage={null}
        instruction=""
        model="gpt-4.1-mini"
        onAccept={() => undefined}
        onClearReference={() => undefined}
        onGenerate={() => undefined}
        onInstructionChange={() => undefined}
        onModelChange={() => undefined}
        onReject={() => undefined}
        onSkillChange={() => undefined}
        preview={null}
        reference={null}
      />,
    );

    expect(screen.getByRole("button", { name: "润色" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "改写" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "续写" })).toBeInTheDocument();
  });

  it("highlights the active skill button with aria-pressed", () => {
    render(
      <AiPreviewSurface
        activeSkill="polish"
        busy={false}
        errorMessage={null}
        instruction=""
        model="gpt-4.1-mini"
        onAccept={() => undefined}
        onClearReference={() => undefined}
        onGenerate={() => undefined}
        onInstructionChange={() => undefined}
        onModelChange={() => undefined}
        onReject={() => undefined}
        onSkillChange={() => undefined}
        preview={null}
        reference={reference}
      />,
    );

    expect(screen.getByRole("button", { name: "润色" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "改写" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "续写" })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onSkillChange when skill button clicked", () => {
    const onSkillChange = vi.fn();

    render(
      <AiPreviewSurface
        activeSkill="rewrite"
        busy={false}
        errorMessage={null}
        instruction=""
        model="gpt-4.1-mini"
        onAccept={() => undefined}
        onClearReference={() => undefined}
        onGenerate={() => undefined}
        onInstructionChange={() => undefined}
        onModelChange={() => undefined}
        onReject={() => undefined}
        onSkillChange={onSkillChange}
        preview={null}
        reference={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "续写" }));
    expect(onSkillChange).toHaveBeenCalledWith("continue");

    fireEvent.click(screen.getByRole("button", { name: "润色" }));
    expect(onSkillChange).toHaveBeenCalledWith("polish");
  });

  it("enables generate for continue skill even without reference", () => {
    render(
      <AiPreviewSurface
        activeSkill="continue"
        busy={false}
        errorMessage={null}
        instruction=""
        model="gpt-4.1-mini"
        onAccept={() => undefined}
        onClearReference={() => undefined}
        onGenerate={() => undefined}
        onInstructionChange={() => undefined}
        onModelChange={() => undefined}
        onReject={() => undefined}
        onSkillChange={() => undefined}
        preview={null}
        reference={null}
      />,
    );

    // 续写模式：无选区时生成按钮仍可用
    expect(screen.getByRole("button", { name: "生成建议" })).not.toBeDisabled();
  });

  it("disables generate for polish and rewrite when no reference", () => {
    const { rerender } = render(
      <AiPreviewSurface
        activeSkill="polish"
        busy={false}
        errorMessage={null}
        instruction=""
        model="gpt-4.1-mini"
        onAccept={() => undefined}
        onClearReference={() => undefined}
        onGenerate={() => undefined}
        onInstructionChange={() => undefined}
        onModelChange={() => undefined}
        onReject={() => undefined}
        onSkillChange={() => undefined}
        preview={null}
        reference={null}
      />,
    );

    expect(screen.getByRole("button", { name: "生成建议" })).toBeDisabled();

    rerender(
      <AiPreviewSurface
        activeSkill="rewrite"
        busy={false}
        errorMessage={null}
        instruction="改写指令"
        model="gpt-4.1-mini"
        onAccept={() => undefined}
        onClearReference={() => undefined}
        onGenerate={() => undefined}
        onInstructionChange={() => undefined}
        onModelChange={() => undefined}
        onReject={() => undefined}
        onSkillChange={() => undefined}
        preview={null}
        reference={null}
      />,
    );

    expect(screen.getByRole("button", { name: "生成建议" })).toBeDisabled();
  });

  it("shows instruction textarea only for rewrite skill", () => {
    const { rerender } = render(
      <AiPreviewSurface
        activeSkill="rewrite"
        busy={false}
        errorMessage={null}
        instruction=""
        model="gpt-4.1-mini"
        onAccept={() => undefined}
        onClearReference={() => undefined}
        onGenerate={() => undefined}
        onInstructionChange={() => undefined}
        onModelChange={() => undefined}
        onReject={() => undefined}
        onSkillChange={() => undefined}
        preview={null}
        reference={reference}
      />,
    );

    expect(screen.getByLabelText("指令")).toBeInTheDocument();

    rerender(
      <AiPreviewSurface
        activeSkill="polish"
        busy={false}
        errorMessage={null}
        instruction=""
        model="gpt-4.1-mini"
        onAccept={() => undefined}
        onClearReference={() => undefined}
        onGenerate={() => undefined}
        onInstructionChange={() => undefined}
        onModelChange={() => undefined}
        onReject={() => undefined}
        onSkillChange={() => undefined}
        preview={null}
        reference={reference}
      />,
    );
    expect(screen.queryByLabelText("指令")).toBeNull();

    rerender(
      <AiPreviewSurface
        activeSkill="continue"
        busy={false}
        errorMessage={null}
        instruction=""
        model="gpt-4.1-mini"
        onAccept={() => undefined}
        onClearReference={() => undefined}
        onGenerate={() => undefined}
        onInstructionChange={() => undefined}
        onModelChange={() => undefined}
        onReject={() => undefined}
        onSkillChange={() => undefined}
        preview={null}
        reference={null}
      />,
    );
    expect(screen.queryByLabelText("指令")).toBeNull();
  });

  it("disables generate for rewrite when instruction is empty, even with reference", () => {
    const { rerender } = render(
      <AiPreviewSurface
        activeSkill="rewrite"
        busy={false}
        errorMessage={null}
        instruction=""
        model="gpt-4.1-mini"
        onAccept={() => undefined}
        onClearReference={() => undefined}
        onGenerate={() => undefined}
        onInstructionChange={() => undefined}
        onModelChange={() => undefined}
        onReject={() => undefined}
        onSkillChange={() => undefined}
        preview={null}
        reference={reference}
      />,
    );

    expect(screen.getByRole("button", { name: "生成建议" })).toBeDisabled();

    rerender(
      <AiPreviewSurface
        activeSkill="rewrite"
        busy={false}
        errorMessage={null}
        instruction="   "
        model="gpt-4.1-mini"
        onAccept={() => undefined}
        onClearReference={() => undefined}
        onGenerate={() => undefined}
        onInstructionChange={() => undefined}
        onModelChange={() => undefined}
        onReject={() => undefined}
        onSkillChange={() => undefined}
        preview={null}
        reference={reference}
      />,
    );

    // 纯空白也不允许生成
    expect(screen.getByRole("button", { name: "生成建议" })).toBeDisabled();

    rerender(
      <AiPreviewSurface
        activeSkill="rewrite"
        busy={false}
        errorMessage={null}
        instruction="改写指令"
        model="gpt-4.1-mini"
        onAccept={() => undefined}
        onClearReference={() => undefined}
        onGenerate={() => undefined}
        onInstructionChange={() => undefined}
        onModelChange={() => undefined}
        onReject={() => undefined}
        onSkillChange={() => undefined}
        preview={null}
        reference={reference}
      />,
    );

    // 有指令后生成按钮可用
    expect(screen.getByRole("button", { name: "生成建议" })).not.toBeDisabled();
  });
});