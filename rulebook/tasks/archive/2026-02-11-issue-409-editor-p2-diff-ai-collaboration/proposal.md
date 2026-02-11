# Proposal: issue-409-editor-p2-diff-ai-collaboration

## Why

`openspec/changes/editor-p2-diff-ai-collaboration` 定义了编辑器与 AI 协作的关键链路，但当前实现仍缺少输入区 reference card 生命周期、AI diff 的 compareMode 状态机与逐块接受/拒绝能力，导致规范与产品行为不一致，并阻塞下游 `version-control-p2` 的 Diff 复用前提。

## What Changes

- 在 `AiPanel` 补齐 selection reference card：
  - 选区捕获与 sticky 展示（截断预览 + 关闭按钮）。
  - 四种清除条件：手动关闭 / 发送请求 / 新建对话 / 新选区替换。
  - 发送请求时带入选区上下文并清空 card。
- 在 `DiffViewPanel`/`AppShell` 补齐 AI 协作 diff 体验：
  - `compareMode` 驱动进入/退出 diff 审阅。
  - `Accept All / Reject All` 与 per-hunk 接受/拒绝。
  - Previous/Next 导航当前 hunk，高亮当前 hunk。
- 复核并补强 `MultiVersionCompare` 与 `DiffViewPanel` 的场景测试，覆盖 2–4 版本对比与空 diff 状态。
- 完成 RUN_LOG、preflight、PR auto-merge、change 与 Rulebook 归档、main 收口。

## Impact

- Affected specs:
  - `openspec/changes/editor-p2-diff-ai-collaboration/specs/editor-delta.md`
  - `openspec/changes/editor-p2-diff-ai-collaboration/tasks.md`
- Affected code:
  - `apps/desktop/renderer/src/features/ai/AiPanel.tsx`
  - `apps/desktop/renderer/src/features/ai/applySelection.ts`
  - `apps/desktop/renderer/src/features/diff/*`
  - `apps/desktop/renderer/src/components/layout/AppShell.tsx`
  - `apps/desktop/renderer/src/stores/editorStore.tsx`
  - 对应 renderer 测试文件
- Breaking change: NO
- User benefit: 用户可稳定完成“选中引用→AI修改→逐块确认→应用入文档”的闭环，降低误改风险并提升协作效率。
