# Proposal: issue-367-ai-service-p2-panel-chat-apply-flow

## Why

`openspec/changes/ai-service-p2-panel-chat-apply-flow` 已定义 AI 面板聊天与应用链路的 P2 契约，但当前代码仍缺少 `ai:chat:list|clear`、项目隔离存储，以及“应用到编辑器需经 Inline Diff 再确认”的闭环。若不交付该 change，下游 `ai-service-p3/p4` 会在面板状态、消息隔离和编辑器应用语义上发生漂移。

## What Changes

- 落地 `ai:chat:list|send|clear` 三个 IPC 通道，按 `projectId` 隔离消息域。
- 为 AI 面板建立最小聊天记录链路（主进程存储 + 列表/清空能力）。
- 将「应用到编辑器」改为两步：先展示 Inline Diff，再由用户确认后才执行写入与持久化。
- 补充 `AiPanel` Storybook 四态（默认/空态/生成中/错误）及对应测试。

## Impact

- Affected specs:
  - `openspec/changes/ai-service-p2-panel-chat-apply-flow/specs/ai-service-delta.md`
  - `openspec/changes/ai-service-p2-panel-chat-apply-flow/tasks.md`
- Affected code:
  - `apps/desktop/main/src/ipc/ai.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/renderer/src/features/ai/AiPanel.tsx`
  - `apps/desktop/renderer/src/features/ai/AiPanel.stories.tsx`
  - `apps/desktop/main/src/ipc/__tests__/ai-chat-project-isolation.test.ts`
  - `apps/desktop/renderer/src/features/ai/__tests__/apply-to-editor-inline-diff.test.tsx`
  - `apps/desktop/renderer/src/features/ai/AiPanel.stories.test.ts`
- Breaking change: NO
- User benefit: AI 面板聊天数据不跨项目泄露，编辑器应用链路可回退且可确认，四态可独立验证。
