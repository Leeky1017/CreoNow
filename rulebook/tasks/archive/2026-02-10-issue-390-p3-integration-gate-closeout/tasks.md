## 1. Specification

- [x] 1.1 复核 `openspec/project.md` 与 P3 三模块主规范（AI Service / Context Engine / Search & Retrieval）
- [x] 1.2 复核已归档 change：`context-engine-p3-constraints-rules-injection`、`search-retrieval-p3-hybrid-ranking-explain`、`ai-service-p3-judge-quality-pipeline`
- [x] 1.3 确认本任务范围：集成门禁与交付收口（不新增功能 spec）

## 2. TDD Mapping（先测前提）

- [x] 2.0 设定门禁：未出现 Red（失败测试）不得进入实现
- [x] 2.1 Scenario「P3 全链路可通过完整门禁」→ `pnpm typecheck/lint/contract:check/cross-module:check/test:unit/test:integration`
- [x] 2.2 Scenario「lint warning 清零且不引入回归」→ `pnpm lint` + `pnpm typecheck`

## 3. Red（先写失败测试）

- [x] 3.1 记录初始 lint warning 证据（3 条 hooks 依赖 warning）
- [x] 3.2 记录如门禁失败时的失败输出并在 RUN_LOG 留痕

## 4. Green（最小实现通过）

- [x] 4.1 以最小改动修复 3 条 lint warning
- [x] 4.2 执行并通过完整 P3 集成门禁命令链

## 5. Refactor（保持绿灯）

- [x] 5.1 复验 lint/typecheck 无回归
- [x] 5.2 复验 unit/integration 无回归

## 6. Evidence

- [x] 6.1 新增并维护 `openspec/_ops/task_runs/ISSUE-390.md`
- [x] 6.2 记录完整门禁命令、退出码、关键输出
- [ ] 6.3 记录 PR、required checks、main 收口与 worktree 清理证据
