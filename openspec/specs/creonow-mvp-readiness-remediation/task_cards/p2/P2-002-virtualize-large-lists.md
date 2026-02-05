# P2-002: 列表虚拟化（Outline/VersionHistory/CommandPalette/SearchPanel）

Status: todo

## Goal

为潜在大列表引入虚拟化，保证 500+ 项时仍可滚动与交互。

## Decision（写死）

- 虚拟化库：`@tanstack/react-virtual`

## Dependencies

- Spec: `../spec.md#cnmvp-req-010`
- Design: `../design/08-performance-plan.md`

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Update | `apps/desktop/package.json`（新增依赖） |
| Update | `apps/desktop/renderer/src/features/outline/OutlinePanel.tsx` |
| Update | `apps/desktop/renderer/src/features/version-history/VersionHistoryPanel.tsx` |
| Update | `apps/desktop/renderer/src/features/commandPalette/CommandPalette.tsx` |
| Update | `apps/desktop/renderer/src/features/search/SearchPanel.tsx` |
| Add/Update | `apps/desktop/renderer/src/features/**/**/*.stories.tsx`（新增“大列表”场景便于 QA） |

## Detailed Breakdown

1. 引入依赖并通过 typecheck/lint
2. 逐个面板接入虚拟化（每个面板独立 PR，避免冲突）
3. 验收 smoke：
   - 500 项场景下滚动不卡顿（可用 story 驱动）

## Acceptance Criteria

- [ ] 4 个目标面板均完成虚拟化
- [ ] 大列表 smoke 通过（至少一处自动化断言或可重复手工步骤）

## Tests

- [ ] `pnpm -C apps/desktop test:run`

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

