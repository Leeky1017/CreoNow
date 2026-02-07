## 1. Implementation

- [x] 1.1 实现 preload 白名单网关与未授权通道拒绝（`IPC_CHANNEL_FORBIDDEN`）
- [x] 1.2 实现 payload 10MB 硬限制与超限拒绝（`IPC_PAYLOAD_TOO_LARGE`）
- [x] 1.3 实现订阅上限（500）与 AI push 背压（5,000/s，保留关键事件）

## 2. Testing

- [x] 2.1 Red：先写失败测试（未授权通道/超大 payload/超订阅）
- [x] 2.2 Green：实现后运行新增单测与背压行为测试
- [x] 2.3 回归：运行 `pnpm typecheck`、`pnpm lint`、`pnpm contract:check`、`pnpm test:unit`

## 3. Documentation

- [x] 3.1 更新 `openspec/changes/ipc-p0-preload-gateway-and-security-baseline/tasks.md` 勾选与映射
- [x] 3.2 更新 `openspec/_ops/task_runs/ISSUE-250.md`（Red/Green/Refactor 证据）
- [x] 3.3 同步 `openspec/changes/EXECUTION_ORDER.md` 更新时间（多活跃 change）
