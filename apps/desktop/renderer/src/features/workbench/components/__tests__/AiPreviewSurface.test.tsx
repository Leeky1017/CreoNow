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
  it("submits rewrite on Enter and keeps Shift+Enter as a newline path", () => {
    const onLaunchSkill = vi.fn();

    render(
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
        onLaunchSkill={onLaunchSkill}
        onModelChange={() => undefined}
        onReject={() => undefined}
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
});
