# Proposal: issue-260-ipc-p1-ipc-testability-harness

## Why

`ipc-p1-ipc-testability-harness` 目前只有零散 IPC 测试，缺少统一 helper 与场景映射门禁。
如果继续扩展 IPC 功能而没有可复用测试基建，回归成本和漏测风险会持续上升。

## What Changes

- 新增统一 IPC 测试 helper（main/preload/push）并提供稳定 API：
  - `createMockIPCHandler`
  - `createMockIPCEmitter`
  - `createMockIPCRenderer`
  - `assertIPCCall`
- 新增四个单测覆盖 change 场景（S1~S4）：
  - main handler 无 Electron runtime 依赖
  - preload channel/payload 精确断言
  - push 订阅/退订循环后无监听泄漏
  - 场景映射缺失触发门禁失败并输出缺失 Scenario ID
- 接入 Scenario→测试映射校验脚本，使缺失映射在本地与 CI 均可阻断。
- 记录 Red/Green 证据，完成 PR auto-merge 收口到控制面 `main`。

## Impact

- Affected specs:
  - `openspec/changes/ipc-p1-ipc-testability-harness/specs/ipc/spec.md`
  - `openspec/changes/ipc-p1-ipc-testability-harness/tasks.md`
- Affected code:
  - `apps/desktop/tests/helpers/ipc/*`
  - `apps/desktop/tests/helpers/index.ts`
  - `apps/desktop/tests/unit/ipc-testability.*.spec.ts`
  - `scripts/ipc-testability-mapping-gate.ts`
  - `package.json`
- Breaking change: NO
- User benefit: IPC 测试具备统一基建和可追踪场景映射，新增/变更通道时更容易发现回归与漏测。
