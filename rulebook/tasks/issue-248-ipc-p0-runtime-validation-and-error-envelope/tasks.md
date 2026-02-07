## 1. Implementation

- [x] 1.1 实现 IPC 运行时统一中间层（request/response 双向校验 + envelope 协议校验）
- [x] 1.2 建立统一错误映射与脱敏（`VALIDATION_ERROR`/`INTERNAL_ERROR`/`IPC_TIMEOUT`）
- [x] 1.3 增加超时控制与清理钩子执行路径，并接入 IPC 注册入口

## 2. Testing

- [x] 2.1 Red：先写失败测试（请求非法、响应非法、非 envelope、超时清理、未知异常映射）
- [x] 2.2 Green：实现后运行 `pnpm exec tsx apps/desktop/tests/unit/ipc-runtime-validation.spec.ts`
- [x] 2.3 回归：运行 `pnpm test:unit`、`pnpm contract:check`、`pnpm typecheck`、`pnpm lint`

## 3. Documentation

- [x] 3.1 更新 `openspec/changes/ipc-p0-runtime-validation-and-error-envelope/tasks.md`（Scenario→测试映射与勾选）
- [x] 3.2 更新 `openspec/_ops/task_runs/ISSUE-248.md`（Red/Green/Refactor 证据）
- [x] 3.3 更新 `openspec/changes/EXECUTION_ORDER.md` 更新时间，保持多活跃 change 同步
