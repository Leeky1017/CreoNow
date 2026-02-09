## 1. Implementation

- [x] 1.1 对齐流式协议字段：`executionId`、`traceId`、chunk `seq`、done `terminal`
- [x] 1.2 实现生命周期状态机：`idle -> generating -> completed|cancelled|error`（终态不可逆）
- [x] 1.3 实现取消优先竞态裁决（cancel 与 done 并发时最终态为 `cancelled`）
- [x] 1.4 实现网络中断后的完整 prompt 重放（非断点续传）路径

## 2. Testing

- [x] 2.1 Red：新增并执行 S1 失败测试 `apps/desktop/tests/integration/ai-stream-lifecycle.test.ts`
- [x] 2.2 Red：新增并执行 S2 失败测试 `apps/desktop/tests/integration/ai-stream-race-cancel-priority.test.ts`
- [x] 2.3 Green：S1/S2 转绿并补充回归测试（store/preload/backpressure 受影响用例）
- [ ] 2.4 通过 `pnpm test:unit`、`pnpm typecheck`、`pnpm lint`、`pnpm contract:check`、`pnpm cross-module:check`

## 3. Documentation

- [x] 3.1 维护 `openspec/_ops/task_runs/ISSUE-361.md`（含 Dependency Sync Check + Red/Green 证据）
- [x] 3.2 勾选并归档 `openspec/changes/ai-service-p1-streaming-cancel-lifecycle`
- [x] 3.3 更新 `openspec/changes/EXECUTION_ORDER.md`（活跃 change 与时间戳）
- [ ] 3.4 回填真实 PR 链接并完成 main 收口 + Rulebook task 自归档
