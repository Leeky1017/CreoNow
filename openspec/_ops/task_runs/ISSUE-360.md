# ISSUE-360

- Issue: #360
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/360
- Branch: task/360-search-retrieval-p1-embedding-semantic-rag
- PR: https://github.com/Leeky1017/CreoNow/pull/364
- Scope: 交付 `openspec/changes/search-retrieval-p1-embedding-semantic-rag`，完成 SR2 的 embedding 语义检索 + RAG 检索增强 6 个场景并收口 main
- Out of Scope: `search-retrieval-p2-replace-versioned`、`search-retrieval-p3-hybrid-ranking-explain`、`search-retrieval-p4-hardening-boundary`

## Plan

- [x] 准入：创建 OPEN issue + task branch + worktree
- [x] Rulebook task 创建并 validate 通过
- [x] Red：补齐 SR2-R1-S1~S3、SR2-R2-S1~S3 失败测试并记录证据
- [x] Green：最小实现通过并完成契约同步
- [x] Refactor：DTO/schema 复用与日志字段统一
- [x] change 归档 + Rulebook task 自归档
- [ ] preflight 全绿
- [ ] PR + required checks + auto-merge + main 收口
- [ ] worktree 清理

## Runs

### 2026-02-10 00:00 +0800 准入与环境隔离

- Command:
  - `gh issue create --title "Deliver search-retrieval-p1-embedding-semantic-rag change and merge to main" ...`
  - `scripts/agent_worktree_setup.sh 360 search-retrieval-p1-embedding-semantic-rag`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`#360`
  - worktree 创建成功：`.worktrees/issue-360-search-retrieval-p1-embedding-semantic-rag`

### 2026-02-10 00:00 +0800 Rulebook admission

- Command:
  - `rulebook task create issue-360-search-retrieval-p1-embedding-semantic-rag`
  - `rulebook task validate issue-360-search-retrieval-p1-embedding-semantic-rag`
- Exit code: `0`
- Key output:
  - task 创建并 validate 通过（warning: no spec files）

### 2026-02-10 00:04 +0800 依赖安装（worktree）

- Command:
  - `pnpm install --frozen-lockfile`
- Exit code: `0`
- Key output:
  - `Packages: +978`
  - `tsx` / `vitest` 在 worktree 可用

### 2026-02-10 00:05 +0800 Red（SR2-R1-S1 / SR2-R1-S2）

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/search/semantic-search-topk.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/semantic-fallback-fts.test.ts`
- Exit code: `1`
- Key output:
  - `AssertionError [ERR_ASSERTION]: Missing handler embedding:semantic:search`

### 2026-02-10 00:05 +0800 Red（SR2-R1-S3）

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/search/embedding-incremental-update.test.ts`
- Exit code: `1`
- Key output:
  - `ERR_MODULE_NOT_FOUND: .../services/embedding/semanticChunkIndexService`

### 2026-02-10 00:06 +0800 Red（SR2-R2-S1 / SR2-R2-S2 / SR2-R2-S3）

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/rag/rag-retrieve-inject-context.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/rag/rag-empty-retrieve.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/rag/rag-budget-truncation.test.ts`
- Exit code: `1`
- Key output:
  - `AssertionError [ERR_ASSERTION]: Missing handler rag:context:retrieve`

### 2026-02-10 00:12 +0800 Green（SR2 实现 + IPC 契约收敛）

- Command:
  - `apply_patch/cat > apps/desktop/main/src/services/embedding/semanticChunkIndexService.ts`
  - `cat > apps/desktop/main/src/ipc/embedding.ts`
  - `cat > apps/desktop/main/src/ipc/rag.ts`
  - `apply_patch apps/desktop/main/src/ipc/file.ts`
  - `apply_patch apps/desktop/main/src/index.ts`
  - `apply_patch apps/desktop/main/src/ipc/search.ts`
  - `apply_patch apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `pnpm contract:generate`
- Exit code: `0`
- Key output:
  - 新增段落级 semantic chunk index（含增量 upsert / 搜索 / 重建）
  - 落地 `embedding:text:generate` / `embedding:semantic:search` / `embedding:index:reindex`
  - 落地 `rag:context:retrieve` / `rag:config:get` / `rag:config:update`
  - 语义不可用时自动回退 FTS，并返回可见提示字段
  - RAG 支持空召回继续、预算截断 `truncated` 标记

### 2026-02-10 00:18 +0800 Green 场景回归（SR2 6 场景）

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/search/semantic-search-topk.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/semantic-fallback-fts.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/embedding-incremental-update.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/rag/rag-retrieve-inject-context.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/rag/rag-empty-retrieve.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/rag/rag-budget-truncation.test.ts`
- Exit code: `0`
- Key output:
  - SR2-R1-S1~S3、SR2-R2-S1~S3 全部通过

### 2026-02-10 00:20 +0800 类型与质量门禁回归

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test:unit`
  - `pnpm test:integration`
  - `pnpm cross-module:check`
- Exit code: `0`
- Key output:
  - `tsc --noEmit` 通过
  - `eslint` 无 error（仅既有 warning）
  - `test:unit` 全通过
  - `test:integration` 全通过（含新增 SR2 场景）
  - `[CROSS_MODULE_GATE] PASS`

### 2026-02-10 00:27 +0800 契约一致性复验

- Command:
  - `pnpm contract:generate`
  - `pnpm contract:check`
- Exit code: `1`
- Key output:
  - `contract:generate` 成功
  - `contract:check` 在未提交阶段提示 `packages/shared/types/ipc-generated.ts` 与索引存在差异（预期于提交阶段收敛）

### 2026-02-10 00:30 +0800 Rulebook task 自归档

- Command:
  - `rulebook task validate issue-360-search-retrieval-p1-embedding-semantic-rag`
  - `rulebook task archive issue-360-search-retrieval-p1-embedding-semantic-rag`
- Exit code: `0`
- Key output:
  - task validate 通过
  - task 已归档至 `rulebook/tasks/archive/2026-02-09-issue-360-search-retrieval-p1-embedding-semantic-rag/`

### 2026-02-10 00:31 +0800 preflight（阻断项确认）

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - `PRE-FLIGHT FAILED: [RUN_LOG] PR field still placeholder ... (待回填)`
  - 阻断项符合预期，将在 PR 创建后由 `agent_pr_automerge_and_sync.sh` 自动回填并复检

### 2026-02-10 00:32 +0800 提交前最终回归

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test:unit`
  - `pnpm test:integration`
  - `pnpm cross-module:check`
- Exit code: `0`
- Key output:
  - typecheck/lint 通过（仅既有 3 条 warning，无 error）
  - unit 通过
  - integration 通过（含新增 SR2 场景）
  - `[CROSS_MODULE_GATE] PASS`

### 2026-02-10 00:33 +0800 提交前契约门禁与 preflight 复核

- Command:
  - `git add -A`
  - `pnpm contract:check`
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - `contract:check` 通过（`contract:generate` 后无增量漂移）
  - preflight 仅因 `PR: (待回填)` 阻断，等待 PR 创建后自动回填并复检
