# ISSUE-382

- Issue: #382
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/382
- Branch: task/382-search-retrieval-p4-hardening-boundary
- PR: 待回填
- Scope: 完成交付 `openspec/changes/search-retrieval-p4-hardening-boundary` 的全部任务（SR5 阈值/边界硬化、错误码矩阵、跨项目阻断审计），并合并回控制面 `main`
- Out of Scope: 新增检索算法、调整 Owner 固定权重/默认阈值、扩展非必要 UI 视觉主题

## Plan

- [x] 准入：创建 OPEN issue #382 + task 分支与 worktree
- [x] Rulebook task 创建并 validate
- [x] Dependency Sync Check（SR-1/SR-2/SR-3/SR-4 + ipc/context-engine）结论落盘
- [x] Red：SR5-R1-S1~S2、SR5-R2-S1~S5 失败测试证据落盘
- [x] Green：检索域硬化实现通过并保持契约一致
- [x] Refactor：统一错误映射与守卫逻辑并保持绿灯
- [ ] preflight 全绿
- [ ] PR + auto-merge + main 收口 + worktree 清理

## Runs

### 2026-02-10 13:00 +0800 准入（Issue）

- Command:
  - `gh issue create --title "Deliver search-retrieval-p4-hardening-boundary change and merge to main" --body "..."`
  - `gh issue view 382 --json number,state,title,url`
- Exit code: `0`
- Key output:
  - Issue 创建成功：`https://github.com/Leeky1017/CreoNow/issues/382`
  - Issue 状态：`OPEN`

### 2026-02-10 13:01 +0800 环境隔离（origin/main 基线 + worktree）

- Command:
  - `git fetch origin main`
  - `git rev-parse --short main`
  - `git rev-parse --short origin/main`
  - `git worktree add -b task/382-search-retrieval-p4-hardening-boundary .worktrees/issue-382-search-retrieval-p4-hardening-boundary origin/main`
- Exit code: `0`
- Key output:
  - `main` 与 `origin/main` 一致：`8a177c75`
  - worktree 创建成功：`.worktrees/issue-382-search-retrieval-p4-hardening-boundary`

### 2026-02-10 13:02 +0800 规则与依赖核对（Spec / EXECUTION_ORDER / Dependency Sync）

- Input:
  - `openspec/specs/search-and-retrieval/spec.md`
  - `openspec/specs/ipc/spec.md`
  - `openspec/specs/context-engine/spec.md`
  - `openspec/changes/search-retrieval-p4-hardening-boundary/**`
  - `openspec/changes/EXECUTION_ORDER.md`
- Checkpoints:
  - 数据结构：`SEARCH_TIMEOUT`/`fallback`、矩阵错误响应与 `retryable/retryAfterMs`
  - IPC 契约：`search:*`/`embedding:*`/`rag:*` 统一 envelope
  - 错误码：新增 SR5 错误码不与现有码冲突
  - 阈值：FTS/Hybrid/RAG p95 与并发/容量阈值与主 spec 一致
- Conclusion: `NO_DRIFT`

### 2026-02-10 13:02 +0800 Rulebook task 初始化

- Command:
  - `rulebook task create issue-382-search-retrieval-p4-hardening-boundary`（MCP）
  - 手动同步到 worktree：`cp -R .../rulebook/tasks/issue-382-search-retrieval-p4-hardening-boundary .../.worktrees/issue-382-search-retrieval-p4-hardening-boundary/rulebook/tasks/`
- Exit code: `0`
- Key output:
  - task 模板已创建并在当前 worktree 可见
  - 后续执行 `validate` 后再进入实现

### 2026-02-10 13:04 +0800 Rulebook validate

- Command:
  - `rulebook task validate issue-382-search-retrieval-p4-hardening-boundary`
- Exit code: `0`
- Key output:
  - `Task issue-382-search-retrieval-p4-hardening-boundary is valid`
  - warning: `No spec files found (specs/*/spec.md)`

### 2026-02-10 13:05 +0800 Red 前置阻塞与修复

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/search/search-timeout-visible-fallback.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/search-reindex-io-error.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/search-data-corruption-isolation.test.ts`
  - `pnpm install --frozen-lockfile`
- Exit code:
  - 前三条命令 `1`（`Command "tsx" not found`）
  - 安装命令 `0`
- Key output:
  - 失败原因：worktree 初始依赖未安装，无法执行 Red 测试
  - 处置：按约束执行 `pnpm install --frozen-lockfile`

### 2026-02-10 13:07 +0800 Red（SR5 场景失败证据）

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/search/search-timeout-visible-fallback.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/search-reindex-io-error.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/search-data-corruption-isolation.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/search-replace-autosave-conflict.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/search-capacity-backpressure.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/search-cross-project-forbidden.test.ts`
  - `pnpm exec tsx apps/desktop/tests/perf/search/search-retrieval-slo.benchmark.test.ts`
