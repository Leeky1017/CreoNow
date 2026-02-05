# P2-001: React.memo（高频列表项组件）

Status: todo

## Goal

减少高频列表的无意义重渲染，在不改变交互语义的前提下提升滚动与点击响应。

审评指出：未发现 `React.memo` 使用，且 Outline/Version/FileTree 等列表可能很多。

## Dependencies

- Spec: `../spec.md#cnmvp-req-010`
- Design: `../design/08-performance-plan.md`

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Update | `apps/desktop/renderer/src/features/outline/OutlinePanel.tsx`（抽出 `OutlineItemRow` 并 memo） |
| Update | `apps/desktop/renderer/src/features/character/CharacterCard.tsx`（memo） |
| Update | `apps/desktop/renderer/src/features/version-history/VersionHistoryPanel.tsx`（抽出 `VersionCard` 并 memo） |
| Update | `apps/desktop/renderer/src/features/files/FileTreePanel.tsx`（抽出 row 组件并 memo） |
| Add/Update | `apps/desktop/renderer/src/features/**/**/*.test.tsx`（确保交互不回归） |

## Detailed Breakdown

1. 抽组件（若当前在同文件内定义）
   - 把 row 组件抽到独立文件，确保 props 明确且可 memo
2. `React.memo` + props 稳定化
   - callbacks 必须 `useCallback`
   - 避免每次 render 创建新数组/对象 props（必要时 `useMemo`）
3. 回归测试
   - 选中态、点击、右键菜单、键盘导航不改变

## Acceptance Criteria

- [ ] 目标列表项组件使用 `React.memo`
- [ ] 不改变任何 UI 行为（选中/hover/actions）
- [ ] 至少新增 1 个回归测试覆盖“选中 + action click”

## Tests

- [ ] `pnpm -C apps/desktop test:run`

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

