# P0-005: CI 增加 desktop Vitest（renderer 组件/Store 门禁）

Status: todo

## Goal

在 CI 的 `check` job 中新增 `pnpm -C apps/desktop test:run`，确保 renderer 组件/Store 测试在合并前必须通过。

> 审评报告指出：CI 未运行组件测试（`apps/desktop` 的 Vitest），导致 Store/组件回归风险高。

## Dependencies

- Spec: `../spec.md#cnmvp-req-005`
- Design: `../design/05-test-strategy-and-ci.md`

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Update | `.github/workflows/ci.yml`（新增一步 Desktop component/store tests） |

## Detailed Breakdown

1. 更新 `.github/workflows/ci.yml` 的 `check` job：
   - 在 `Integration tests` 之后新增一步：
     - name: `Desktop component/store tests (Vitest)`
     - run: `pnpm -C apps/desktop test:run`
2. 确保失败会阻止合并（由 required checks 配置保证）

## Acceptance Criteria

- [ ] PR 上的 CI `check` job 会运行 `pnpm -C apps/desktop test:run`
- [ ] Vitest 失败会使 CI 失败

## Tests

- [ ] 通过一条现有 failing-case 演练（可在本地临时制造失败再恢复；RUN_LOG 留证即可）

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

