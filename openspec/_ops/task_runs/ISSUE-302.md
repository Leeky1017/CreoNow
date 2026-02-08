# ISSUE-302

- Issue: #302
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/302
- Branch: `task/302-knowledge-graph-p0-entity-relation-query`
- PR: (待回填)
- Scope: 实现 `knowledge-graph-p0-entity-relation-query` 的实体/关系/查询契约与测试
- Out of Scope: `knowledge-graph-p1-visualization-extended-views`、`knowledge-graph-p2-auto-recognition-ai-utilization`

## Goal

- 严格执行 change `tasks.md` 全量任务，按 Red → Green → Refactor 实施。
- 提供 Rulebook + OpenSpec + GitHub required checks 的完整证据链。
- 最终合并回控制面 `main` 并完成收口。

## Status

- CURRENT: 进行中（Green 验证完成；preflight 因 RUN_LOG PR 占位符被阻断，待创建 PR 回填真实链接后放行）。

## Plan

- 补全 Rulebook task 与 RUN_LOG。
- 完成依赖同步检查（Dependency Sync Check）并落盘。
- 逐组实现 Scenario 映射测试：实体 → 关系 → 查询 → 异常/容量 → 基线性能。
- 创建 PR 并回填 RUN_LOG PR 真实链接后重跑 preflight。
- 开启 auto-merge，等待 `ci` / `openspec-log-guard` / `merge-serial` 全绿后合并。

## Runs

### 2026-02-08 20:58 +0800 创建实现入口 Issue

- Command:
  - `gh issue create --title "Implement knowledge-graph-p0-entity-relation-query change" --body "..."`
- Exit code: `0`
- Key output:
  - `https://github.com/Leeky1017/CreoNow/issues/302`

### 2026-02-08 21:00 +0800 Rulebook task 初始化（控制面）

- Command:
  - `rulebook_task_create(issue-302-knowledge-graph-p0-entity-relation-query)`
  - `rulebook_task_validate(issue-302-knowledge-graph-p0-entity-relation-query)`
- Exit code: `0`
- Key output:
  - task 创建成功；首次 validate `valid=true`（提示缺少 specs 文件）。

### 2026-02-08 21:01 +0800 创建隔离 worktree

- Command:
  - `git fetch origin main`
  - `git worktree add -b task/302-knowledge-graph-p0-entity-relation-query .worktrees/issue-302-knowledge-graph-p0-entity-relation-query origin/main`
- Exit code: `0`
- Key output:
  - `HEAD is now at c54a6510 docs: draft KG P0-P2 OpenSpec changes (#297) (#299)`

### 2026-02-08 21:07 +0800 Rulebook task 与 change 审批标注补全（worktree）

- Command:
  - `rulebook task create issue-302-knowledge-graph-p0-entity-relation-query`
  - `edit openspec/changes/knowledge-graph-p0-entity-relation-query/proposal.md`
  - `edit openspec/changes/knowledge-graph-p0-entity-relation-query/tasks.md`
  - `edit rulebook/tasks/issue-302-knowledge-graph-p0-entity-relation-query/*`
  - `create openspec/_ops/task_runs/ISSUE-302.md`
- Exit code: `0`
- Key output:
  - Owner 审阅状态更新为 `APPROVED`。
  - `tasks.md` 已加入依赖同步检查（Dependency Sync Check）证据项。

### 2026-02-08 21:08 +0800 Rulebook validate（worktree）

- Command:
  - `rulebook task validate issue-302-knowledge-graph-p0-entity-relation-query`
- Exit code: `0`
- Key output:
  - `Task issue-302-knowledge-graph-p0-entity-relation-query is valid`

### 2026-02-08 21:10 +0800 依赖同步检查（Dependency Sync Check）

- Command:
  - `sed -n '1,260p' openspec/changes/EXECUTION_ORDER.md`
  - `sed -n '1,340p' openspec/changes/knowledge-graph-p0-entity-relation-query/tasks.md`
- Exit code: `0`
- Key output:
  - `knowledge-graph-p0-entity-relation-query` 在执行顺序中无上游依赖项。
  - 结论：`Dependency Sync Check = N/A（无上游依赖，无漂移）`。

