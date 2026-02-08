# ISSUE-300

- Issue: #300
- Issue URL: https://github.com/Leeky1017/CreoNow/issues/300
- Branch: `task/300-memory-system-p0-architecture-episodic-storage`
- PR: https://github.com/Leeky1017/CreoNow/pull/303
- Scope: 实施 `memory-system-p0-architecture-episodic-storage` 的全部任务（TDD + 实现 + 合并收口）
- Out of Scope: P1/P2/P3 的蒸馏、面板、冲突与降级全量能力

## Goal

- 完成 MS1-R1/R2/R3/X 全部场景的测试映射与实现。
- 落地工作记忆 8K 预算淘汰、会话归档、episode SQLite 持久化、record/query IPC 契约。
- 完成门禁通过并合并回控制面 `main`。

## Status

- CURRENT: 进行中（任务准入与规格落盘完成，准备进入 Red）。

## Plan

- 先写 10 个 Scenario 对应失败测试并记录 Red 证据。
- 做最小实现使全部测试转绿，再做小步重构。
- 完成 preflight/CI/auto-merge，收口 main 并归档 change。

## Runs

### 2026-02-08 20:59 +0800 issue bootstrap

- Command:
  - `gh issue create --title "Implement memory-system-p0-architecture-episodic-storage" --body-file /tmp/issue-memory-p0-architecture.md`
- Exit code: `0`
- Key output:
  - `https://github.com/Leeky1017/CreoNow/issues/300`

### 2026-02-08 21:00 +0800 control plane sync + worktree

- Command:
  - `git fetch origin main && git checkout main && git pull --ff-only origin main`
  - `git worktree add .worktrees/issue-300-memory-system-p0-architecture-episodic-storage -b task/300-memory-system-p0-architecture-episodic-storage origin/main`
- Exit code: `0`
- Key output:
  - `Already up to date.`
  - `Preparing worktree (new branch 'task/300-memory-system-p0-architecture-episodic-storage')`

### 2026-02-08 21:04 +0800 Rulebook task in worktree

- Command:
  - `rulebook task create issue-300-memory-system-p0-architecture-episodic-storage`
  - `rulebook task validate issue-300-memory-system-p0-architecture-episodic-storage`
- Exit code: `0`
- Key output:
  - `Task issue-300-memory-system-p0-architecture-episodic-storage created successfully`
  - `Task issue-300-memory-system-p0-architecture-episodic-storage is valid`

### 2026-02-08 21:06 +0800 Specification approval + dependency sync check

- Command:
  - `edit openspec/changes/memory-system-p0-architecture-episodic-storage/proposal.md`
  - `edit rulebook/tasks/issue-300-memory-system-p0-architecture-episodic-storage/{proposal.md,tasks.md,specs/memory-system/spec.md}`
- Exit code: `0`
- Key output:
  - Owner 审阅状态由 `PENDING` 更新为 `APPROVED`。
  - Dependency Sync Check 结论：`NO_DRIFT`（该 change 在 `EXECUTION_ORDER` 中为序号 1，无上游依赖）。

### 2026-02-08 21:08 +0800 TDD mapping + Red setup

- Command:
  - `create apps/desktop/tests/unit/memory/*.test.ts`
  - `create apps/desktop/tests/integration/memory/*.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/memory/working-memory-budget.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/memory/episode-recording.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/memory/capacity-overflow.test.ts`
- Exit code: `1`（Red）
- Key output:
  - `memoryStore does not provide export WORKING_MEMORY_TOKEN_BUDGET`
  - `Cannot find module ... episodicMemoryService`
  - Red 失败原因符合预期（功能未实现）。

### 2026-02-08 21:09 +0800 dependency install

- Command:
  - `pnpm install --frozen-lockfile`
- Exit code: `0`
- Key output:
  - `Packages: +962`
  - `Done in 1.9s`

### 2026-02-08 21:13 +0800 Green implementation

- Command:
  - `create apps/desktop/main/src/services/memory/episodicMemoryService.ts`
  - `create apps/desktop/main/src/db/migrations/0012_memory_episodic_storage.sql`
  - `edit apps/desktop/main/src/db/init.ts`
  - `edit apps/desktop/main/src/ipc/contract/ipc-contract.ts`
  - `edit apps/desktop/main/src/ipc/memory.ts`
  - `edit apps/desktop/renderer/src/stores/memoryStore.ts`
  - `edit package.json`
  - `pnpm contract:generate`
- Exit code: `0`
- Key output:
  - 完成 episode SQLite schema/索引、record/query IPC、隐式反馈纯函数、预算/淘汰/调度接口。
  - 生成更新 `packages/shared/types/ipc-generated.ts`。

### 2026-02-08 21:15 +0800 Green verification (scenario tests)

- Command:
  - `pnpm exec tsx apps/desktop/tests/unit/memory/memory-layer-assembly.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/memory/working-memory-budget.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/memory/session-archive.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/memory/episode-recording.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/memory/implicit-feedback.test.ts`
  - `pnpm exec tsx apps/desktop/tests/unit/memory/retrieval-fallback.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/memory/episode-query-mixed-recall.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/memory/storage-eviction.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/memory/episode-write-retry.test.ts`
  - `pnpm exec tsx apps/desktop/tests/integration/memory/capacity-overflow.test.ts`
- Exit code: `0`
- Key output:
  - 10 个 Scenario 映射测试全部通过。

### 2026-02-08 21:18 +0800 full regression gates

- Command:
  - `pnpm test:unit`
  - `pnpm test:integration`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:check`
- Exit code:
  - `0`（unit / integration / typecheck / lint）
  - `1`（contract:check，因生成文件变更未提交，预期）
- Key output:
  - `test:unit` 与 `test:integration` 全绿。
  - lint 仅既有 warning（无 error）。
  - contract 生成差异集中在 memory 新通道与新错误码。

### 2026-02-08 21:20 +0800 performance evidence (p95)

- Command:
  - `pnpm exec tsx - <<'EOF' ... benchmark episodic service ... EOF`
- Exit code: `0`
- Key output:
  - `memory:episode:record`（2000 samples）`p95 = 0.242ms`
  - `memory:episode:query`（1000 samples）`p95 = 5.298ms`

### 2026-02-08 21:22 +0800 change archive + execution order sync

- Command:
  - `mv openspec/changes/memory-system-p0-architecture-episodic-storage openspec/changes/archive/`
  - `edit openspec/changes/archive/memory-system-p0-architecture-episodic-storage/tasks.md`
  - `edit openspec/changes/EXECUTION_ORDER.md`
- Exit code: `0`
- Key output:
  - MS-1 change 已归档。
  - archived `tasks.md` 全项勾选完成。
  - `EXECUTION_ORDER.md` 更新为 8 个活跃 change 并标注对 archived MS-1 的依赖。

### 2026-02-08 21:27 +0800 final verification rerun

- Command:
  - `pnpm test:unit`
  - `pnpm test:integration`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm contract:generate`
- Exit code: `0`
- Key output:
  - unit/integration/typecheck 全通过。
  - lint 仅既有 warning（无 error）。
  - IPC generated types 已与最新契约一致。

### 2026-02-08 21:29 +0800 rulebook validate (post-archive)

- Command:
  - `rulebook task validate issue-300-memory-system-p0-architecture-episodic-storage`
- Exit code: `0`
- Key output:
  - `Task issue-300-memory-system-p0-architecture-episodic-storage is valid`
