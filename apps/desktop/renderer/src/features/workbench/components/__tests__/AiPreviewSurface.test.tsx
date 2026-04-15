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
  it("shows streaming progress stages while busy without a preview", () => {
    render(
      <AiPreviewSurface
        activeSkill="builtin:polish"
        busy={true}
        errorMessage={null}
        generateDisabled={true}
        instruction=""
        instructionHint="已选 10 个字符"
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

    expect(screen.getByText("Neural Stream")).toBeInTheDocument();
    expect(screen.getByText("正在分析上下文并生成建议……")).toBeInTheDocument();
    expect(screen.getByText("提取选区与上下文")).toBeInTheDocument();
    expect(screen.getByText("规划改写策略")).toBeInTheDocument();
    expect(screen.getByText("生成可写回预览")).toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });

  it("renders ready stream state and preview metadata", () => {
    render(
      <AiPreviewSurface
        activeSkill="builtin:rewrite"
        busy={false}
        errorMessage={null}
        generateDisabled={false}
        instruction="改成更冷峻的语气"
        instructionHint="请输入改写指令"
        model="gpt-4.1-mini"
        onAccept={() => undefined}
        onClearReference={() => undefined}
        onGenerate={() => undefined}
        onInstructionChange={() => undefined}
        onModelChange={() => undefined}
        onReject={() => undefined}
        onSkillChange={() => undefined}
        preview={{
          changeType: "replace",
          context: { documentId: "doc-1", projectId: "project-1", revision: 0 },
          executionId: "exec-1",
          originalText: "原文片段",
          runId: "run-12345678",
          selection: { from: 1, to: 5, text: "原文", selectionTextHash: "hash" },
          sourceUserEditRevision: 0,
          suggestedText: "建议片段",
        }}
        reference={reference}
      />,
    );

    expect(screen.getByText("结果已同步，可审阅并写回")).toBeInTheDocument();
    expect(screen.getByText("预览模式：替换选区")).toBeInTheDocument();
    expect(screen.getByText("批次 #run-1234")).toBeInTheDocument();
  });

  it("shows error stream state and alert message", () => {
    render(
      <AiPreviewSurface
        activeSkill="builtin:polish"
        busy={false}
        errorMessage="请求失败，请重试。"
        generateDisabled={false}
        instruction=""
        instructionHint="已选 10 个字符"
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

    expect(screen.getByText("生成中断，请调整指令后重试")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("请求失败，请重试。");
  });

  it("renders continue previews as insertion instead of replacement", () => {
    render(
      <AiPreviewSurface
        activeSkill="builtin:continue"
        busy={false}
        errorMessage={null}
        generateDisabled={false}
        instruction=""
        instructionHint="将基于光标前 7 个字符续写。"
        model="gpt-4.1-mini"
        onAccept={() => undefined}
        onClearReference={() => undefined}
        onGenerate={() => undefined}
        onInstructionChange={() => undefined}
        onModelChange={() => undefined}
        onReject={() => undefined}
        onSkillChange={() => undefined}
        preview={{
          changeType: "insert",
          context: { documentId: "doc-1", projectId: "project-1", revision: 0 },
          executionId: "exec-1",
          originalText: "",
          runId: "run-1",
          selection: { from: 7, to: 7, text: "", selectionTextHash: "hash" },
          sourceUserEditRevision: 0,
          suggestedText: "新的段落在这里继续展开。",
        }}
        reference={null}
      />,
    );

    expect(screen.getByText("写回方式")).toBeInTheDocument();
    expect(screen.getByText("将在当前光标处插入，不会替换任何原文。")).toBeInTheDocument();
    expect(screen.getByText("将插入的内容")).toBeInTheDocument();
  });

  it("submits on Enter and keeps Shift+Enter as a newline path", () => {
    const onGenerate = vi.fn();

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
    expect(onGenerate).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });
});
