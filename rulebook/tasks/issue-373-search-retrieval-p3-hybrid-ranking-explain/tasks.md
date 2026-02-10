## 1. Implementation

- [x] 1.1 准入：创建 OPEN issue #373，并建立 `task/373-search-retrieval-p3-hybrid-ranking-explain` worktree
- [x] 1.2 Rulebook task 创建并 `validate` 通过
- [x] 1.3 完成 Dependency Sync Check（SR-1/SR-2/SR-3 + IPC），记录 `NO_DRIFT`
- [x] 1.4 Red：新增 SR4-R1-S1 / SR4-R1-S2 失败测试并记录证据
- [x] 1.5 Green：实现混合检索重排、Top50 分页与 explain/strategy IPC 最小链路
- [x] 1.6 Refactor：抽离融合打分与 explain 构造逻辑，统一字段命名与排序路径

## 2. Testing

- [x] 2.1 运行 SR4 新增集成测试（Red→Green）
- [x] 2.2 运行 `pnpm typecheck`
- [x] 2.3 运行 `pnpm lint`
- [x] 2.4 运行 `pnpm contract:check`
- [x] 2.5 运行 `pnpm cross-module:check`
- [x] 2.6 运行 `pnpm test:unit`
- [x] 2.7 运行 `pnpm test:integration`
- [ ] 2.8 运行 `scripts/agent_pr_preflight.sh`

## 3. Documentation

- [x] 3.1 新增并维护 `openspec/_ops/task_runs/ISSUE-373.md`（准入、Dependency Sync、Red/Green、门禁）
- [x] 3.2 勾选并归档 `openspec/changes/search-retrieval-p3-hybrid-ranking-explain`，同步 `openspec/changes/EXECUTION_ORDER.md`
- [ ] 3.3 PR + auto-merge + 控制面 `main` 收口后归档本 Rulebook task