- Exit code: `1`
- Key output:
  - `search-timeout-visible-fallback`: `true !== false`（当前未返回 `SEARCH_TIMEOUT`）
  - `search-reindex-io-error`: `DB_ERROR` ≠ `SEARCH_REINDEX_IO_ERROR`
  - `search-data-corruption-isolation`: `2 !== 1`（未隔离损坏 chunk）
  - `search-replace-autosave-conflict`: `NOT_FOUND` ≠ `SEARCH_CONCURRENT_WRITE_CONFLICT`
  - `search-capacity-backpressure`: `true !== false`（未触发 `SEARCH_BACKPRESSURE`）
  - `search-cross-project-forbidden`: `true !== false`（未阻断跨项目）
  - `search-retrieval-slo`: `traceId` 字段缺失（`undefined`）

### 2026-02-10 13:10 +0800 Green（最小实现）

- Command:
  - `apply_patch apps/desktop/main/src/services/search/ftsService.ts`
  - `apply_patch apps/desktop/main/src/services/search/hybridRankingService.ts`
  - `apply_patch apps/desktop/main/src/ipc/search.ts`
  - `apply_patch apps/desktop/main/src/ipc/embedding.ts`
  - `apply_patch apps/desktop/main/src/ipc/rag.ts`
  - `apply_patch apps/desktop/main/src/services/search/searchReplaceService.ts`
  - `apply_patch apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `pnpm contract:generate`
- Exit code: `0`
- Key output:
  - 增加 SR5 错误码：`SEARCH_REINDEX_IO_ERROR`、`SEARCH_DATA_CORRUPTED`、`SEARCH_CONCURRENT_WRITE_CONFLICT`、`SEARCH_CAPACITY_EXCEEDED`、`SEARCH_BACKPRESSURE`、`SEARCH_PROJECT_FORBIDDEN`
  - `search:query:strategy` 新增可观测字段：`traceId`、`costMs`、`fallback`、`notice`
  - 语义超时统一映射 `SEARCH_TIMEOUT`，附带 `fallback` 与可见提示
  - reindex IO 失败映射 `SEARCH_REINDEX_IO_ERROR` 且 `retryable=true`
  - 语义损坏 chunk 隔离并返回 `isolation.code=SEARCH_DATA_CORRUPTED`
  - replace 写冲突映射 `SEARCH_CONCURRENT_WRITE_CONFLICT`
  - 超量候选触发 `SEARCH_BACKPRESSURE` 并返回 `retryAfterMs=200`
  - `search/embedding/rag` 增加跨项目阻断与审计日志

### 2026-02-10 13:18 +0800 Green 验证（SR5 新增测试全绿）

- Command:
  - `pnpm exec tsx apps/desktop/tests/integration/search/search-timeout-visible-fallback.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/search-reindex-io-error.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/search-data-corruption-isolation.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/search-replace-autosave-conflict.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/search-capacity-backpressure.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/search/search-cross-project-forbidden.test.ts`
  - `pnpm exec tsx apps/desktop/tests/perf/search/search-retrieval-slo.benchmark.test.ts`
- Exit code: `0`
- Key output:
  - 7 个 SR5 映射测试全部通过

### 2026-02-10 13:22 +0800 质量门禁验证链

- Command:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
  - `pnpm cross-module:check`
  - `pnpm test:unit`
  - `pnpm test:integration`
- Exit code:
  - `typecheck` => `0`
  - `lint` => `0`（仅历史 warning，无 error）
  - `contract:check` => `1`（预期：`ipc-generated.ts` 在当前分支有新增契约差异）
  - `cross-module:check` => `0`
  - `test:unit` => `0`
  - `test:integration` => `0`
- Key output:
  - Cross-module gate: `PASS`
  - Unit / Integration 全量通过

### 2026-02-10 13:24 +0800 Prettier 阻塞修复

- Command:
  - `pnpm exec prettier --check <changed-files>`
  - `pnpm exec prettier --write <changed-files>`
  - `pnpm exec prettier --check <changed-files>`
- Exit code:
  - 首次 `--check` => `1`
  - `--write` => `0`
  - 二次 `--check` => `0`
- Key output:
  - 9 个文件格式化完成，格式门禁阻塞已消除

### 2026-02-10 13:25 +0800 Change 收口（任务勾选 + 归档 + 顺序文档同步）

- Command:
  - `perl -0pi -e 's/- [ ]/- [x]/g' openspec/changes/search-retrieval-p4-hardening-boundary/tasks.md`
  - `git mv openspec/changes/search-retrieval-p4-hardening-boundary openspec/changes/archive/search-retrieval-p4-hardening-boundary`
  - `apply_patch openspec/changes/EXECUTION_ORDER.md`
  - `rulebook task validate issue-382-search-retrieval-p4-hardening-boundary`
- Exit code: `0`
- Key output:
  - change 已归档：`openspec/changes/archive/search-retrieval-p4-hardening-boundary`
  - `EXECUTION_ORDER.md` 已同步为 3 个活跃 change，更新时间 `2026-02-10 13:22`
  - Rulebook task 复验通过（warning: `No spec files found`）

### 2026-02-10 13:26 +0800 Preflight 状态

- Command:
  - `scripts/agent_pr_preflight.sh`
- Exit code: `1`
- Key output:
  - `PRE-FLIGHT FAILED: [RUN_LOG] PR field still placeholder ... ISSUE-382.md: 待回填`
  - 结论：等待创建 PR 后回填真实链接，再复跑 preflight
