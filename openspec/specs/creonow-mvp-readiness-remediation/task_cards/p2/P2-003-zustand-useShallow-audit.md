# P2-003: Zustand `useShallow` 优化（选择器审计）

Status: todo

## Goal

减少因 selector 返回新对象/数组导致的无意义重渲染。

## Dependencies

- Spec: `../spec.md#cnmvp-req-010`
- Design: `../design/08-performance-plan.md`

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Update | `apps/desktop/renderer/src/**`（逐点替换 selector） |
| Add | `apps/desktop/renderer/src/lib/storeSelectors.md`（可选：记录约定与常见模式） |

## Detailed Breakdown

1. 清单化
   - `rg \"use[A-Za-z]*Store\\(\" apps/desktop/renderer/src`
   - 标记 selector 返回对象/数组的点位
2. 替换策略（写死）
   - selector 返回对象：使用 `useShallow((s) => ({ ... }))`
   - selector 返回数组：尽量改为选择 primitive + 派生 memo
3. 验收
   - 所有替换必须有回归测试保障不改变行为（至少覆盖一处高频面板）

## Acceptance Criteria

- [ ] 完成一次全量审计（清单落盘）
- [ ] 关键面板（Outline/Files/VersionHistory）选择器优化落地
- [ ] 无行为回归（测试通过）

## Tests

- [ ] `pnpm -C apps/desktop test:run`

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

