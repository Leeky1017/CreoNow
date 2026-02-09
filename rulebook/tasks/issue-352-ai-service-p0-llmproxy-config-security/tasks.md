## 1. Implementation
- [x] 1.1 落地 `ai:config:get|update|test` IPC 通道并同步调用方
- [x] 1.2 落地 API Key `safeStorage` 加密存储与脱敏返回
- [x] 1.3 落地 LLM 请求重试（1s/2s/4s）与默认 60 req/min 限流
- [x] 1.4 更新错误码映射（`AI_NOT_CONFIGURED` / `AI_AUTH_FAILED` / `AI_RATE_LIMITED` / `LLM_API_ERROR`）

## 2. Testing
- [x] 2.1 先写并执行 S1/S2/S3 Red 失败测试
- [x] 2.2 Green 后重跑 S1/S2/S3 全绿
- [x] 2.3 执行 `pnpm test:unit`、`pnpm typecheck`、`pnpm lint`、`pnpm cross-module:check`
- [ ] 2.4 执行 `scripts/agent_pr_preflight.sh` 全绿

## 3. Documentation
- [x] 3.1 维护 `openspec/_ops/task_runs/ISSUE-352.md`（含 Red/Green 证据）
- [ ] 3.2 回填真实 PR 链接并确认 main 收口
- [ ] 3.3 归档 change 与 Rulebook task，记录收口证据
