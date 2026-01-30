# P0-007: AI diff + apply（选区替换）+ actor=ai 版本

Status: pending

## Goal

实现 AI 工作流的关键差异化链路：AI 输出 → diff 展示 → 用户确认 → Apply 到当前文档选区 → 自动落版本（actor=ai）。必须包含冲突检测与可观测失败语义（不得 silent apply）。

## Dependencies

- Spec: `../spec.md#cnwb-req-030`
- Spec: `../spec.md#cnwb-req-050`
- Design: `../design/02-document-model-ssot.md`（冲突检测/失败语义）
- Design: `../design/09-ai-runtime-and-network.md`（Apply 语义）
- P0-005: `./P0-005-editor-ssot-autosave-versioning.md`
- P0-006: `./P0-006-ai-runtime-fake-provider-stream-cancel-timeout.md`

## Expected File Changes

| 操作   | 文件路径                                                                                      |
| ------ | --------------------------------------------------------------------------------------------- |
| Add    | `apps/desktop/renderer/src/features/ai/DiffView.tsx`（`data-testid="ai-diff"`）               |
| Add    | `apps/desktop/renderer/src/lib/diff/unifiedDiff.ts`（生成 unified diff：old/new）             |
| Add    | `apps/desktop/renderer/src/features/ai/applySelection.ts`（冲突检测 + TipTap transaction）    |
| Update | `apps/desktop/renderer/src/features/ai/AiPanel.tsx`（展示 diff + Apply/Reject）               |
| Update | `apps/desktop/renderer/src/stores/aiStore.ts`（保存 selectionRef：range + selectionTextHash） |
| Update | `apps/desktop/main/src/ipc/version.ts`（新增 `actor=ai` 版本写入能力，如缺）                  |
| Add    | `apps/desktop/tests/e2e/ai-apply.spec.ts`                                                     |

## Acceptance Criteria

- [ ] diff 展示：
  - [ ] 当 AI 输出产生“替换选区文本”提案时，UI 显示 diff（`ai-diff` 可见）
  - [ ] diff 内容 deterministic（同输入同 diff）
- [ ] Apply（成功路径）：
  - [ ] 点击 Apply 后，当前选区被替换为新文本
  - [ ] Apply 成功后必须创建版本：`actor=ai`、`reason=ai-apply:<runId>`
  - [ ] UI 显示“已应用/已保存”状态（可测）
- [ ] 冲突检测（失败路径）：
  - [ ] 若选区文本已变化（hash 不匹配），Apply 必须失败并返回 `CONFLICT`
  - [ ] 失败时不得修改文档 SSOT，不得落 `actor=ai` 版本
- [ ] Reject：
  - [ ] 点击 Reject 清空 diff，不修改文档

## Tests

- [ ] E2E（Windows）`ai-apply.spec.ts`
  - [ ] success：fake AI 输出 replacement text → diff 可见 → Apply → editor 内容变化 → 版本新增（actor=ai）
  - [ ] conflict：生成 diff 后手动修改选区 → Apply → 断言显示 conflict 错误（`CONFLICT`）且内容未被覆盖

## Edge cases & Failure modes

- 选区为空（from=to）→ 必须返回 `INVALID_ARGUMENT` 或 UI 禁用 Apply（语义写死）
- 文档未加载（无 documentId）→ `INVALID_ARGUMENT`
- Apply 过程中异常 → `INTERNAL`，不得半成功

## Observability

- `main.log` 记录：`ai_apply_started/ai_apply_succeeded/ai_apply_conflict`（含 runId/documentId）
- E2E 必须断言至少一条 apply 相关日志证据
