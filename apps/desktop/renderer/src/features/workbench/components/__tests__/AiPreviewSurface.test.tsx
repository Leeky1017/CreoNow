import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AiPreviewSurface } from "@/features/workbench/components/AiPreviewSurface";

const reference = {
  from: 1,
  to: 12,
  text: "风从北方来，带着草原上最后一丝温暖。",
  selectionTextHash: "demo-hash",
};

function renderSurface(overrides: Partial<Parameters<typeof AiPreviewSurface>[0]> = {}) {
  return render(
    <AiPreviewSurface
      busy={false}
      canContinue={true}
      canPolish={true}
      canRewrite={true}
      errorMessage={null}
      instruction="润色这段文字"
      model="gpt-4.1-mini"
      onAccept={() => undefined}
      onClearReference={() => undefined}
      onInstructionChange={() => undefined}
      onLaunchSkill={() => undefined}
      onModelChange={() => undefined}
      onReject={() => undefined}
      preview={null}
      reference={reference}
      {...overrides}
    />,
  );
}

    render(
      <AiPreviewSurface
        activeSkill="builtin:polish"
        busy={false}
        errorMessage={null}
        generateDisabled={false}
        instruction="润色这段文字"
        instructionHint="已选 10 个字符"
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
    expect(onLaunchSkill).toHaveBeenCalledTimes(1);
    expect(onLaunchSkill).toHaveBeenCalledWith("rewrite");

    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onLaunchSkill).toHaveBeenCalledTimes(1);
  });

  it("renders empty-selection launcher actions with explicit gated styling", () => {
    renderSurface({ canPolish: false, canRewrite: false, reference: null });

    expect(screen.getByRole("button", { name: "润色" })).toHaveClass("launcher-action--selection-gated");
    expect(screen.getByRole("button", { name: "润色" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "改写" })).toHaveClass("launcher-action--selection-gated");
    expect(screen.getByRole("button", { name: "改写" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "续写" })).toBeEnabled();
  });

  it("does not fire onLaunchSkill when selection-gated buttons are disabled", () => {
    const onLaunchSkill = vi.fn();
    renderSurface({ canPolish: false, canRewrite: false, reference: null, onLaunchSkill });

    fireEvent.click(screen.getByRole("button", { name: "润色" }));
    fireEvent.click(screen.getByRole("button", { name: "改写" }));

    expect(onLaunchSkill).not.toHaveBeenCalled();
  });

  it("shows continue preview as an insertion instead of echoing preceding text as original", () => {
    renderSurface({
      preview: {
        context: { documentId: "doc-demo", projectId: "project-demo", revision: 1 },
        executionId: "exec-demo",
        originalText: "",
        runId: "run-demo",
        selection: null,
        skill: "continue",
        sourceUserEditRevision: 1,
        suggestedText: "她抬头望见远处灯火，忽然意识到这一夜还远未结束。",
      },
      reference: null,
    });

    expect(screen.getByRole("heading", { name: "写回位置" })).toBeInTheDocument();
    expect(screen.getByText("将在当前光标处追加建议内容，不替换已有文字。")).toBeInTheDocument();
    expect(screen.queryByText("风从北方来，带着草原上最后一丝温暖。")).toBeNull();
  });
});
