# Proposal: issue-567-s3-entity-completion

## Why

Sprint 3 的 `s3-entity-completion` 需要在编辑器输入流中提供实体候选补全，降低角色/地点命名不一致与上下文漂移风险。当前编辑器仅有 slash command，不支持实体前缀触发候选、键盘确认插入与失败态可见反馈，无法满足 change scenario 的交付边界。

## What Changes

- 在 `EditorPane` 增加实体前缀触发检测（`@query`）与候选查询流程。
- 新增 `EntityCompletionPanel`，支持候选展示、空态/错误态展示、键盘上下导航与回车确认。
- 在 `editorStore` 新增实体补全会话状态与 `knowledge:entity:list` 查询动作，保持状态收敛与测试可注入。
- 新增 S3-EC-S1/S2/S3 场景测试：触发与导航、插入连续性、空态/错误态。
- 保持既有 autosave / toolbar / bubble menu / slash command 行为不变。

## Impact

- Affected specs:
  - `openspec/changes/s3-entity-completion/specs/editor-delta.md`
  - `openspec/changes/s3-entity-completion/tasks.md`
- Affected code:
  - `apps/desktop/renderer/src/features/editor/EditorPane.tsx`
  - `apps/desktop/renderer/src/features/editor/EntityCompletionPanel.tsx`
  - `apps/desktop/renderer/src/features/editor/__tests__/entity-completion.trigger.test.tsx`
  - `apps/desktop/renderer/src/features/editor/__tests__/entity-completion.insert.test.tsx`
  - `apps/desktop/renderer/src/features/editor/__tests__/entity-completion.empty-state.test.tsx`
  - `apps/desktop/renderer/src/stores/editorStore.tsx`
- Breaking change: NO
- User benefit:
  - 输入实体前缀即可获得规范化候选并快速插入，失败路径可见且不打断写作流程。
