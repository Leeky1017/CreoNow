# ISSUE-354

- Issue: #354
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/354
- Branch: task/354-search-retrieval-p0-fts-foundation
- PR: https://github.com/Leeky1017/CreoNow/pull/357
- Scope: 交付 `openspec/changes/search-retrieval-p0-fts-foundation`，完成 FTS Query/Reindex IPC、SearchPanel 三态与跳转反馈、TDD 证据与治理收口
- Out of Scope: 语义搜索、RAG 召回注入、搜索替换、混合重排

## Plan

- [x] 准入：创建 OPEN issue + task branch + worktree
- [x] Rulebook task 创建并 validate 通过
- [x] Red：补齐 SR1-R1-S1~S4 测试并拿到失败证据
- [x] Green：实现 `search:fts:query` / `search:fts:reindex` 与最小 UI 行为
- [x] Refactor：契约生成、调用方同步、故事三态对齐
- [x] change 归档 + Rulebook task 自归档
- [ ] preflight 全绿
- [ ] PR + required checks + auto-merge + main 收口
- [ ] worktree 清理

## Runs

### 2026-02-09 22:27 +0800 准入与环境隔离

- Command:
  - `gh issue create --title "Deliver search-retrieval-p0-fts-foundation change and merge to main" ...`
  - `scripts/agent_worktree_setup.sh 354 search-retrieval-p0-fts-foundation`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`#354`
  - worktree 创建成功：`.worktrees/issue-354-search-retrieval-p0-fts-foundation`

### 2026-02-09 22:28 +0800 Rulebook admission

- Command:
  - `rulebook task create issue-354-search-retrieval-p0-fts-foundation`
  - `rulebook task validate issue-354-search-retrieval-p0-fts-foundation`
- Exit code: `0`
- Key output:
  - task 创建并 validate 通过（warning: no spec files）

### 2026-02-09 22:33 +0800 依赖安装（worktree）

- Command:
  - `pnpm install --frozen-lockfile`
- Exit code: `0`
- Key output:
  - `Packages: +978`
  - `tsx` / `vitest` 可在 worktree 内执行

### 2026-02-09 22:34 +0800 Red（SR1-R1-S1 / SR1-R1-S4）

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/search/fts-query-panel.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/fts-reindex-recovery.test.ts`
- Exit code: `1`
- Key output:
  - `AssertionError [ERR_ASSERTION]: Missing handler search:fts:query`

### 2026-02-09 22:34 +0800 Red（SR1-R1-S2）

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/search/fts-result-jump.test.ts`
- Exit code: `1`
- Key output:
  - `SyntaxError: ... SearchPanel does not provide an export named 'navigateSearchResult'`

### 2026-02-09 22:34 +0800 Red（SR1-R1-S3）

- Command:
  - `pnpm -C apps/desktop test:run -- src/features/search/__tests__/search-panel-empty.test.tsx`
- Exit code: `1`
- Key output:
  - `FAIL ... search-panel-empty.test.tsx`
  - `Unable to find an element with the text: 未找到匹配结果`

### 2026-02-09 22:42 +0800 Green（实现 + IPC 契约生成）

- Command:
  - `apply_patch apps/desktop/main/src/services/search/ftsService.ts`
  - `apply_patch apps/desktop/main/src/ipc/search.ts`
  - `apply_patch apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `apply_patch apps/desktop/renderer/src/stores/searchStore.ts`
  - `apply_patch apps/desktop/renderer/src/features/search/SearchPanel.tsx`
  - `apply_patch apps/desktop/renderer/src/features/search/SearchPanel.stories.tsx`
  - `pnpm contract:generate`
- Exit code: `0`
- Key output:
  - `search:fulltext:query` 收敛为 `search:fts:query`
  - 新增 `search:fts:reindex`
  - FTS 响应结构完成 `results/total/hasMore/indexState` 与 `highlights/anchor`
  - `packages/shared/types/ipc-generated.ts` 已按新契约生成

### 2026-02-09 22:45 +0800 Green 回归（场景测试）

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/fts-invalid-query.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/fts-query-panel.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/fts-result-jump.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/fts-reindex-recovery.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/rag-retrieve-rerank.test.ts`
  - `pnpm -C apps/desktop exec vitest run src/features/search/SearchPanel.test.tsx src/features/search/__tests__/search-panel-empty.test.tsx`
- Exit code: `0`
- Key output:
  - `SR1-R1-S1~S4` 对应测试均通过
  - SearchPanel 相关用例 `13 passed`
  - RAG 集成回归通过（兼容新 FTS 结果结构）

### 2026-02-09 22:45 +0800 Integration 全量

- Command:
  - `pnpm test:integration`
- Exit code: `0`
- Key output:
  - Integration 链路全部通过（含新增 `apps/desktop/tests/integration/search/*`）

### 2026-02-09 22:47 +0800 变更归档与执行顺序同步

- Command:
  - `mv openspec/changes/search-retrieval-p0-fts-foundation openspec/changes/archive/`
  - `apply_patch openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - `search-retrieval-p0-fts-foundation` 已从 active 迁移到 archive
  - `EXECUTION_ORDER.md` 更新时间更新为 `2026-02-09 22:47`
  - 活跃 change 数量 `16 -> 15`

### 2026-02-09 22:48 +0800 门禁前验证

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
- Exit code: `0`
- Key output:
  - `tsc --noEmit` 通过
  - `eslint` 仅既有 warning，无 error
  - `[CROSS_MODULE_GATE] PASS`
  - `pnpm test:unit` 全部通过

### 2026-02-09 22:50 +0800 Rulebook 自归档

- Command:
  - `rulebook task archive issue-354-search-retrieval-p0-fts-foundation`
- Exit code: `0`
- Key output:
  - active 中不再存在 `issue-354-search-retrieval-p0-fts-foundation`
  - archive 新增 `rulebook/tasks/archive/2026-02-09-issue-354-search-retrieval-p0-fts-foundation`

### 2026-02-09 23:28 +0800 preflight 阻断确认

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - `PRE-FLIGHT FAILED: [RUN_LOG] PR field still placeholder ... ISSUE-354.md: (待回填)`
