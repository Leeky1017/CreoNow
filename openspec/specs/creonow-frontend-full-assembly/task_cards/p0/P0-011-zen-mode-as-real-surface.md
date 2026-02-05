# P0-011: Zen Mode（作为真实 surface：F11 + 命令面板）

Status: todo

## Goal

把 Zen Mode 从“仅折叠面板”的半实现补齐为真实可见的 ZenMode overlay（`Features/ZenMode`）：

- F11 进入/退出（与 `design/DESIGN_DECISIONS.md` 对齐）
- CommandPalette 命令触发
- overlay 内容来自当前文档（最小：标题 + 段落文本 + 字数等）

## Assets in Scope（对应 Storybook Inventory）

- `Features/ZenMode`
-（组装点）`Layout/AppShell`

## Dependencies

- Spec: `../spec.md#cnfa-req-009`
- Design: `../design/02-navigation-and-surface-registry.md`
- Design: `../../../design/DESIGN_DECISIONS.md`（F11 语义）
- P0-002: `./P0-002-command-palette-commands-and-shortcuts.md`

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Update | `apps/desktop/renderer/src/components/layout/AppShell.tsx`（渲染 ZenMode overlay；进入/退出语义） |
| Update | `apps/desktop/renderer/src/stores/layoutStore.tsx`（zenMode 状态的单一来源与持久化策略） |
| Add | `apps/desktop/tests/e2e/zen-mode.spec.ts`（新增门禁） |

## Detailed Breakdown（建议拆分 PR）

1. PR-A：渲染 ZenMode overlay（不改快捷键/命令）
2. PR-B：入口统一（F11/ESC + CommandPalette）+ 状态恢复语义写死
3. PR-C：E2E 门禁（zen-mode.spec.ts）

## Conflict Notes（并行约束）

- `AppShell.tsx` 与 P0-002/P0-003/P0-007 等任务有冲突风险：建议在“入口基线”稳定后再接入 overlay，或拆成更小 PR（见 Design 09）。

## Acceptance Criteria

- [ ] 入口：
  - [ ] F11 进入 Zen Mode（出现 overlay）
  - [ ] 再按 F11 或按 ESC 退出（overlay 消失，回到原界面）
  - [ ] CommandPalette “Toggle Zen Mode” 可触发同样行为
- [ ] 内容：
  - [ ] overlay 显示当前文档标题（若无标题，显示合理默认值）
  - [ ] overlay 显示文档正文（最小：按段落分割的纯文本）
  - [ ] 状态栏显示字数/保存状态等（可先最小实现，但必须真实可解释）
- [ ] 行为一致：
  - [ ] 进入 Zen Mode 时 Sidebar/RightPanel 的状态策略写死（例如自动折叠并在退出时恢复）
  - [ ] 禁止出现“overlay 在但下面仍可点击导致状态错乱”

## Tests

- [ ] E2E `zen-mode.spec.ts`：
  - [ ] 进入 Zen Mode：断言 `data-testid="zen-mode"` 可见
  - [ ] ESC 退出：断言 overlay 不可见
  - [ ] F11 退出：同上

## Edge cases & Failure modes

- 无项目/无文档时进入 Zen Mode：
  - 必须显示空态或禁用入口（必须写死语义）
- 文档超长：
  - overlay 必须可滚动且不卡死

## Observability

- 进入/退出可选记录（renderer log），便于排查“卡在 Zen Mode”问题

## Manual QA (Storybook WSL-IP)

- [ ] Storybook `Features/ZenMode`：
  - [ ] hover 显示退出按钮/底部状态栏
  - [ ] ESC 退出行为正确（留证到 RUN_LOG；证据格式见 `../design/08-test-and-qa-matrix.md`）

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`
