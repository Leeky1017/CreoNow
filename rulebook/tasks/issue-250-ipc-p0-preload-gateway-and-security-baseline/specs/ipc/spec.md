# Spec Delta: ipc (ISSUE-250)

本任务对应 OpenSpec change `ipc-p0-preload-gateway-and-security-baseline`，目标是补齐 preload 网关与 push 通知链路的 P0 安全/容量基线。

## Changes

- Add: preload 网关白名单拒绝机制；未授权通道返回 `IPC_CHANNEL_FORBIDDEN` 并记录安全审计字段（`rendererId`、`channel`、`timestamp`）。
- Add: preload 请求 payload 大小校验；超过 10MB 返回 `IPC_PAYLOAD_TOO_LARGE` 且不进入业务 handler。
- Add: 单渲染进程订阅上限 500；第 501 次注册返回 `IPC_SUBSCRIPTION_LIMIT_EXCEEDED`，且既有订阅保持可用。
- Add: AI stream push 事件 5,000/s 背压门槛；超限时丢弃低优先级事件并保留关键控制事件。

## Acceptance

- 新增单测覆盖并通过：未授权通道、超大 payload、超订阅、背压丢弃策略。
- 运行 `pnpm typecheck`、`pnpm lint`、`pnpm contract:check`、`pnpm test:unit` 全部通过。
- RUN_LOG 完整记录 Red 失败证据、Green 实现证据、PR 合并证据。
