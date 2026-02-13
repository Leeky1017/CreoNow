## 1. Implementation

- [x] 1.1 审阅主 spec + delta spec + `p2-kg-aliases` proposal/tasks，并记录 Dependency Sync Check（N/A）
- [x] 1.2 先写 `kgService.aliases.test.ts`（S1-S5）并拿到 Red 失败证据
- [x] 1.3 实现 `kgService.ts` aliases 字段、校验过滤、JSON 存储读取与 SQL 映射
- [x] 1.4 新增 migration `0019_kg_aliases.sql` 并在 `db/init.ts` 注册

## 2. Verification

- [x] 2.1 执行目标测试：`pnpm tsx apps/desktop/main/src/services/kg/__tests__/kgService.aliases.test.ts`
- [x] 2.2 执行关键回归：`kgService.contextLevel`、`entityMatcher`、`integration/kg/entity-create-role`
- [x] 2.3 执行类型检查：`pnpm -C apps/desktop typecheck`
- [ ] 2.4 执行 `scripts/agent_pr_automerge_and_sync.sh` 并等待 required checks 通过

## 3. Documentation

- [x] 3.1 更新并归档 `openspec/changes/archive/p2-kg-aliases/tasks.md`（勾选 + Red/Green 证据）
- [x] 3.2 新增 `openspec/_ops/task_runs/ISSUE-497.md` 并记录关键命令输出
- [ ] 3.3 回填 RUN_LOG 的真实 PR 链接并完成 Rulebook task 归档
