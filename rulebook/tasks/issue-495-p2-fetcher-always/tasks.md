## 1. Implementation

- [x] 1.1 审阅 `p2-fetcher-always` proposal/tasks/spec 与 C8 依赖接口，完成 Dependency Sync Check（NO_DRIFT）
- [x] 1.2 先写 `rulesFetcher.test.ts`（S1-S4）并获得 Red 失败证据
- [x] 1.3 实现 `rulesFetcher.ts`（`createRulesFetcher` + `formatEntityForContext`）
- [x] 1.4 在 `layerAssemblyService.ts` 接入 rules fetcher，并在 IPC 入口注入 `kgService`

## 2. Verification

- [x] 2.1 执行目标测试：`pnpm tsx apps/desktop/main/src/services/context/__tests__/rulesFetcher.test.ts`
- [x] 2.2 执行关键回归测试与类型检查（context contracts + ai-config-ipc + `pnpm -C apps/desktop typecheck`）
- [ ] 2.3 执行 `scripts/agent_pr_automerge_and_sync.sh` 并等待 required checks 通过

## 3. Documentation

- [x] 3.1 更新 `openspec/changes/p2-fetcher-always/tasks.md`（勾选 + Red/Green 证据）
- [x] 3.2 新增 `openspec/_ops/task_runs/ISSUE-495.md` 并记录命令输出
- [ ] 3.3 回填 RUN_LOG 的真实 PR 链接并完成 Rulebook task 归档
