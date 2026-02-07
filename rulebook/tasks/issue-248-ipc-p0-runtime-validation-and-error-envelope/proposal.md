# Proposal: issue-248-ipc-p0-runtime-validation-and-error-envelope

## Why

当前 IPC 仅依赖“编译期类型 + 业务层自律”，缺少统一的运行时请求/响应校验与错误封装。该缺口会导致非法输入穿透、非 envelope 响应泄漏、异常细节外泄以及超时不可清理，直接影响主进程稳定性与渲染进程可判定性。

## What Changes

- 新增主进程 IPC 统一运行时中间层，覆盖 request 入站校验、response 出站校验、envelope 协议校验。
- 新增稳定错误映射：`VALIDATION_ERROR`、`INTERNAL_ERROR`、`IPC_TIMEOUT`，并禁止透传内部异常细节。
- 增加超时控制与清理钩子执行路径，保证超时后状态可恢复。
- 补齐单元测试（Red→Green）与 OpenSpec/RunLog 证据链，最终通过 required checks 自动合并。

## Impact

- Affected specs:
  - `openspec/changes/ipc-p0-runtime-validation-and-error-envelope/specs/ipc/spec.md`
  - `openspec/changes/ipc-p0-runtime-validation-and-error-envelope/tasks.md`
- Affected code:
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apps/desktop/main/src/ipc/runtime-validation.ts`
  - `apps/desktop/main/src/index.ts`
  - `apps/desktop/tests/unit/ipc-runtime-validation.spec.ts`
  - `package.json`
  - `openspec/_ops/task_runs/ISSUE-248.md`
- Breaking change: NO
- User benefit: IPC 失败语义统一且可判定，异常不泄露内部实现，超时可清理，减少跨进程协议故障排查成本。
