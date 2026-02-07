# Proposal: issue-250-ipc-p0-preload-gateway-and-security-baseline

## Why

当前 IPC 契约与运行时校验已具备基础能力，但 preload 网关仍缺少安全硬边界：未授权通道可探测、超大 payload 可能压垮边界、事件订阅缺少容量上限、push 事件风暴缺少背压。该任务用于补齐 P0 最小安全基线，避免跨进程通道在异常流量下失稳。

## What Changes

- 在 preload `invoke` 网关增加白名单拒绝与安全审计日志，未授权通道统一返回 `IPC_CHANNEL_FORBIDDEN`。
- 在 preload 增加请求 payload 硬上限（10MB），超限直接拒绝并返回 `IPC_PAYLOAD_TOO_LARGE`。
- 增加 AI stream 订阅注册表与单渲染进程上限（500），超限返回 `IPC_SUBSCRIPTION_LIMIT_EXCEEDED`。
- 在主进程 AI push 发送端增加 5,000/s 背压门槛，超限丢弃低优先级 `delta` 事件并保留关键控制事件。
- 补充对应单元测试（Red→Green）与 RUN_LOG 证据，满足 OpenSpec + Rulebook 门禁。

## Impact

- Affected specs:
  - `openspec/changes/ipc-p0-preload-gateway-and-security-baseline/specs/ipc/spec.md`
  - `openspec/changes/ipc-p0-preload-gateway-and-security-baseline/tasks.md`
- Affected code:
  - `apps/desktop/preload/src/ipc.ts`
  - `apps/desktop/preload/src/aiStreamBridge.ts`
  - `apps/desktop/preload/src/index.ts`
  - `apps/desktop/main/src/ipc/ai.ts`
  - `apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `packages/shared/types/ipc-generated.ts`
  - `apps/desktop/tests/unit/*preload* / *backpressure*`
  - `openspec/_ops/task_runs/ISSUE-250.md`
- Breaking change: NO
- User benefit: IPC 边界在安全性与容量上具备可验证的硬限制，异常行为具备稳定错误码与可审计证据。
