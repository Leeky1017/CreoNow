# P2-004: console 清理 + 日志收敛（生产代码）

Status: todo

## Goal

清理生产代码中散落的 `console.log/warn/error`，统一通过 logger 路径输出，为后续 IPC 上报/落盘打基础。

> 审评报告指出：60+ 处 console 调用，影响可观测性与一致性。

## Decision（写死）

分两步（避免高冲突 IPC contract）：

1. P2：先把调用点收敛到 `renderer/src/lib/logger.ts`（默认实现仍可写 console，但仅此一处）
2. P3+：再引入 `app:log` IPC 把 renderer logs 写入 main.log（不在本卡范围）

## Dependencies

- Spec: `../spec.md#cnmvp-req-011`
- Design: `../design/10-code-quality-console-and-strings.md`

## Expected File Changes

| 操作 | 文件路径 |
| --- | --- |
| Add | `apps/desktop/renderer/src/lib/logger.ts` |
| Update | `apps/desktop/renderer/src/**`（替换 console.*） |
| Add | `apps/desktop/tests/unit/no-console-in-production.spec.ts`（静态门禁） |

## Detailed Breakdown

1. 新增 `renderer logger`
2. 扫描并替换（写死命令）：
   - `rg -n \"console\\.(log|warn|error)\" apps/desktop/renderer/src --glob '!*stories*' --glob '!*test*'`
3. 静态门禁：
   - unit script 断言 production 代码（排除 stories/tests）不存在 `console.*`

## Acceptance Criteria

- [ ] production 代码不再直接调用 `console.*`
- [ ] 所有日志通过 `lib/logger.ts` 统一出口
- [ ] 静态门禁防止回归

## Tests

- [ ] `pnpm test:unit`

## Completion

- Issue: TBD
- PR: TBD
- RUN_LOG: `openspec/_ops/task_runs/ISSUE-<N>.md`

