# Spec Delta: ipc (ISSUE-248)

本任务对应 OpenSpec change `ipc-p0-runtime-validation-and-error-envelope`，目标是将 IPC Request-Response 交互统一收敛到“运行时双向校验 + 稳定错误 envelope + 超时可清理”。

## Changes

- Add: 入站 request 运行时校验，校验失败返回 `VALIDATION_ERROR`，并阻断业务函数执行。
- Add: 出站 response 运行时校验，响应不符合契约时统一返回 `INTERNAL_ERROR`，并记录协议违规日志。
- Add: Request-Response envelope 协议校验，非 envelope 返回值统一拦截为 `INTERNAL_ERROR`。
- Add: 超时控制与清理钩子，超时统一返回 `IPC_TIMEOUT` 并执行 cleanup。
- Add: 未识别异常统一脱敏映射为 `INTERNAL_ERROR`，禁止 stack/内部路径透传。

## Acceptance

- `apps/desktop/tests/unit/ipc-runtime-validation.spec.ts` 覆盖并通过全部 Scenario 映射用例。
- 主进程 IPC 注册入口接入统一运行时中间层，且不要求业务 handler 重复实现校验逻辑。
- `pnpm typecheck`、`pnpm lint`、`pnpm test:unit`、`pnpm contract:check` 全部通过。