### 2026-02-08 21:11 +0800 Red-1（环境阻断）

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/kg/entity-create-role.test.ts`
- Exit code: `1`
- Key output:
  - `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "tsx" not found`
- Fix:
  - `pnpm install --frozen-lockfile`

### 2026-02-08 21:12 +0800 Red-2（失败测试证据）

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/kg/entity-create-role.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/kg/entity-duplicate-guard.test.ts`
  - `pnpm exec tsx apps/desktop/tests/perf/kg/kg-foundation.benchmark.test.ts`
- Exit code: `1`（预期）
- Key output:
  - `AssertionError: Missing IPC handler: knowledge:entity:create`
  - 证据覆盖 unit/integration/perf 三组，确认 `knowledge:*` 契约在旧实现下不可用。

### 2026-02-08 21:13-21:32 +0800 Green 实现（最小实现 + 契约迁移）

- Command:
  - `edit apps/desktop/main/src/services/kg/kgService.ts`
  - `edit apps/desktop/main/src/ipc/knowledgeGraph.ts`
  - `create apps/desktop/main/src/db/migrations/0012_knowledge_graph_p0.sql`
  - `edit apps/desktop/main/src/db/init.ts`
  - `edit apps/desktop/main/src/ipc/contract/{schema.ts,ipc-contract.ts}`
  - `edit scripts/contract-generate.ts`
  - `pnpm contract:generate`
  - `edit apps/desktop/renderer/src/stores/kgStore.ts`
  - `edit apps/desktop/tests/e2e/{knowledge-graph.spec.ts,system-dialog.spec.ts}`
  - `create apps/desktop/tests/helpers/kg/harness.ts`
  - `create apps/desktop/tests/{unit,integration,perf}/kg/*.test.ts`
  - `create apps/desktop/renderer/src/components/features/KnowledgeGraph/NodeDetailCard.stories.tsx`
  - `edit apps/desktop/renderer/src/surfaces/surfaceRegistry.ts`
- Exit code: `0`
- Key output:
  - IPC 通道切换为 `knowledge:entity/*`、`knowledge:relation/*`、`knowledge:query/*`。
  - KG 错误码扩展：`KG_ENTITY_DUPLICATE`、`KG_RELATION_INVALID`、`KG_ENTITY_CONFLICT`、`KG_CAPACITY_EXCEEDED`、`KG_QUERY_TIMEOUT`、`KG_SUBGRAPH_K_EXCEEDED`、`KG_ATTRIBUTE_KEYS_EXCEEDED`。
  - 新增 Scenario 对应 13 个测试文件与 1 个共享 harness。

### 2026-02-08 21:33-21:36 +0800 Green 验证

- Command:
  - `pnpm typecheck`
  - `pnpm test:unit`
  - `pnpm test:integration`
  - `pnpm exec tsx apps/desktop/tests/perf/kg/kg-foundation.benchmark.test.ts`
  - `pnpm lint`
  - `pnpm contract:generate`
- Exit code: `0`
- Key output:
  - `typecheck` 通过。
  - `test:unit` 通过（含 storybook inventory：`57/57`）。
  - `test:integration` 通过（含 KG 9 个集成场景）。
  - KG 基线性能测试通过（`kg-foundation.benchmark.test.ts`）。
  - `lint` 通过（仅现存 4 条历史 warning，无 error）。

### 2026-02-08 21:41 +0800 文档状态同步

- Command:
  - `edit openspec/changes/knowledge-graph-p0-entity-relation-query/tasks.md`
  - `edit rulebook/tasks/issue-302-knowledge-graph-p0-entity-relation-query/tasks.md`
  - `edit openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - change `tasks.md` 勾选项更新至当前实施进度（保留 PR/门禁证据项未勾选）。
  - Rulebook task 勾选项同步到当前进度。
  - `EXECUTION_ORDER.md` 更新时间更新为 `2026-02-08 21:41`（满足活跃 change 变更同步要求）。

### 2026-02-08 21:43 +0800 Rulebook validate 复核

- Command:
  - `rulebook task validate issue-302-knowledge-graph-p0-entity-relation-query`
- Exit code: `0`
- Key output:
  - `Task issue-302-knowledge-graph-p0-entity-relation-query is valid`

### 2026-02-08 21:43 +0800 Preflight 首次执行（预期阻断）

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - `PRE-FLIGHT FAILED: [RUN_LOG] PR field still placeholder ... (待回填)`
- Resolution:
  - 下一步通过 `scripts/agent_pr_automerge_and_sync.sh` 创建 PR 并自动回填 RUN_LOG PR 链接后重跑 preflight。
