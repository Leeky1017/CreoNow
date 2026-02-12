## 1. Implementation

- [x] 1.1 准入：创建 OPEN issue #421 与 `task/421-skill-system-p3-timeout-followup` worktree
- [x] 1.2 实现 aiService timeout 回退兼容（显式 env 覆盖 + 上限钳制）
- [x] 1.3 实现 AI 面板 `SKILL_TIMEOUT` timeout 类型映射
- [x] 1.4 更新 Windows E2E timeout 断言到 `SKILL_TIMEOUT`

## 2. Testing

- [x] 2.1 运行 `pnpm typecheck`
- [x] 2.2 运行 `pnpm lint`
- [x] 2.3 运行 `pnpm contract:check`
- [x] 2.4 运行 `pnpm cross-module:check`
- [x] 2.5 运行 `pnpm test:unit`
- [x] 2.6 运行目标回归：`apps/desktop/tests/integration/skill-session-queue-limit.test.ts` + `apps/desktop/tests/unit/ai-store-run-request-options.test.ts`

## 3. Documentation

- [x] 3.1 新增 `openspec/_ops/task_runs/ISSUE-421.md` 记录修复证据
- [ ] 3.2 preflight + PR + auto-merge + main 收口 + cleanup
