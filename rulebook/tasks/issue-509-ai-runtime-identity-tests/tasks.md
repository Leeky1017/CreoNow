## 1. Implementation

- [x] 1.1 将 `assembleSystemPrompt` 接入 `aiService.runSkill` 的 provider 请求组装路径
- [x] 1.2 保持现有错误码与流式终态契约不变（除规格明确修改项外）

## 2. Testing

- [x] 2.1 先添加并执行 Red 测试：运行时 system prompt 必含 identity 层
- [x] 2.2 补充回归测试：stream timeout done 事件 + 全层 fetcher 降级
- [x] 2.3 运行 `pnpm test:unit`、`pnpm test:integration`、`pnpm cross-module:check`

## 3. Documentation

- [x] 3.1 更新 `docs/plans/p1p2-integration-check.md` 的剩余风险状态
- [x] 3.2 更新 `openspec/_ops/task_runs/ISSUE-509.md`，记录 Red/Green 证据
