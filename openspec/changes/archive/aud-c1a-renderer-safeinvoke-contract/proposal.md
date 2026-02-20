# 提案：aud-c1a-renderer-safeinvoke-contract

## Why（问题与目标）

Renderer 侧直接调用 `window.creonow.invoke` 会带来三个审计风险：

- 调用链不统一：同一语义的 IPC 调用存在多个入口，难以治理收敛。
- 错误形态不稳定：bridge 缺失、promise reject、返回值 shape 异常时可能抛错或产生非结构化错误。
- 证据不可回归：无法用最小测试证明“所有 renderer IPC 都返回统一 envelope”。

本 change 的目标是为 renderer 建立统一的 `safeInvoke` 契约，并将 `invoke` 固定为别名入口，确保成功/失败均返回确定性的 envelope。

## What（交付内容）

- 在 renderer 提供 `safeInvoke(channel, payload)`，并将 `invoke` 固定为 `safeInvoke` 的别名。
- 统一异常/错误收敛：
  - bridge 缺失时返回 `{ ok: false, error: { code: "INTERNAL", message: "IPC bridge not available" } }`
  - invoke reject 时返回 `{ ok: false, error: { code: "INTERNAL", message: "IPC invoke failed", details } }`
  - 返回值非 envelope shape 时返回 `{ ok: false, error: { code: "INTERNAL", message: "Invalid IPC response shape" } }`
- 新增回归测试：`apps/desktop/renderer/src/lib/ipcClient.test.ts`
  - 覆盖 Scenario `WB-AUD-C1A-S1..S4`。

## Scope（影响范围）

- OpenSpec Delta:
  - `openspec/changes/aud-c1a-renderer-safeinvoke-contract/specs/workbench/spec.md`
- Tests（evidence）:
  - `apps/desktop/renderer/src/lib/ipcClient.test.ts`

## Out of Scope（不做什么）

- 不在本 change 内新增 IPC 通道或改动业务 payload schema（仅约束调用与错误 envelope）。
- 不在本 change 内改动 main/preload 的 handler 逻辑（该 change 聚焦 renderer 入口契约）。

## Evidence（可追溯证据）

- Wave0 RUN_LOG：`openspec/_ops/task_runs/ISSUE-589.md`
- Wave0 PR：https://github.com/Leeky1017/CreoNow/pull/590

## 审阅状态

- Owner 审阅：
  - 结论：APPROVED
  - 备注：Lead 代 Owner 审批通过（2026-02-16）
