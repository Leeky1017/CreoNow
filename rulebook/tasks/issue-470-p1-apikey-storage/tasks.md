## 1. Implementation

- [x] 1.1 准入：确认 OPEN issue #470、创建 `task/470-p1-apikey-storage` worktree 与 Rulebook task validate
- [x] 1.2 基于 `p1-apikey-storage` 场景补齐 `ai-config-ipc` 测试覆盖（S1-S7）
- [x] 1.3 如出现 Red 失败，进行最小实现修复并保持行为契约不扩散
- [x] 1.4 完成 change 文档收口：`tasks.md` 全章节证据 + change 归档 + EXECUTION_ORDER 同步

## 2. Testing

- [x] 2.1 目标测试：`pnpm exec tsx apps/desktop/main/src/ipc/__tests__/ai-config-ipc.test.ts`
- [x] 2.2 目标回归：`pnpm exec tsx apps/desktop/main/src/services/ai/__tests__/llm-proxy-config.test.ts`
- [x] 2.3 交付门禁：`scripts/agent_pr_preflight.sh`

## 3. Documentation

- [x] 3.1 更新 `openspec/_ops/task_runs/ISSUE-470.md` 记录 Red/Green/门禁与 PR 证据
- [ ] 3.2 提交 PR（Closes #470）+ auto-merge + main 收口 + Rulebook 归档
