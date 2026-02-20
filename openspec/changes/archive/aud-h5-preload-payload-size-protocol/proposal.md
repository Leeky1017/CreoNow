# 提案：aud-h5-preload-payload-size-protocol

## Why（问题与目标）

Preload 层是 IPC 的安全边界。如果缺少 payload 上限与短路协议，可能出现：

- 超大 payload 触发内存放大或卡顿（例如全量 `JSON.stringify` 计算大小）。
- 在 payload 已判定超限后仍继续读取危险字段（getter side effect / 异常），造成可利用面扩大。
- 通道未授权时未阻断或缺少审计日志，无法治理追溯。

本 change 的目标是在 preload IPC gateway 中建立确定性的“通道 allowlist + payload 上限 + 短路”协议，并用最小测试锁定错误码与审计事件。

## What（交付内容）

- 通道未暴露必须拒绝并返回 `IPC_CHANNEL_FORBIDDEN`，同时写入审计事件 `ipc_channel_forbidden`。
- 超大 payload 必须拒绝并返回 `IPC_PAYLOAD_TOO_LARGE`，同时写入审计事件 `ipc_payload_too_large`。
  - 并且在判定超限后必须短路，不得继续读取 payload 的后续字段（避免危险 getter）。
- AI stream subscription 必须有上限，超限返回 `IPC_SUBSCRIPTION_LIMIT_EXCEEDED` 并写入审计事件。
- 新增回归测试：`apps/desktop/tests/unit/ipc-preload-security.spec.ts`
  - 覆盖 Scenario `IPC-AUD-H5-S1..S3`（对应注释 S1/S3/S4）。

## Scope（影响范围）

- OpenSpec Delta:
  - `openspec/changes/aud-h5-preload-payload-size-protocol/specs/ipc/spec.md`
- Tests（evidence）:
  - `apps/desktop/tests/unit/ipc-preload-security.spec.ts`

## Out of Scope（不做什么）

- 不在本 change 内新增 IPC 通道或改变上层业务 payload schema（仅约束 gateway 安全协议）。
- 不在本 change 内实现 renderer 侧的 payload 分片/压缩策略（仅在 preload 层做硬性阻断）。

## Evidence（可追溯证据）

- Wave0 RUN_LOG：`openspec/_ops/task_runs/ISSUE-589.md`
- Wave0 PR：https://github.com/Leeky1017/CreoNow/pull/590

## 审阅状态

- Owner 审阅：
  - 结论：APPROVED
  - 备注：Lead 代 Owner 审批通过（2026-02-16）
