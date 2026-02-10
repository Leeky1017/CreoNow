## 1. Implementation

- [x] 1.1 准入：创建 OPEN issue #382，并建立 `task/382-search-retrieval-p4-hardening-boundary` worktree
- [x] 1.2 Rulebook task validate 通过
- [x] 1.3 Dependency Sync Check（SR-1/SR-2/SR-3/SR-4 + ipc/context-engine）结论 `NO_DRIFT`
- [x] 1.4 Red：新增 SR5-R1-S1~S2、SR5-R2-S1~S5 失败测试并记录证据
- [x] 1.5 Green：实现超时可见降级、矩阵错误码、跨项目阻断最小链路
- [x] 1.6 Refactor：统一检索域错误映射与背压/并发守卫逻辑

## 2. Testing

- [x] 2.1 运行 SR5 新增测试（Red→Green）
- [x] 2.2 运行 `pnpm typecheck`
- [x] 2.3 运行 `pnpm lint`
- [x] 2.4 运行 `pnpm contract:check`
- [x] 2.5 运行 `pnpm cross-module:check`
- [x] 2.6 运行 `pnpm test:unit`
- [x] 2.7 运行 `pnpm test:integration`
- [ ] 2.8 运行 `scripts/agent_pr_preflight.sh`

## 3. Documentation

- [x] 3.1 新增并维护 `openspec/_ops/task_runs/ISSUE-382.md`
- [x] 3.2 勾选并归档 `openspec/changes/search-retrieval-p4-hardening-boundary`，同步 `openspec/changes/EXECUTION_ORDER.md`
- [ ] 3.3 PR + auto-merge + 控制面 `main` 收口后归档本 Rulebook task
