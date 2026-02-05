# P0-012: AiDialogs / SystemDialog（确认与错误 UI 统一）

Status: todo

## Goal

把 `Features/AiDialogs` 从 Storybook-only 组装进真实 App Surface，并用它统一：

- destructive 操作的确认弹窗（替换 `window.confirm`）
- AI 相关错误态的呈现（替换散落的 error box）
-（可选但推荐）AI apply / compare 的 diff 弹窗（收敛 diff UI，避免多套并存）

## Dependencies

- Spec: `../spec.md#cnfa-req-003`
- Design: `../design/02-navigation-and-surface-registry.md`（双栈消解：Confirm/Export/Settings）
- P0-001: `./P0-001-surface-registry-and-zero-orphans-gate.md`

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Update | `apps/desktop/renderer/src/features/files/FileTreePanel.tsx`（删除确认改用 SystemDialog） |
| Update | `apps/desktop/renderer/src/features/kg/KnowledgeGraphPanel.tsx`（删除确认改用 SystemDialog） |
| Update | `apps/desktop/renderer/src/features/dashboard/DashboardPage.tsx`（Delete project 确认用 SystemDialog） |
| Update | `apps/desktop/renderer/src/components/layout/AppShell.tsx`（Version restore 确认用 SystemDialog） |
| Update | `apps/desktop/renderer/src/features/ai/AiPanel.tsx`（错误 UI 使用 AiErrorCard；可选：proposal diff 使用 AiDiffModal） |
| Add | `apps/desktop/tests/e2e/system-dialog.spec.ts`（新增门禁：确认弹窗可用） |

## Acceptance Criteria

- [ ] 确认弹窗统一（MUST）：
  - [ ] `window.confirm` 在 renderer 中不再出现（至少不用于 user-facing destructive 操作）
  - [ ] 删除文档/删除 KG 实体/删除项目/版本恢复等全部使用 `SystemDialog`
  - [ ] 弹窗焦点管理正确（打开聚焦，关闭回到触发点；ESC 关闭）
- [ ] 错误 UI 统一（MUST for AI surface）：
  - [ ] AI 相关错误用 `AiErrorCard` 呈现（并显示错误码/信息）
  - [ ] 禁止仅 console.log 或无提示
- [ ] diff UI 收敛（SHOULD）：
  - [ ] 若引入 `AiDiffModal` 到真实流程，必须明确取代/收敛现有 diff 展示方式，避免三套 diff UI 并存

## Tests

- [ ] E2E `system-dialog.spec.ts`：
  - [ ] 触发删除文档 → 弹 SystemDialog → Cancel 不删除
  - [ ] 再触发删除文档 → Confirm 删除 → 列表移除
  - [ ] 触发删除 KG entity → 同样断言

## Edge cases & Failure modes

- 多个确认弹窗同时触发：
  - 必须写死策略（队列/覆盖/拒绝），不得出现焦点丢失或无法关闭
- 异步删除失败：
  - 弹窗关闭策略必须可判定（失败时应显示错误并保持可重试/关闭）

## Observability

- destructive 操作失败必须在 UI 显示 `error.code: error.message`
- main.log 必须记录删除行为（若尚未覆盖需补齐）

## Manual QA (Storybook WSL-IP)

- [ ] Storybook `Features/AiDialogs`：
  - [ ] SystemDialog 的各种类型/按钮交互正确
  - [ ] AiErrorCard 在不同错误类型下视觉正确（留证到 RUN_LOG）

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

